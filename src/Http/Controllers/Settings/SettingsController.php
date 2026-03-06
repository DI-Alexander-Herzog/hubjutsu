<?php
namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Services\HubManager;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Hub;
use App\Models\LearningBundle;
use App\Models\LearningCourse;
use App\Models\LearningLection;
use App\Models\LearningModule;
use App\Models\LearningSection;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller {

    protected function getSettingEntries() {
        $generalSettings = [
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
            ],
        ];

        if ($this->canAccessLogViewer()) {
            $generalSettings[] = [
                'label' => __('Log Viewer'),
                'description' => __('Inspect application logs.'),
                'icon' => 'document-text',
                'href' => route('log-viewer.index'),
                'external' => true,
                'target' => '_blank',
                'color' => 'primary',
                'initials' => 'LV',
                'subtitle' => __('System logs'),
            ];
        }

        return [
            [
                'label' => __('General'),
                'settings' => $generalSettings,
            ],
            [
                'label' => __('LMS'),
                'settings' => [
                    [
                        'label' => __('Learning Bundles'),
                        'description' => __('Manage learning bundles.'),
                        'icon' => 'book-open',
                        'href' => route('settings.learningbundles.index'),
                        'color' => 'primary',
                        'initials' => 'LB',
                        'subtitle' => sprintf(__('%d bundles'), LearningBundle::count()),
                    ],
                    [
                        'label' => __('Learning Courses'),
                        'description' => __('Manage learning courses.'),
                        'icon' => 'academic-cap',
                        'href' => route('settings.learningcourses.index'),
                        'color' => 'secondary',
                        'initials' => 'LC',
                        'subtitle' => sprintf(__('%d courses'), LearningCourse::count()),
                    ]
                ],
            ]
        ];
    }

    protected function canAccessLogViewer(): bool
    {
        if (!Route::has('log-viewer.index')) {
            return false;
        }

        $user = Auth::user();
        if (!$user instanceof User) {
            return false;
        }

        $domain = preg_replace('/^.*@/', '', (string) $user->email);
        if (in_array($domain, config('hubjutsu.super_admin_maildomains'), true)) {
            return true;
        }

        $hub = app(HubManager::class)->current();

        return RolePermission::query()
            ->where('permission', 'admin::admin')
            ->whereHas('role.roleAssignments', function ($query) use ($user, $hub) {
                $query->where('user_id', $user->id)
                    ->where('scope_type', $hub->getMorphClass())
                    ->where('scope_id', $hub->getKey());
            })
            ->exists();
    }

    public function index(Request $request) {
        return Inertia::render('Settings/Index', [
            'settings' => $this->getSettingEntries()
        ]);
    }
}
