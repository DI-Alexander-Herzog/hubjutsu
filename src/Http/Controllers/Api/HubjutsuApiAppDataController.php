<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Api;

use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Http\Request;
use Auth;

class HubjutsuApiAppDataController
{
    public function getAppData() {
        return [
            'hasDarkMode' => config('hubjutsu.dark_mode'),
            'hasGuestMode' => config('hubjutsu.allow_guest_mode'),
            'registrationAllowed' => config('hubjutsu.allow_registration'),
            'access_hubs_from_all_domains' => config('hubjutsu.access_hubs_from_all_domains')
        ];
    }
}