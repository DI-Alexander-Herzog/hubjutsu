<?php

namespace AHerzog\Hubjutsu\App\Services\Integrations;

use App\Models\Credential;

abstract class TokenOnlyService extends CredentialService
{
    public function type(): string
    {
        return Credential::TYPE_API_KEY;
    }

    public function description(): string
    {
        return 'Token-basierte Integration ohne OAuth-Redirect.';
    }

    public function connectFields(): array
    {
        return [
            [
                'name' => 'access_token',
                'label' => 'Access Token',
                'type' => 'password',
                'required' => true,
                'placeholder' => 'z. B. sevdesk API Token',
            ],
        ];
    }

    public function connectValidationRules(): array
    {
        return [
            'access_token' => ['nullable', 'string', 'max:4096'],
            'clear_access_token' => ['nullable', 'boolean'],
        ];
    }

    public function applyConnectInput(Credential $credential, array $input): void
    {
        if (boolval($input['clear_access_token'] ?? false)) {
            $this->forgetSecret($credential, 'access_token');
        }

        if (!empty($input['access_token'])) {
            $this->putSecret($credential, 'access_token', trim((string) $input['access_token']));
        }
    }

    public function assertReadyForConnect(Credential $credential): void
    {
        $this->readRequiredString(
            data_get($credential->secret_data, 'access_token'),
            'Access Token fehlt im Credential (secret_data.access_token).'
        );
    }

    public function canConnectWithoutOAuth(Credential $credential): bool
    {
        $token = data_get($credential->secret_data, 'access_token');
        return is_string($token) && trim($token) !== '';
    }

    public function connectWithoutOAuth(Credential $credential): void
    {
        $credential->type = $this->type();
        $credential->provider = $this->provider();
        $credential->status = Credential::STATUS_ACTIVE;
        $credential->valid_until = null;
    }

    public function currentAccessToken(): string
    {
        $credential = $this->resolveLatestCredential($this->resolveCredential());
        return $this->readRequiredString(
            data_get($credential->secret_data, 'access_token'),
            'Access Token fehlt im Credential (secret_data.access_token).'
        );
    }
}
