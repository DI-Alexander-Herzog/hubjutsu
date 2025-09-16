<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use AHerzog\Hubjutsu\App\Auth\Permission;
use App\Models\Role;
use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use Illuminate\Http\Request;

 use Inertia\Response;
 use Inertia\Inertia;
use phpDocumentor\Reflection\DocBlock\Tags\Var_;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('Role/Index', [
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Role/Create', [
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $role = new Role();
        
        /*
        $role->fill($request->validate([
        ]));
        */
        $role->fill($request->only($role->getFillable()));
        $role->save();

        return redirect()->route('admin.roles.show', $role);

    }

    /**
     * Display the specified resource.
     */
    public function show(Role $role)
    {
        $role->load('permissions');

        return Inertia::render('Role/View', [
            'role' => $role,
            'permissions' => Permission::getPermissionTable()
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Role $role)
    {
        $role->load('permissions');

        return Inertia::render('Role/Edit', [
            'role' => $role,
            'permissions' => Permission::getPermissionTable()
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Role $role)
    {
        /*
        $role->fill($request->validate([
        ]));
        */

        $permission = $request->get('permissions', []);
        
        $role->fill($request->only($role->getFillable()));
        $role->save();

        $exisitngPermissions = $role->permissions()->pluck('permission', 'id')->toArray();
        foreach($exisitngPermissions as $id => $perm) {
            if (!in_array($perm, $permission)) {
                RolePermission::where('id', $id)->delete();
            } else {
                unset($permission[array_search($perm, $permission)]);
            }
        }
        foreach($permission as $perm) {
            $rp = new RolePermission();
            $rp->role_id = $role->id;
            $rp->permission = $perm;
            $rp->save();
        }
        

        return redirect()->route('admin.roles.show', $role);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Role $role)
    {
        $role->delete();
        return redirect()->route('admin.roles.index');
    }
}
