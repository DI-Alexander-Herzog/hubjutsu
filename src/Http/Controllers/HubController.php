<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\Hub;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

 use Inertia\Response;
 use Inertia\Inertia;

class HubController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('Hub/Index', [
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Hub/Create', [
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $hub = new Hub();
        
        /*
        $hub->fill($request->validate([
        ]));
        */
        $hub->fill($request->only($hub->getFillable()));
        $hub->save();

        return redirect()->route('hubs.show', $hub);

    }

    /**
     * Display the specified resource.
     */
    public function show(Hub $hub)
    {
        return Inertia::render('Hub/View', [
            'hubEntry' => $hub
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Hub $hub)
    {
        return Inertia::render('Hub/Edit', [
            'hubEntry' => $hub
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Hub $hub)
    {
        /*
        $hub->fill($request->validate([
        ]));
        */
        $hub->fill($request->only($hub->getFillable()));
        $hub->save();

        return redirect()->route('hubs.show', $hub);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Hub $hub)
    {
        $hub->delete();
        return redirect()->route('hubs.index');
    }
}
