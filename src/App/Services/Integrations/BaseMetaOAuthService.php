<?php

namespace AHerzog\Hubjutsu\App\Services\Integrations;

use App\Models\Credential;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

abstract class BaseMetaOAuthService extends OAuthCredentialService
{
    protected const AUTHORIZE_URL = 'https://www.facebook.com/v22.0/dialog/oauth';
    protected const TOKEN_URL = 'https://graph.facebook.com/v22.0/oauth/access_token';

    /**
     * @return array<int, string>
     */
    abstract protected function defaultScopes(): array;

    public function configuredScopes(): array
    {
        return $this->defaultScopes();
    }

    public function type(): string
    {
        return Credential::TYPE_OAUTH2;
    }

    public function connectFields(): array
    {
        return [
            [
                'name' => 'meta_app_id',
                'label' => 'App-ID',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'Meta App ID',
            ],
            [
                'name' => 'meta_app_secret',
                'label' => 'App-Geheimcode',
                'type' => 'password',
                'required' => true,
            ],
            [
                'name' => 'meta_system_user_token',
                'label' => 'System User Token (optional)',
                'type' => 'password',
                'required' => false,
                'help' => 'Optional: wird für API-Calls bevorzugt verwendet, falls gesetzt.',
            ],
        ];
    }

    public function connectValidationRules(): array
    {
        return [
            'meta_app_id' => ['nullable', 'string', 'max:255'],
            'meta_app_secret' => ['nullable', 'string', 'max:1024'],
            'meta_system_user_token' => ['nullable', 'string', 'max:4096'],
            'clear_meta_app_secret' => ['nullable', 'boolean'],
            'clear_meta_system_user_token' => ['nullable', 'boolean'],
            // Backward compatibility
            'meta_client_id' => ['nullable', 'string', 'max:255'],
            'meta_client_secret' => ['nullable', 'string', 'max:1024'],
        ];
    }

    public function applyConnectInput(Credential $credential, array $input): void
    {
        $appId = $input['meta_app_id'] ?? $input['meta_client_id'] ?? null;
        $appSecret = $input['meta_app_secret'] ?? $input['meta_client_secret'] ?? null;
        $clearAppSecret = boolval($input['clear_meta_app_secret'] ?? false);
        $clearSystemToken = boolval($input['clear_meta_system_user_token'] ?? false);

        if (!empty($appId)) {
            $this->putPublic($credential, 'client_id', trim((string) $appId));
        }
        if ($clearAppSecret) {
            $this->forgetSecret($credential, 'client_secret');
        }
        if (!empty($appSecret)) {
            $this->putSecret($credential, 'client_secret', trim((string) $appSecret));
        }
        if ($clearSystemToken) {
            $this->forgetSecret($credential, 'system_user_token');
        }
        if (!empty($input['meta_system_user_token'])) {
            $this->putSecret($credential, 'system_user_token', trim((string) $input['meta_system_user_token']));
        }

        $this->putPublic($credential, 'scope', implode(',', $this->defaultScopes()));
    }

    public function assertReadyForConnect(Credential $credential): void
    {
        $this->resolveClientId($credential);
        $this->resolveClientSecret($credential);
    }

    public function canConnectWithoutOAuth(Credential $credential): bool
    {
        $token = data_get($credential->secret_data, 'system_user_token');
        return is_string($token) && trim($token) !== '';
    }

    public function connectWithoutOAuth(Credential $credential): void
    {
        $now = Carbon::now();
        $existingMeta = is_array($credential->meta) ? $credential->meta : [];

        $credential->type = Credential::TYPE_OAUTH2;
        $credential->provider = $this->provider();
        $credential->status = Credential::STATUS_ACTIVE;
        $credential->valid_until = null;

        $credential->meta = array_merge($existingMeta, [
            'oauth' => [
                'provider' => $this->provider(),
                'mode' => 'system_user_token',
                'updated_at' => $now->toIso8601String(),
            ],
        ]);
    }

    public function buildAuthorizationUrl(Credential $credential, string $state): string
    {
        $clientId = $this->resolveClientId($credential);
        $redirectUri = $this->redirectUri();
        $scope = $this->normalizedScope($credential);

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'state' => $state,
        ];

        if ($scope !== '') {
            $params['scope'] = $scope;
        }

        return self::AUTHORIZE_URL . '?' . http_build_query($params);
    }

    public function exchangeCodeForToken(Credential $credential, string $code): array
    {
        $clientId = $this->resolveClientId($credential);
        $clientSecret = $this->resolveClientSecret($credential);
        $redirectUri = $this->redirectUri();

        $response = Http::asForm()->post(self::TOKEN_URL, [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'code' => $code,
        ]);

        if (!$response->successful()) {
            throw new RuntimeException('Meta Token-Austausch fehlgeschlagen: ' . $response->body());
        }

        $shortPayload = $response->json();
        $shortPayload = is_array($shortPayload) ? $shortPayload : [];

        $shortAccessToken = isset($shortPayload['access_token']) ? trim((string) $shortPayload['access_token']) : '';
        if ($shortAccessToken === '') {
            return $shortPayload;
        }

        $longLivedResponse = Http::get(self::TOKEN_URL, [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'fb_exchange_token' => $shortAccessToken,
        ]);

        if (!$longLivedResponse->successful()) {
            throw new RuntimeException('Meta Long-Lived Token-Austausch fehlgeschlagen: ' . $longLivedResponse->body());
        }

        $longPayload = $longLivedResponse->json();
        $longPayload = is_array($longPayload) ? $longPayload : [];

        return array_merge($shortPayload, $longPayload, [
            'short_lived_access_token' => $shortAccessToken,
            'is_long_lived' => true,
        ]);
    }

    public function currentAccessToken(bool $forceRefresh = false): string
    {
        $credential = $this->resolveLatestCredential($this->resolveCredential());
        return $this->currentAccessTokenForCredential($credential, $forceRefresh);
    }

    public function requiresTokenRefresh(): bool
    {
        return true;
    }

    public function refreshNow(): bool
    {
        $credential = $this->resolveLatestCredential($this->resolveCredential());

        $systemUserToken = data_get($credential->secret_data, 'system_user_token');
        if (is_string($systemUserToken) && trim($systemUserToken) !== '') {
            return false;
        }

        $this->currentAccessTokenForCredential($credential, true);
        return true;
    }

    protected function currentAccessTokenForCredential(Credential $credential, bool $forceRefresh = false): string
    {
        $systemUserToken = data_get($credential->secret_data, 'system_user_token');
        if (is_string($systemUserToken) && trim($systemUserToken) !== '') {
            return trim($systemUserToken);
        }

        $currentToken = $this->readRequiredString(
            data_get($credential->secret_data, 'access_token'),
            'Meta access_token fehlt im Credential.'
        );

        $expiresAt = $this->parseDateTime(data_get($credential->secret_data, 'access_token_expires_at'));
        if (!$forceRefresh && !$this->isExpiringSoon($expiresAt, self::TOKEN_REFRESH_LEEWAY_SECONDS)) {
            return $currentToken;
        }

        return $this->withCredentialLock(
            $credential,
            'token-refresh',
            function () use ($credential, $forceRefresh): string {
                $fresh = $credential->fresh();
                if (!$fresh instanceof Credential) {
                    throw new RuntimeException('Credential konnte nicht aktualisiert werden.');
                }

                $fresh = $this->resolveLatestCredential($fresh);

                $systemUserToken = data_get($fresh->secret_data, 'system_user_token');
                if (is_string($systemUserToken) && trim($systemUserToken) !== '') {
                    return trim($systemUserToken);
                }

                $token = $this->readRequiredString(
                    data_get($fresh->secret_data, 'access_token'),
                    'Meta access_token fehlt im Credential.'
                );

                $expiresAt = $this->parseDateTime(data_get($fresh->secret_data, 'access_token_expires_at'));
                if (!$forceRefresh && !$this->isExpiringSoon($expiresAt, self::TOKEN_REFRESH_LEEWAY_SECONDS)) {
                    return $token;
                }

                $payload = $this->refreshMetaAccessTokenPayload($fresh, $token);
                $newToken = $this->readRequiredString(
                    $payload['access_token'] ?? null,
                    'Meta Token-Refresh lieferte keinen access_token.'
                );

                $now = Carbon::now();
                $expiresIn = isset($payload['expires_in']) ? intval($payload['expires_in']) : null;
                $validUntil = $expiresIn && $expiresIn > 0 ? $now->copy()->addSeconds($expiresIn) : null;

                $secretData = is_array($fresh->secret_data) ? $fresh->secret_data : [];
                $secretData['access_token'] = $newToken;
                $secretData['expires_in'] = $expiresIn;
                $secretData['is_long_lived'] = true;
                $secretData['access_token_obtained_at'] = $now->toIso8601String();
                $secretData['access_token_expires_at'] = $validUntil?->toIso8601String();
                $fresh->secret_data = $secretData;

                $meta = is_array($fresh->meta) ? $fresh->meta : [];
                $oauthMeta = is_array(data_get($meta, 'oauth')) ? data_get($meta, 'oauth') : [];
                $oauthMeta['provider'] = $this->provider();
                $oauthMeta['token_url'] = self::TOKEN_URL;
                $oauthMeta['authorize_url'] = self::AUTHORIZE_URL;
                $oauthMeta['updated_at'] = $now->toIso8601String();
                $oauthMeta['refresh_reason'] = 'pre_use_expired_or_soon_expired';
                $meta['oauth'] = $oauthMeta;
                $fresh->meta = $meta;

                $fresh->status = Credential::STATUS_ACTIVE;
                $fresh->valid_until = $validUntil;
                $fresh->last_used_at = $now;
                $fresh->save();

                $this->activeCredential = $fresh;

                return $newToken;
            },
            self::TOKEN_REFRESH_LOCK_SECONDS,
            self::TOKEN_REFRESH_WAIT_SECONDS
        );
    }

    public function applyTokenPayload(Credential $credential, array $tokenPayload): void
    {
        $now = Carbon::now();
        $expiresIn = isset($tokenPayload['expires_in']) ? intval($tokenPayload['expires_in']) : null;
        $validUntil = $expiresIn && $expiresIn > 0 ? $now->copy()->addSeconds($expiresIn) : null;

        $existingPublicData = is_array($credential->public_data) ? $credential->public_data : [];
        $existingSecretData = is_array($credential->secret_data) ? $credential->secret_data : [];
        $existingMeta = is_array($credential->meta) ? $credential->meta : [];

        $credential->type = Credential::TYPE_OAUTH2;
        $credential->provider = $this->provider();
        $credential->status = Credential::STATUS_ACTIVE;
        $credential->valid_until = $validUntil;

        $credential->public_data = array_merge($existingPublicData, [
            'provider' => $this->provider(),
            'client_id' => $this->resolveClientId($credential),
            'scope' => $this->normalizedScope($credential),
            'token_type' => $tokenPayload['token_type'] ?? null,
            'connected_at' => $now->toIso8601String(),
        ]);

        $credential->secret_data = array_merge($existingSecretData, [
            'access_token' => $tokenPayload['access_token'] ?? null,
            'short_lived_access_token' => $tokenPayload['short_lived_access_token'] ?? null,
            'token_type' => $tokenPayload['token_type'] ?? null,
            'expires_in' => $expiresIn,
            'is_long_lived' => (bool) ($tokenPayload['is_long_lived'] ?? false),
            'access_token_obtained_at' => $now->toIso8601String(),
            'access_token_expires_at' => $validUntil?->toIso8601String(),
        ]);

        $credential->meta = array_merge($existingMeta, [
            'oauth' => [
                'provider' => $this->provider(),
                'token_url' => self::TOKEN_URL,
                'authorize_url' => self::AUTHORIZE_URL,
                'updated_at' => $now->toIso8601String(),
            ],
        ]);
    }

    public function authorizationEndpoint(): string
    {
        return self::AUTHORIZE_URL;
    }

    public function redirectUri(): string
    {
        return route('integrations.oauth.callback', ['provider' => $this->provider()]);
    }

    protected function normalizedScope(Credential $credential): string
    {
        $scopeConfig = $this->normalizeScopes($this->getPublic($credential, 'scope'));
        if (!$scopeConfig) {
            $scopeConfig = $this->defaultScopes();
        }

        if (is_string($scopeConfig)) {
            return trim($scopeConfig);
        }

        if (is_array($scopeConfig)) {
            $parts = collect($scopeConfig)
                ->filter(fn ($value) => is_string($value) && trim($value) !== '')
                ->map(fn ($value) => trim($value))
                ->values()
                ->all();

            return implode(',', $parts);
        }

        return '';
    }

    protected function resolveClientId(Credential $credential): string
    {
        return $this->readRequiredString(
            $this->getPublic($credential, 'client_id'),
            'Meta client_id fehlt im Credential (public_data.client_id).'
        );
    }

    protected function resolveClientSecret(Credential $credential): string
    {
        return $this->readRequiredString(
            $this->getSecret($credential, 'client_secret'),
            'Meta client_secret fehlt im Credential (secret_data.client_secret).'
        );
    }

    /**
     * @return array<string, mixed>
     */
    protected function refreshMetaAccessTokenPayload(Credential $credential, string $accessToken): array
    {
        $response = Http::get(self::TOKEN_URL, [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->resolveClientId($credential),
            'client_secret' => $this->resolveClientSecret($credential),
            'fb_exchange_token' => $accessToken,
        ]);

        if (!$response->successful()) {
            throw new RuntimeException('Meta Long-Lived Token-Refresh fehlgeschlagen: ' . $response->body());
        }

        $payload = $response->json();
        if (!is_array($payload)) {
            throw new RuntimeException('Meta Token-Refresh Response ist ungültig.');
        }

        return $payload;
    }
}
