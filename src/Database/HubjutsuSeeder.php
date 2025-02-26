<?php

namespace AHerzog\Hubjutsu\Database;

use App\Models\Hub;
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

    public function seedHubs() {
        Hub::create([
            'name' => config('app.name'),
            'slug' => Str::slug(config('app.name')),
            'url' => url('/'),
            'primary' => true,
            'app_id' => implode('.', array_reverse(explode('.', parse_url(url('/'), PHP_URL_HOST)))) . '.app',
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
            'enable_guestmode' => true
        ]);
    }

    public function seedUsers(): void
    {
        $password = env('ADMIN_PASSWORD', base64_encode(random_bytes(16)));
        $this->command->info('Seeding Users with default password: ' . $password);

        $users = [
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
