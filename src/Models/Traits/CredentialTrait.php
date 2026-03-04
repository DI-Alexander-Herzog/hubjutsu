<?php

namespace AHerzog\Hubjutsu\Models\Traits;

use App\Models\Credential;
use AHerzog\Hubjutsu\App\Services\Integrations\IntegrationServiceRegistry;
use Throwable;

trait CredentialTrait
{
    /**
     * Fixe Provider-Liste für dieses Model (im Model überschreiben).
     *
     * @return array<int, string>
     */
    protected function credentialServiceProviders(): array
    {
        return [];
    }

    public function credentials()
    {
        return $this->morphMany(Credential::class, 'credentialable');
    }

    public function credentialsByType(string $type)
    {
        return $this->credentials()->where('type', $type);
    }

    public function credentialsByProvider(string $provider)
    {
        return $this->credentials()->where('provider', $provider);
    }

    public function credentialForProvider(string $provider, ?string $type = null): ?Credential
    {
        $query = $this->credentialsByProvider($provider)->latest('id');
        if ($type) {
            $query->where('type', $type);
        }
        return $query->first();
    }

    public function getServiceByProvider(string $provider)
    {
        $provider = strtolower(trim($provider));
        if ($provider === '') {
            return null;
        }

        $credential = $this->credentialForProvider($provider, Credential::TYPE_OAUTH2);
        if (!$credential) {
            return null;
        }

        try {
            $service = app(IntegrationServiceRegistry::class)->get($provider);
        } catch (Throwable) {
            return null;
        }

        if (!method_exists($service, 'forCredential')) {
            return null;
        }

        return $service->forCredential($credential);
    }

    /**
     * Für UI: welche Services an diesem Model verfügbar sind + Status.
     *
     * @param array<int, string>|null $providers
     * @return array<int, array<string, mixed>>
     */
    public function availableCredentialServices(?array $providers = null): array
    {
        $providers = is_array($providers) ? $providers : $this->credentialServiceProviders();
        $providers = array_values(array_unique(array_filter(array_map(
            fn ($provider) => strtolower(trim((string) $provider)),
            $providers
        ))));

        $rows = [];
        $registry = app(IntegrationServiceRegistry::class);

        foreach ($providers as $provider) {
            $credential = $this->credentialForProvider($provider, Credential::TYPE_OAUTH2);
            $service = null;
            if ($registry) {
                try {
                    $service = $registry->get($provider);
                } catch (Throwable) {
                    $service = null;
                }
            }

            $rows[] = [
                'provider' => $provider,
                'label' => $service?->label() ?? \Illuminate\Support\Str::headline(str_replace('_', ' ', $provider)),
                'description' => $service?->description() ?? null,
                'configured' => (bool) $credential,
                'status' => $credential?->status,
                'valid_until' => $credential?->valid_until?->toIso8601String(),
                'credential_id' => $credential?->getKey(),
                'service' => $credential && $service && method_exists($service, 'forCredential')
                    ? $service->forCredential($credential)
                    : null,
            ];
        }

        return $rows;
    }
}
