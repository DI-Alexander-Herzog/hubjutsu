<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Api;

use AHerzog\Hubjutsu\DTO\Colors;
use App\Models\Hub;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Http\Request;
use Auth;

class HubjutsuApiAppDataController
{
    public function getAppData(Request $request) {
        $colors = Hub::appColors(Colors::green());
        return response()->json([
            'hasDarkMode' => config('hubjutsu.dark_mode'),
            'hasGuestMode' => config('hubjutsu.allow_guest_mode'),
            'registrationAllowed' => config('hubjutsu.allow_registration'),
            'access_hubs_from_all_domains' => config('hubjutsu.access_hubs_from_all_domains'),
            'lightColors' => $colors->lightColors,
            'darkColors' => $colors->darkColors,
        ]);

    }

}