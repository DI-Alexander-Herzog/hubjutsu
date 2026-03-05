<?php

namespace AHerzog\Hubjutsu\App\Services\Integrations;

use App\Models\Credential;

abstract class OAuthCredentialService extends CredentialService
{
    abstract public function buildAuthorizationUrl(Credential $credential, string $state): string;

    abstract public function exchangeCodeForToken(Credential $credential, string $code): array;

    abstract public function applyTokenPayload(Credential $credential, array $tokenPayload): void;

    public function authorizationEndpoint(): string
    {
        return '';
    }

    public function redirectUri(): string
    {
        return route('integrations.oauth.callback', ['provider' => $this->provider()]);
    }
}
