<?php

namespace App\Models;

use App\Services\Integrations\GoogleOAuthService;
use App\Services\Integrations\MetaAdsOAuthService;
use App\Services\Integrations\MetaLoginOAuthService;

class Hub extends \AHerzog\Hubjutsu\Models\Hub {
    // Beispiel pro Projekt:
    // protected function credentialServiceProviders(): array
    // {
    //     return [
    //         MetaAdsOAuthService::SERVICE_KEY,
    //         MetaLoginOAuthService::SERVICE_KEY,
    //         GoogleOAuthService::SERVICE_KEY,
    //     ];
    // }
}
