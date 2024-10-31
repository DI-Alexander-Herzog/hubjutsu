<?php

namespace AHerzog\Hubjutsu\Database;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class HubjutsuSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->seedUsers();        
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
