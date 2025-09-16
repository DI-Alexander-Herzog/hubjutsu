<?php
namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Hub;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller {

    protected function getSettingEntries() {
        return [
            [
                'label' => __('General'),
                'settings' => [
                    [
                        'label' => __('Hubs'),
                        'description' => __('Manage Hubs and assign users to them.'),
                        'icon' => 'folder',
                        'href' => route('admin.hubs.index'),
                        'color' => 'primary',
                        'initials' => 'H',
                        'subtitle' => sprintf(__('%d hubs'), Hub::count()),
                    ],
                    [
                        'label' => __('Users'),
                        'description' => __('Manage users and their roles.'),
                        'icon' => 'users',
                        'href' => route('admin.users.index'),
                        'color' => 'secondary',
                        'initials' => 'U',
                        'subtitle' => sprintf(__('%d users'), User::count()),
                    ],
                    [
                        'label' => __('Roles'),
                        'description' => __('Manage roles and their permissions.'),
                        'icon' => 'shield-check',
                        'href' => route('admin.roles.index'),
                        'color' => 'tertiary',
                        'initials' => 'R',
                        'subtitle' => sprintf(__('%d roles'), Role::count()),
                    ]
                ]
            ]
        ];
    }

    public function index(Request $request) {
        return Inertia::render('Settings/Index', [
            'settings' => $this->getSettingEntries()
        ]);
    }
}