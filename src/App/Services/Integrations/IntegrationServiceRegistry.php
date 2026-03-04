<?php

namespace AHerzog\Hubjutsu\App\Services\Integrations;

use Illuminate\Support\Str;
use RuntimeException;

class IntegrationServiceRegistry
{
    /**
     * @var array<string, class-string<CredentialService>>
     */
    protected array $providerMap = [];

    /**
     * @return array<string, CredentialService>
     */
    public function all(): array
    {
        $services = [];
        foreach ($this->providerMap as $provider => $serviceClass) {
            $service = $this->makeService($serviceClass);
            $services[$provider] = $service;
        }
        return $services;
    }

    public function register(string $serviceClass): self
    {
        $service = $this->makeService($serviceClass);
        $this->providerMap[$service->provider()] = $serviceClass;
        return $this;
    }

    public function unregister(string $provider): self
    {
        $provider = strtolower(trim($provider));
        unset($this->providerMap[$provider]);
        return $this;
    }

    /**
     * @param array<int, string> $serviceClasses
     */
    public function replace(array $serviceClasses): self
    {
        $this->providerMap = [];
        foreach ($serviceClasses as $serviceClass) {
            if (!is_string($serviceClass) || trim($serviceClass) === '') {
                continue;
            }
            $this->register($serviceClass);
        }
        return $this;
    }

    public function get(string $provider): CredentialService
    {
        $provider = strtolower(trim($provider));
        if (!isset($this->providerMap[$provider])) {
            throw new RuntimeException('Provider wird aktuell nicht unterstützt.');
        }
        return $this->makeService($this->providerMap[$provider]);
    }

    public function definition(CredentialService $service): array
    {
        return [
            'provider' => $service->provider(),
            'label' => $service->label(),
            'description' => $service->description(),
            'type' => $service->type(),
            'allow_multiple' => $service->allowMultiple(),
            'connect_fields' => $service->connectFields(),
            'redirect_uri' => $service->redirectUri(),
            'configured_scopes' => $service->configuredScopes(),
            'setup_instructions' => $service->setupInstructions(),
            'setup_docs_url' => $service->setupDocsUrl(),
            'slug' => Str::slug($service->provider()),
        ];
    }

    /**
     * @param class-string<CredentialService> $serviceClass
     */
    protected function makeService(string $serviceClass): CredentialService
    {
        $service = app($serviceClass);
        if (!$service instanceof CredentialService) {
            throw new RuntimeException(sprintf(
                'Integration service "%s" muss von %s erben.',
                $serviceClass,
                CredentialService::class
            ));
        }
        return $service;
    }
}
