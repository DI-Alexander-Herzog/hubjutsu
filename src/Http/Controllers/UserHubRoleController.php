<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\UserHubRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

 use Inertia\Response;
 use Inertia\Inertia;

class UserHubRoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('UserHubRole/Index', [
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('UserHubRole/Create', [
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $userhubrole = new UserHubRole();
        
        /*
        $userhubrole->fill($request->validate([
        ]));
        */
        $userhubrole->fill($request->only($userhubrole->getFillable()));
        $userhubrole->save();

        return redirect()->route('userhubroles.show', $userhubrole);

    }

    /**
     * Display the specified resource.
     */
    public function show(UserHubRole $userhubrole)
    {
        return Inertia::render('UserHubRole/View', [
            'UserHubRole' => $userhubrole
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(UserHubRole $userhubrole)
    {
        return Inertia::render('UserHubRole/Edit', [
            'UserHubRole' => $userhubrole
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, UserHubRole $userhubrole)
    {
        /*
        $userhubrole->fill($request->validate([
        ]));
        */
        $userhubrole->fill($request->only($userhubrole->getFillable()));
        $userhubrole->save();

        return redirect()->route('userhubroles.show', $userhubrole);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(UserHubRole $userhubrole)
    {
        $userhubrole->delete();
        return redirect()->route('userhubroles.index');
    }
}
