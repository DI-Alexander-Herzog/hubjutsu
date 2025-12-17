<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\RoleAssignment;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

 use Inertia\Response;
 use Inertia\Inertia;

class RoleAssignmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('RoleAssignment/Index', [
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('RoleAssignment/Create', [
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $roleAssignment = new RoleAssignment();
        
        /*
        $roleAssignment->fill($request->validate([
        ]));
        */
        $roleAssignment->fill($request->only($roleAssignment->getFillable()));
        $roleAssignment->save();

        return redirect()->route('admin.roleassignments.show', $roleAssignment);

    }

    /**
     * Display the specified resource.
     */
    public function show(RoleAssignment $roleAssignment)
    {
        return Inertia::render('RoleAssignment/View', [
            'roleAssignment' => $roleAssignment
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(RoleAssignment $roleAssignment)
    {
        return Inertia::render('RoleAssignment/Edit', [
            'roleAssignment' => $roleAssignment
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, RoleAssignment $roleAssignment)
    {
        /*
        $roleAssignment->fill($request->validate([
        ]));
        */
        $roleAssignment->fill($request->only($roleAssignment->getFillable()));
        $roleAssignment->save();

        return redirect()->route('admin.roleassignments.show', $roleAssignment);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(RoleAssignment $roleAssignment)
    {
        $roleAssignment->delete();
        return redirect()->route('admin.roleassignments.index');
    }
}
