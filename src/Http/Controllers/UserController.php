<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

 use Inertia\Response;
 use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('User/Index', [
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('User/Create', [
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $User = new User();
        
        /*
        $User->fill($request->validate([
        ]));
        */
        $User->fill($request->only($User->getFillable()));
        $User->save();

        return redirect()->route('Users.show', $User);

    }

    /**
     * Display the specified resource.
     */
    public function show(User $User)
    {
        return Inertia::render('User/View', [
            'User' => $User
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $User)
    {
        return Inertia::render('User/Edit', [
            'User' => $User
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $User)
    {
        /*
        $User->fill($request->validate([
        ]));
        */
        $User->fill($request->only($User->getFillable()));
        $User->save();

        return redirect()->route('Users.show', $User);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $User)
    {
        $User->delete();
        return redirect()->route('Users.index');
    }
}
