<?php

namespace AHerzog\Hubjutsu\App\Services\Integrations;

use App\Models\Credential;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use RuntimeException;

abstract class CredentialService
{
    protected const TOKEN_REFRESH_LEEWAY_SECONDS = 300;
    protected const TOKEN_REFRESH_LOCK_SECONDS = 30;
    protected const TOKEN_REFRESH_WAIT_SECONDS = 10;

    protected ?Credential $activeCredential = null;

    public function __construct(?Credential $credential = null)
    {
        $this->activeCredential = $credential;
    }

    abstract public function provider(): string;

    abstract public function type(): string;

    public function label(): string
    {
        return Str::headline($this->provider());
    }

    public function description(): string
    {
        return '';
    }

    public function allowMultiple(): bool
    {
        return false;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function connectFields(): array
    {
        return [];
    }

    public function connectValidationRules(): array
    {
        return [];
    }

    /**
     * @return array<int, string>
     */
    public function setupInstructions(): array
    {
        return [];
    }

    public function setupDocsUrl(): ?string
    {
        return null;
    }

    /**
     * Feste Service-Scopes (read-only Anzeige im Connect-Dialog).
     *
     * @return array<int, string>
     */
    public function configuredScopes(): array
    {
        return [];
    }

    public function requiresTokenRefresh(): bool
    {
        return false;
    }

    public function refreshNow(): bool
    {
        return false;
    }

    public function applyConnectInput(Credential $credential, array $input): void
    {
        // Provider-specific mapping
    }

    public function assertReadyForConnect(Credential $credential): void
    {
        // Provider-specific readiness checks
    }

    public function canConnectWithoutOAuth(Credential $credential): bool
    {
        return false;
    }

    public function connectWithoutOAuth(Credential $credential): void
    {
        // Optional provider-specific direct connect
    }

    public function ensureCredentialDefaults(Credential $credential, Model $credentialable, ?string $name = null): void
    {
        $credential->type = $this->type();
        $credential->provider = $this->provider();
        $credential->status = $credential->status ?: Credential::STATUS_ACTIVE;
        $credential->credentialable_type = $credentialable->getMorphClass();
        $credential->credentialable_id = $credentialable->getKey();

        if (!$credential->exists) {
            $defaultName = sprintf(
                '%s %s (%s #%s)',
                Str::headline($this->provider()),
                Str::headline($this->type()),
                class_basename($credentialable),
                $credentialable->getKey()
            );
            $credential->name = $name ?: $defaultName;
        } elseif ($name) {
            $credential->name = $name;
        }

        if (!is_array($credential->public_data)) {
            $credential->public_data = [];
        }
        if (!is_array($credential->secret_data)) {
            $credential->secret_data = [];
        }
        if (!is_array($credential->meta)) {
            $credential->meta = [];
        }
    }

    protected function getPublic(Credential $credential, string $key, mixed $default = null): mixed
    {
        return data_get($credential->public_data, $key, $default);
    }

    protected function getSecret(Credential $credential, string $key, mixed $default = null): mixed
    {
        return data_get($credential->secret_data, $key, $default);
    }

    protected function putPublic(Credential $credential, string $key, mixed $value): void
    {
        $publicData = is_array($credential->public_data) ? $credential->public_data : [];
        data_set($publicData, $key, $value);
        $credential->public_data = $publicData;
    }

    protected function putSecret(Credential $credential, string $key, mixed $value): void
    {
        $secretData = is_array($credential->secret_data) ? $credential->secret_data : [];
        data_set($secretData, $key, $value);
        $credential->secret_data = $secretData;
    }

    protected function forgetSecret(Credential $credential, string $key): void
    {
        $secretData = is_array($credential->secret_data) ? $credential->secret_data : [];
        data_forget($secretData, $key);
        $credential->secret_data = $secretData;
    }

    protected function putMeta(Credential $credential, string $key, mixed $value): void
    {
        $meta = is_array($credential->meta) ? $credential->meta : [];
        data_set($meta, $key, $value);
        $credential->meta = $meta;
    }

    protected function readRequiredString(mixed $value, string $message): string
    {
        if (!is_string($value) || trim($value) === '') {
            throw new RuntimeException($message);
        }
        return trim($value);
    }

    public function forCredential(Credential $credential): static
    {
        $service = clone $this;
        $service->activeCredential = $credential;
        return $service;
    }

    protected function resolveCredential(): Credential
    {
        if (!$this->activeCredential) {
            throw new RuntimeException('Kein Credential am Service gebunden.');
        }

        return $this->activeCredential;
    }

    protected function normalizeScopes(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (is_string($value)) {
            return trim($value);
        }
        if (is_array($value)) {
            $parts = collect($value)
                ->map(fn ($entry) => trim((string) $entry))
                ->filter(fn ($entry) => $entry !== '')
                ->values()
                ->all();
            return implode(',', $parts);
        }
        return null;
    }

    public function authorizationEndpoint(): string
    {
        return '';
    }

    public function redirectUri(): string
    {
        return '';
    }

    protected function resolveRedirectUri(string $configPath, string $provider): string
    {
        $configured = trim((string) config($configPath, ''));
        if ($configured !== '') {
            return $configured;
        }

        return route('integrations.oauth.callback', ['provider' => $provider]);
    }

    protected function resolveLatestCredential(Credential $credential): Credential
    {
        if (!$credential->exists) {
            return $credential;
        }

        $latest = Credential::query()
            ->where('credentialable_type', $credential->credentialable_type)
            ->where('credentialable_id', $credential->credentialable_id)
            ->where('provider', $credential->provider)
            ->where('type', $credential->type)
            ->latest('id')
            ->first();

        if ($latest instanceof Credential) {
            $this->activeCredential = $latest;
            return $latest;
        }

        return $credential;
    }

    protected function withCredentialLock(
        Credential $credential,
        string $purpose,
        callable $callback,
        int $lockSeconds = 30,
        int $waitSeconds = 10
    ): mixed {
        $lockKey = $this->credentialLockKey($credential, $purpose);
        return Cache::lock($lockKey, $lockSeconds)->block($waitSeconds, $callback);
    }

    protected function credentialLockKey(Credential $credential, string $purpose): string
    {
        $scope = implode(':', [
            (string) $credential->credentialable_type,
            (string) $credential->credentialable_id,
            (string) $credential->provider,
            (string) $credential->type,
        ]);

        return 'credential:' . md5($scope) . ':' . trim($purpose);
    }

    protected function parseDateTime(mixed $value): ?Carbon
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    protected function isExpiringSoon(?Carbon $expiresAt, int $leewaySeconds = 300): bool
    {
        if (!$expiresAt) {
            return false;
        }

        return now()->greaterThanOrEqualTo($expiresAt->copy()->subSeconds(max(0, $leewaySeconds)));
    }
}
