<?php

namespace AHerzog\Hubjutsu\Http\Middleware;

<<<<<<< HEAD:packages/aherzog/hubjutsu/src/Http/Middleware/HandleInertiaRequests.php
class HandleInertiaRequests extends \AHerzog\Hubjutsu\Http\Middleware\HandleInertiaRequests
{
    
=======
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
        ];
    }
>>>>>>> 1f5f7c3 (Squashed 'packages/aherzog/hubjutsu/' changes from 20470ff..ec48f0c):src/Http/Middleware/HandleInertiaRequests.php
}
