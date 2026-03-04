<?php

namespace AHerzog\Hubjutsu\App\Services\Integrations;

use App\Models\Credential;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleOAuthService extends CredentialService
{
    public const SERVICE_KEY = 'google';

    protected const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    protected const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    protected const DEFAULT_SCOPES = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/gmail.readonly',
    ];

    protected const SCOPE_OPTIONS = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send',
    ];

    public function provider(): string
    {
        return self::SERVICE_KEY;
    }

    public function type(): string
    {
        return Credential::TYPE_OAUTH2;
    }

    public function label(): string
    {
        return 'Google';
    }

    public function description(): string
    {
        return 'OAuth Verbindung für Google Drive und Gmail.';
    }

    public function setupDocsUrl(): ?string
    {
        return 'https://developers.google.com/identity/protocols/oauth2/web-server';
    }

    public function setupInstructions(): array
    {
        return [
            'In der Google Cloud Console ein Projekt und OAuth Consent Screen anlegen.',
            'OAuth Client (Typ: Web application) erstellen.',
            'Die Redirect URI aus dem OAuth-Popup als Authorized redirect URI hinterlegen.',
            'Client-ID und Client-Secret hier eintragen.',
            'Scopes auswählen und OAuth starten.',
        ];
    }

    public function connectFields(): array
    {
        return [
            [
                'name' => 'google_client_id',
                'label' => 'Client-ID',
                'type' => 'text',
                'required' => true,
            ],
            [
                'name' => 'google_client_secret',
                'label' => 'Client-Secret',
                'type' => 'password',
                'required' => true,
            ],
            [
                'name' => 'google_scopes',
                'label' => 'Scopes',
                'type' => 'multicheck',
                'required' => false,
                'options' => self::SCOPE_OPTIONS,
                'default' => self::DEFAULT_SCOPES,
                'help' => 'Drive + Gmail Read sind vorausgewählt.',
            ],
        ];
    }

    public function connectValidationRules(): array
    {
        return [
            'google_client_id' => ['nullable', 'string', 'max:255'],
            'google_client_secret' => ['nullable', 'string', 'max:1024'],
            'google_scopes' => ['nullable'],
        ];
    }

    public function applyConnectInput(Credential $credential, array $input): void
    {
        if (!empty($input['google_client_id'])) {
            $this->putPublic($credential, 'client_id', trim((string) $input['google_client_id']));
        }
        if (!empty($input['google_client_secret'])) {
            $this->putSecret($credential, 'client_secret', trim((string) $input['google_client_secret']));
        }
        if (array_key_exists('google_scopes', $input) && $input['google_scopes'] !== null) {
            $scopes = $this->normalizeScopes($input['google_scopes']);
            if ($scopes !== null) {
                $this->putPublic($credential, 'scope', $scopes);
            }
        }
    }

    public function assertReadyForConnect(Credential $credential): void
    {
        $this->resolveClientId($credential);
        $this->resolveClientSecret($credential);
    }

    public function buildAuthorizationUrl(Credential $credential, string $state): string
    {
        $authorizeUrl = self::AUTHORIZE_URL;
        $redirectUri = $this->redirectUri();

        $params = [
            'client_id' => $this->resolveClientId($credential),
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'access_type' => 'offline',
            'prompt' => 'consent',
            'include_granted_scopes' => 'true',
            'state' => $state,
            'scope' => $this->normalizedScope($credential),
        ];

        return $authorizeUrl . '?' . http_build_query($params);
    }

    public function exchangeCodeForToken(Credential $credential, string $code): array
    {
        $tokenUrl = self::TOKEN_URL;

        $response = Http::asForm()->post($tokenUrl, [
            'client_id' => $this->resolveClientId($credential),
            'client_secret' => $this->resolveClientSecret($credential),
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $this->redirectUri(),
        ]);

        if (!$response->successful()) {
            throw new RuntimeException('Google Token-Austausch fehlgeschlagen: ' . $response->body());
        }

        $payload = $response->json();
        return is_array($payload) ? $payload : [];
    }

    public function applyTokenPayload(Credential $credential, array $tokenPayload): void
    {
        $now = Carbon::now();
        $expiresIn = isset($tokenPayload['expires_in']) ? intval($tokenPayload['expires_in']) : null;
        $validUntil = $expiresIn && $expiresIn > 0 ? $now->copy()->addSeconds($expiresIn) : null;
        $refreshExpiresInRaw = $tokenPayload['refresh_token_expires_in'] ?? $tokenPayload['refresh_expires_in'] ?? null;
        $refreshExpiresIn = is_numeric($refreshExpiresInRaw) ? intval($refreshExpiresInRaw) : null;
        $refreshValidUntil = $refreshExpiresIn && $refreshExpiresIn > 0 ? $now->copy()->addSeconds($refreshExpiresIn) : null;

        $existingPublicData = is_array($credential->public_data) ? $credential->public_data : [];
        $existingSecretData = is_array($credential->secret_data) ? $credential->secret_data : [];
        $existingMeta = is_array($credential->meta) ? $credential->meta : [];

        $credential->type = Credential::TYPE_OAUTH2;
        $credential->provider = self::SERVICE_KEY;
        $credential->status = Credential::STATUS_ACTIVE;
        $credential->valid_until = $validUntil;

        $credential->public_data = array_merge($existingPublicData, [
            'provider' => self::SERVICE_KEY,
            'client_id' => $this->resolveClientId($credential),
            'scope' => $this->normalizedScope($credential),
            'token_type' => $tokenPayload['token_type'] ?? null,
            'connected_at' => $now->toIso8601String(),
        ]);

        $credential->secret_data = array_merge($existingSecretData, [
            'access_token' => $tokenPayload['access_token'] ?? null,
            'refresh_token' => $tokenPayload['refresh_token'] ?? ($existingSecretData['refresh_token'] ?? null),
            'id_token' => $tokenPayload['id_token'] ?? null,
            'token_type' => $tokenPayload['token_type'] ?? null,
            'expires_in' => $expiresIn,
            'refresh_token_expires_in' => $refreshExpiresIn,
            'access_token_obtained_at' => $now->toIso8601String(),
            'access_token_expires_at' => $validUntil?->toIso8601String(),
            'refresh_token_expires_at' => $refreshValidUntil?->toIso8601String(),
        ]);

        $credential->meta = array_merge($existingMeta, [
            'oauth' => [
                'provider' => self::SERVICE_KEY,
                'token_url' => self::TOKEN_URL,
                'authorize_url' => self::AUTHORIZE_URL,
                'updated_at' => $now->toIso8601String(),
            ],
        ]);
    }

    protected function normalizedScope(Credential $credential): string
    {
        $scopeConfig = $this->normalizeScopes($this->getPublic($credential, 'scope'));
        if (!$scopeConfig) {
            $scopeConfig = self::DEFAULT_SCOPES;
        }

        if (is_string($scopeConfig)) {
            return trim(str_replace(',', ' ', $scopeConfig));
        }

        if (is_array($scopeConfig)) {
            return implode(' ', array_map(fn ($entry) => trim((string) $entry), $scopeConfig));
        }

        return '';
    }

    public function authorizationEndpoint(): string
    {
        return self::AUTHORIZE_URL;
    }

    public function redirectUri(): string
    {
        return route('integrations.oauth.callback', ['provider' => self::SERVICE_KEY]);
    }

    protected function resolveClientId(Credential $credential): string
    {
        return $this->readRequiredString(
            $this->getPublic($credential, 'client_id'),
            'Google client_id fehlt im Credential (public_data.client_id).'
        );
    }

    protected function resolveClientSecret(Credential $credential): string
    {
        return $this->readRequiredString(
            $this->getSecret($credential, 'client_secret'),
            'Google client_secret fehlt im Credential (secret_data.client_secret).'
        );
    }
}
