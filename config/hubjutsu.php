<?php

return [
    'access_hubs_from_all_domains' => env('HUBJUTSU_ACCESS_HUBS_FROM_ALL_DOMAINS', false),
    'super_admin_maildomains' => explode(',', env('HUBJUTSU_SUPER_ADMIN_MAILDOMAINS', 'alexander-herzog.at,ongema.com')),
];