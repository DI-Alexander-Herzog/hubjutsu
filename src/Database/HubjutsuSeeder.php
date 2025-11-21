<?php

namespace AHerzog\Hubjutsu\Database;

use App\Models\Hub;
use App\Models\Media;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Str;

class HubjutsuSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->seedHubs();
        $this->seedUsers();  
    }

    public function defaultHubsettings() {
        return [
            'color_primary' => '#F39200',
            'color_primary_text' => '#FFFFFF',
            'color_secondary' => '#F39200',
            'color_secondary_text' => '#FFFFFF',
            'color_tertiary' => '#F39200',
            'color_tertiary_text' => '#FFFFFF',
            'color_text' => '#000000',
            'color_background' => '#FFFFFF',
            'has_darkmode' => true,
            'enable_registration' => true,
            'enable_guestmode' => true,
            'font_sans' => 'Noto Sans',
            'font_serif' => 'Noto Serif',
            'font_mono' => 'Noto Sans Mono',
            'font_header' => 'Noto Serif',
            'font_text' => 'Noto Sans',
            'font_import' => "https://fonts.bunny.net/css?family=noto-sans:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i|noto-sans-mono:100,200,300,400,500,600,700,800,900|noto-serif:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i",
        ];
    }
    public function defaultLogo() {
        return Media::fromUrl('https://alexander-herzog.at/wp-content/uploads/2022/08/full_color_512x.png');
    }
    public function defaultBrandImage() {
        return Media::fromUrl('https://alexander-herzog.at/wp-content/uploads/2022/08/full_color_512x.png');
    }

    public function seedHubs() {
        $hub = Hub::updateOrCreate([
            'slug' => Str::slug(config('app.name')),
        ],
        array_merge([
                'name' => config('app.name'),
                'url' => url('/'),
                'primary' => true,
                'app_id' => implode('.', array_reverse(explode('.', parse_url(url('/'), PHP_URL_HOST)))) . '.app',
            ],
            $this->defaultHubsettings()
        ));

        $hub->setLogo($this->defaultLogo());
        $hub->setBrandImage($this->defaultBrandImage());
    
    }

    public function initialUsers() {
        return [
            [
                'name' => 'Alexander Herzog',
                'email' => 'alexander@alexander-herzog.at',
            ],
            [
                'name' => 'Techsupport',
                'email' => 'techsupport@ongema.com',
            ],
            [
                'name' => 'Anja Duong',
                'email' => 'anja@alexander-herzog.at'
            ]
        ];
    }

    public function seedUsers(): void
    {
        $password = env('ADMIN_PASSWORD', base64_encode(random_bytes(16)));
        $this->command->info('Seeding Users with default password: ' . $password);

        $users = $this->initialUsers();

        foreach($users as $user) {
            $this->command->line('- ' . $user['name'] . ' (' . $user['email'] . ')');
            User::updateOrCreate([
                'email' => $user['email']
            ], [
                'name' => $user['name'],
                'password' => Hash::make($password),
                'email_verified_at' => now()
            ]);
        }

    }

}
