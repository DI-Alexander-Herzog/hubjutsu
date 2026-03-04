<?php

namespace AHerzog\Hubjutsu\App\Http\Controllers;

use App\Http\Controllers\Controller as BaseController;
use App\Models\Credential;
use AHerzog\Hubjutsu\App\Services\Integrations\CredentialService;
use AHerzog\Hubjutsu\App\Services\Integrations\IntegrationServiceRegistry;
use Gate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class IntegrationCredentialController extends BaseController
{
    public function services(Request $request)
    {
        $validated = $request->validate([
            'credentialable_type' => ['required', 'string', 'max:255'],
            'credentialable_id' => ['required', 'integer', 'min:1'],
        ]);

        $credentialable = $this->resolveCredentialable($validated['credentialable_type'], intval($validated['credentialable_id']));
        abort_unless(Gate::allows('view', $credentialable), 403);

        $credentials = Credential::query()
            ->where('credentialable_type', $credentialable->getMorphClass())
            ->where('credentialable_id', $credentialable->getKey())
            ->orderBy('provider')
            ->orderBy('name')
            ->get();

        $credentialsByProvider = $credentials->groupBy(fn (Credential $credential) => $credential->provider ?: '_');
        $registry = app(IntegrationServiceRegistry::class);
        $allowedProviders = $this->allowedProvidersForCredentialable($credentialable);

        $services = collect($registry->all())
            ->filter(function (CredentialService $service) use ($allowedProviders) {
                if ($allowedProviders === null) {
                    return true;
                }
                return in_array($service->provider(), $allowedProviders, true);
            })
            ->map(function (CredentialService $service) use ($credentialsByProvider) {
                $provider = $service->provider();
                $providerCredentials = $credentialsByProvider->get($provider, collect());
                $providerHasConnectedCredential = $providerCredentials->contains(function (Credential $credential) {
                    $hasAccessToken = is_string(data_get($credential->secret_data, 'access_token'))
                        && trim((string) data_get($credential->secret_data, 'access_token')) !== '';
                    $hasSystemToken = is_string(data_get($credential->secret_data, 'system_user_token'))
                        && trim((string) data_get($credential->secret_data, 'system_user_token')) !== '';
                    return $credential->status === Credential::STATUS_ACTIVE && ($hasAccessToken || $hasSystemToken);
                });

                return array_merge(
                    $this->serviceDefinition($service),
                    [
                        'configured' => $providerHasConnectedCredential,
                        'credentials' => $providerCredentials->map(fn (Credential $credential) => [
                            'id' => $credential->id,
                            'name' => $credential->name,
                            'provider' => $credential->provider,
                            'type' => $credential->type,
                            'status' => $credential->status,
                            'public_data' => is_array($credential->public_data) ? $credential->public_data : [],
                            'valid_until' => $credential->valid_until?->toIso8601String(),
                            'refresh_valid_until' => data_get($credential->secret_data, 'refresh_token_expires_at'),
                            'public_data_summary' => $credential->public_data_summary,
                            'token_preview' => data_get($credential->secret_data_preview, 'access_token')
                                ?? data_get($credential->secret_data_preview, 'system_user_token'),
                            'refresh_token_preview' => data_get($credential->secret_data_preview, 'refresh_token'),
                            'has_access_token' => is_string(data_get($credential->secret_data, 'access_token'))
                                && trim((string) data_get($credential->secret_data, 'access_token')) !== '',
                            'has_client_secret' => is_string(data_get($credential->secret_data, 'client_secret'))
                                && trim((string) data_get($credential->secret_data, 'client_secret')) !== '',
                            'has_system_user_token' => is_string(data_get($credential->secret_data, 'system_user_token'))
                                && trim((string) data_get($credential->secret_data, 'system_user_token')) !== '',
                            'has_refresh_token' => is_string(data_get($credential->secret_data, 'refresh_token'))
                                && trim((string) data_get($credential->secret_data, 'refresh_token')) !== '',
                        ])->values(),
                    ]
                );
            })
            ->values();

        return response()->json([
            'scope' => [
                'type' => $credentialable->getMorphClass(),
                'id' => $credentialable->getKey(),
                'label' => $this->resolveLabel($credentialable),
                'type_label' => class_basename($credentialable),
            ],
            'services' => $services,
            'credentials' => $credentials->map(fn (Credential $credential) => [
                'id' => $credential->id,
                'name' => $credential->name,
                'provider' => $credential->provider,
                'type' => $credential->type,
                'status' => $credential->status,
                'valid_until' => $credential->valid_until?->toIso8601String(),
                'public_data_summary' => $credential->public_data_summary,
            ])->values(),
        ]);
    }

    public function connect(Request $request, string $provider): RedirectResponse|JsonResponse
    {
        $provider = strtolower(trim($provider));
        $service = $this->resolveProviderService($provider);

        $validated = $request->validate(array_merge([
            'credentialable_type' => ['required', 'string', 'max:255'],
            'credentialable_id' => ['required', 'integer', 'min:1'],
            'return_url' => ['nullable', 'string', 'max:2048'],
            'name' => ['nullable', 'string', 'max:255'],
        ], $service->connectValidationRules()));
        $credentialable = $this->resolveCredentialable($validated['credentialable_type'], intval($validated['credentialable_id']));
        abort_unless(Gate::allows('update', $credentialable), 403);
        $this->ensureProviderAllowedForCredentialable($credentialable, $provider);

        $credential = Credential::query()->firstOrNew([
            'type' => $service->type(),
            'provider' => $service->provider(),
            'credentialable_type' => $credentialable->getMorphClass(),
            'credentialable_id' => $credentialable->getKey(),
        ]);
        $service->ensureCredentialDefaults($credential, $credentialable, $validated['name'] ?? null);
        $service->applyConnectInput($credential, $validated);

        // Wichtig: Eingaben (z. B. App-ID/App-Geheimcode) immer zuerst persistieren,
        // damit sie bei nachgelagerten Fehlern nicht erneut eingegeben werden müssen.
        $credential->save();

        if ($service->canConnectWithoutOAuth($credential)) {
            $service->connectWithoutOAuth($credential);
            $credential->save();

            if ($request->expectsJson()) {
                return response()->json([
                    'direct_connected' => true,
                    'summary' => [
                        'provider' => $service->provider(),
                        'label' => $service->label(),
                        'credential_id' => $credential->getKey(),
                        'credential_name' => $credential->name,
                        'redirect_uri' => $service->redirectUri(),
                        'authorize_url' => $service->authorizationEndpoint(),
                        'scope' => data_get($credential->public_data, 'scope'),
                    ],
                ]);
            }

            return redirect()->to($this->appendQuery($this->sanitizeReturnUrl($validated['return_url'] ?? null), [
                'integration' => $provider,
                'status' => 'connected',
                'credential_id' => $credential->getKey(),
            ]));
        }

        try {
            $service->assertReadyForConnect($credential);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages([
                'integration' => $e->getMessage(),
            ]);
        }

        $returnUrl = $this->sanitizeReturnUrl($validated['return_url'] ?? null);
        $stateKey = Str::random(40);
        $request->session()->put('integration_oauth.' . $stateKey, [
            'return_url' => $returnUrl,
            'provider' => $provider,
            'credential_id' => $credential->getKey(),
            'credentialable_type' => $credentialable->getMorphClass(),
            'credentialable_id' => $credentialable->getKey(),
            'expires_at' => now()->addMinutes(20)->timestamp,
        ]);

        $state = Crypt::encryptString(json_encode([
            'provider' => $provider,
            'credential_id' => $credential->getKey(),
            'credentialable_type' => $credentialable->getMorphClass(),
            'credentialable_id' => $credentialable->getKey(),
            'state_key' => $stateKey,
            'issued_at' => now()->timestamp,
            'expires_at' => now()->addMinutes(15)->timestamp,
        ], JSON_THROW_ON_ERROR));

        try {
            $authorizeUrl = $service->buildAuthorizationUrl($credential, $state);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages([
                'integration' => $e->getMessage(),
            ]);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'redirect_url' => $authorizeUrl,
                'summary' => [
                    'provider' => $service->provider(),
                    'label' => $service->label(),
                    'credential_id' => $credential->getKey(),
                    'credential_name' => $credential->name,
                    'redirect_uri' => $service->redirectUri(),
                    'authorize_url' => $service->authorizationEndpoint(),
                    'scope' => data_get($credential->public_data, 'scope'),
                ],
            ]);
        }

        return redirect()->away($authorizeUrl);
    }

    public function disconnect(Request $request, string $provider): JsonResponse
    {
        $provider = strtolower(trim($provider));
        $service = $this->resolveProviderService($provider);

        $validated = $request->validate([
            'credentialable_type' => ['required', 'string', 'max:255'],
            'credentialable_id' => ['required', 'integer', 'min:1'],
            'credential_id' => ['required', 'integer', 'min:1'],
        ]);

        $credentialable = $this->resolveCredentialable($validated['credentialable_type'], intval($validated['credentialable_id']));
        abort_unless(Gate::allows('update', $credentialable), 403);
        $this->ensureProviderAllowedForCredentialable($credentialable, $provider);

        $credential = Credential::query()
            ->whereKey(intval($validated['credential_id']))
            ->where('provider', $service->provider())
            ->where('type', $service->type())
            ->where('credentialable_type', $credentialable->getMorphClass())
            ->where('credentialable_id', $credentialable->getKey())
            ->firstOrFail();

        $credential->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Verbindung gelöscht.',
            'provider' => $service->provider(),
            'credential_id' => $credential->getKey(),
        ]);
    }

    public function callback(Request $request, string $provider): Response
    {
        $provider = strtolower(trim($provider));
        $service = $this->resolveProviderService($provider);

        $request->validate([
            'state' => ['required', 'string'],
            'code' => ['nullable', 'string'],
            'error' => ['nullable', 'string'],
            'error_description' => ['nullable', 'string'],
        ]);

        try {
            $state = $this->decodeState($request->string('state')->value());
        } catch (Throwable $e) {
            return $this->oauthCallbackResponse($this->appendQuery(route('settings.index'), [
                'integration' => $provider,
                'status' => 'error',
                'message' => 'invalid_state',
            ]));
        }

        $stateKey = (string) ($state['state_key'] ?? '');
        $sessionPayload = $stateKey !== '' ? $request->session()->get('integration_oauth.' . $stateKey) : null;
        $sessionReturnUrl = is_array($sessionPayload) ? ($sessionPayload['return_url'] ?? null) : null;
        $returnUrl = $this->sanitizeReturnUrl(is_string($sessionReturnUrl) ? $sessionReturnUrl : null);

        $credentialable = $this->resolveCredentialable(
            (string) ($state['credentialable_type'] ?? ''),
            intval($state['credentialable_id'] ?? 0)
        );
        $this->ensureProviderAllowedForCredentialable($credentialable, $provider);

        $credential = Credential::query()->findOrFail(intval($state['credential_id'] ?? 0));

        if (
            $credential->provider !== $service->provider() ||
            $credential->type !== $service->type() ||
            intval($credential->credentialable_id) !== intval($state['credentialable_id'] ?? 0) ||
            $credential->credentialable_type !== ($state['credentialable_type'] ?? null)
        ) {
            abort(403, 'Ungültiger OAuth-State.');
        }

        if ($stateKey !== '') {
            $request->session()->forget('integration_oauth.' . $stateKey);
        }

        if ($request->filled('error')) {
            $credential->status = Credential::STATUS_INVALID;
            $credential->save();
            return $this->oauthCallbackResponse($this->appendQuery($returnUrl, [
                'integration' => $provider,
                'status' => 'error',
                'message' => (string) $request->get('error'),
            ]));
        }

        $code = $request->string('code')->value();
        if ($code === '') {
            return $this->oauthCallbackResponse($this->appendQuery($returnUrl, [
                'integration' => $provider,
                'status' => 'error',
                'message' => 'missing_code',
            ]));
        }

        try {
            $tokenPayload = $service->exchangeCodeForToken($credential, $code);
            $service->applyTokenPayload($credential, $tokenPayload);
            $credential->save();
        } catch (Throwable $e) {
            report($e);
            $credential->status = Credential::STATUS_INVALID;
            $credential->save();
            return $this->oauthCallbackResponse($this->appendQuery($returnUrl, [
                'integration' => $provider,
                'status' => 'error',
                'message' => 'token_exchange_failed',
            ]));
        }

        return $this->oauthCallbackResponse($this->appendQuery($returnUrl, [
            'integration' => $provider,
            'status' => 'connected',
            'credential_id' => $credential->getKey(),
        ]));
    }

    protected function resolveCredentialable(string $type, int $id): Model
    {
        if (!class_exists($type)) {
            throw ValidationException::withMessages([
                'credentialable_type' => 'Model-Klasse existiert nicht.',
            ]);
        }

        $obj = new $type();
        if (!($obj instanceof Model)) {
            throw ValidationException::withMessages([
                'credentialable_type' => 'Ungültiges credentialable Model.',
            ]);
        }

        $entry = $obj->newQuery()->find($id);
        if (!$entry) {
            throw ValidationException::withMessages([
                'credentialable_id' => 'Credentialable Datensatz wurde nicht gefunden.',
            ]);
        }

        return $entry;
    }

    protected function decodeState(string $state): array
    {
        try {
            $json = Crypt::decryptString($state);
            $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new RuntimeException('OAuth-State ist ungültig.');
        }

        if (!is_array($decoded)) {
            throw new RuntimeException('OAuth-State ist ungültig.');
        }

        $expiresAt = intval($decoded['expires_at'] ?? 0);
        if ($expiresAt <= 0 || $expiresAt < now()->timestamp) {
            throw new RuntimeException('OAuth-State ist abgelaufen.');
        }

        return $decoded;
    }

    protected function sanitizeReturnUrl(?string $returnUrl): string
    {
        $fallback = route('settings.index');
        if (!is_string($returnUrl) || trim($returnUrl) === '') {
            return $fallback;
        }

        $returnUrl = trim($returnUrl);
        if (str_starts_with($returnUrl, '/')) {
            return $returnUrl;
        }

        $host = parse_url($returnUrl, PHP_URL_HOST);
        $appHost = parse_url((string) config('app.url', ''), PHP_URL_HOST);
        if (!$host || !$appHost || strcasecmp((string) $host, (string) $appHost) !== 0) {
            return $fallback;
        }

        return $returnUrl;
    }

    protected function oauthCallbackResponse(string $targetUrl): Response
    {
        $target = $this->sanitizeReturnUrl($targetUrl);
        $targetJson = json_encode($target, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        $targetHtml = e($target);

        $html = <<<HTML
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OAuth abgeschlossen</title>
</head>
<body>
  <script>
    (function () {
      var target = {$targetJson};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "hubjutsu:oauth:done", targetUrl: target }, window.location.origin);
          window.opener.location.reload();
          window.close();
          return;
        }
      } catch (e) {}

      window.location.replace(target);
    })();
  </script>
  <noscript>
    OAuth abgeschlossen. <a href="{$targetHtml}">Weiter</a>.
  </noscript>
</body>
</html>
HTML;

        return response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    protected function appendQuery(string $url, array $params): string
    {
        $separator = str_contains($url, '?') ? '&' : '?';
        return $url . $separator . http_build_query($params);
    }

    protected function resolveProviderService(string $provider): CredentialService
    {
        try {
            return app(IntegrationServiceRegistry::class)->get($provider);
        } catch (Throwable $e) {
            throw ValidationException::withMessages([
                'provider' => 'Provider wird aktuell nicht unterstützt.',
            ]);
        }
    }

    protected function serviceDefinition(CredentialService $service): array
    {
        return app(IntegrationServiceRegistry::class)->definition($service);
    }

    protected function resolveLabel(Model $model): string
    {
        foreach (['label', 'name', 'title', 'email'] as $field) {
            $value = $model->getAttribute($field);
            if (is_scalar($value) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }

        return Str::headline(class_basename($model)) . ' #' . $model->getKey();
    }

    /**
     * @return array<int, string>|null
     */
    protected function allowedProvidersForCredentialable(Model $credentialable): ?array
    {
        if (!method_exists($credentialable, 'availableCredentialServices')) {
            return null;
        }

        try {
            $rows = $credentialable->availableCredentialServices();
        } catch (Throwable) {
            return null;
        }

        if (!is_array($rows)) {
            return null;
        }

        return collect($rows)
            ->map(fn ($row) => is_array($row) ? strtolower(trim((string) ($row['provider'] ?? ''))) : '')
            ->filter(fn ($provider) => $provider !== '')
            ->unique()
            ->values()
            ->all();
    }

    protected function ensureProviderAllowedForCredentialable(Model $credentialable, string $provider): void
    {
        $allowedProviders = $this->allowedProvidersForCredentialable($credentialable);
        if ($allowedProviders === null) {
            return;
        }

        if (!in_array(strtolower(trim($provider)), $allowedProviders, true)) {
            abort(403, 'Provider ist für dieses Objekt nicht freigegeben.');
        }
    }
}
