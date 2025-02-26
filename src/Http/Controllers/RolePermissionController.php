<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\RolePermission;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

 use Inertia\Response;
 use Inertia\Inertia;

class RolePermissionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('RolePermission/Index', [
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('RolePermission/Create', [
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $rolepermission = new RolePermission();
        
        /*
        $rolepermission->fill($request->validate([
        ]));
        */
        $rolepermission->fill($request->only($rolepermission->getFillable()));
        $rolepermission->save();

        return redirect()->route('rolepermissions.show', $rolepermission);

    }

    /**
     * Display the specified resource.
     */
    public function show(RolePermission $rolepermission)
    {
        return Inertia::render('RolePermission/View', [
            'RolePermission' => $rolepermission
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(RolePermission $rolepermission)
    {
        return Inertia::render('RolePermission/Edit', [
            'RolePermission' => $rolepermission
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, RolePermission $rolepermission)
    {
        /*
        $rolepermission->fill($request->validate([
        ]));
        */
        $rolepermission->fill($request->only($rolepermission->getFillable()));
        $rolepermission->save();

        return redirect()->route('rolepermissions.show', $rolepermission);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(RolePermission $rolepermission)
    {
        $rolepermission->delete();
        return redirect()->route('rolepermissions.index');
    }
}
