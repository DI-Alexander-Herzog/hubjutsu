<?php

namespace AHerzog\Hubjutsu\App\Services\Integrations;

class MetaLoginOAuthService extends BaseMetaOAuthService
{
    public const SERVICE_KEY = 'meta_login';

    public function provider(): string
    {
        return self::SERVICE_KEY;
    }

    public function label(): string
    {
        return 'Meta Login';
    }

    public function description(): string
    {
        return 'Meta Login/OAuth für Login- und Content-nahe Rechte mit eigener App-ID/Secret.';
    }

    public function setupDocsUrl(): ?string
    {
        return 'https://developers.facebook.com/docs/facebook-login/';
    }

    public function setupInstructions(): array
    {
        return [
            'Gehe zu <a href="https://developers.facebook.com/apps/creation/" target="_blank" rel="noreferrer">https://developers.facebook.com/apps/creation/</a> und erstelle eine neue App.',
            'Wähle als Anwendungsfälle "Login" (mehrere Schritte).',
            'Verknüpfe die App mit dem passenden Portfolio/Business.',
            'Als Entwickler-App sind oft keine weiteren Freigaben nötig.',
            'Links im Menu bei der App: "Facebook Login for Business" öffnen und die Callback-URL als "gültige OAuth Redirect URI" (das ist in der Mitte der Page) eintragen.',
            'Links im Menu bei der App: App-Einstellungen > Allgemein die App-ID und den App-Geheimcode kopieren und im Connect-Form eintragen.',
        ];
    }

    protected function defaultScopes(): array
    {
        return [
            'public_profile',
            'email',
            'pages_show_list',
            'pages_read_engagement',
            'pages_manage_posts',
            'pages_manage_engagement',
            'instagram_basic',
            'instagram_manage_insights',
            'instagram_manage_comments',
            'instagram_content_publish',
        ];
    }
}
