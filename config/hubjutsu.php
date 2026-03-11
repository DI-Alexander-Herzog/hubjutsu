<?php

return [
    'access_hubs_from_all_domains' => env('HUBJUTSU_ACCESS_HUBS_FROM_ALL_DOMAINS', false),
    'super_admin_maildomains' => explode(',', env('HUBJUTSU_SUPER_ADMIN_MAILDOMAINS', 'alexander-herzog.at,ongema.com')),
    'media_hls_script' => env('HUBJUTSU_MEDIA_HLS_SCRIPT'),
    'pdf' => [
        'options' => [
            'isPhpEnabled' => true,
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
            'isFontSubsettingEnabled' => true,
            'defaultFont' => 'DejaVu Sans',
            'fontDir' => storage_path('fonts'),
            'fontCache' => storage_path('fonts'),
            'tempDir' => storage_path('app/pdf'),
        ],
        'font_dir' => storage_path('fonts'),
        'font_cache' => storage_path('fonts'),
        'temp_dir' => storage_path('app/pdf'),
        'font_source' => base_path('vendor/dompdf/dompdf/lib/fonts'),
        'extra_fonts' => [],
        'sample_output' => storage_path('app/public/hubjutsu-offer.pdf'),
        'page_script' => [
            'x' => 520,
            'y' => 820,
            'font' => 'Helvetica',
            'size' => 10,
        ],
    ],
];
