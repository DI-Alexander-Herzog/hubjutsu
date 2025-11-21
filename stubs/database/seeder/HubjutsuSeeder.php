<?php

namespace Database\Seeders;


class HubjutsuSeeder extends \AHerzog\Hubjutsu\Database\HubjutsuSeeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        parent::run();
    }


    public function defaultHubsettings() {
        $arr = parent::defaultHubsettings();
        return $arr;
    }
    public function defaultLogo() {
        return parent::defaultLogo();
    }
    public function defaultBrandImage() {
        return parent::defaultBrandImage();
    }

    public function initialUsers() {
        $users = parent::initialUsers();
        $users[] = [
            'name' => 'Admin',
            'email' => 'admin@'.parse_url(url('/'), PHP_URL_HOST),
        ];
        return $users;
    }


}
