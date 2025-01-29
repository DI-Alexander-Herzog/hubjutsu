<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\Brand;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

 use Inertia\Response;
 use Inertia\Inertia;

class BrandController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('Brand/Index', [
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Brand/Create', [
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $brand = new Brand();
        
        /*
        $brand->fill($request->validate([
        ]));
        */
        $brand->fill($request->only($brand->getFillable()));
        $brand->save();

        return redirect()->route('brands.show', $brand);

    }

    /**
     * Display the specified resource.
     */
    public function show(Brand $brand)
    {
        return Inertia::render('Brand/View', [
            'Brand' => $brand
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Brand $brand)
    {
        return Inertia::render('Brand/Edit', [
            'Brand' => $brand
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Brand $brand)
    {
        /*
        $brand->fill($request->validate([
        ]));
        */
        $brand->fill($request->only($brand->getFillable()));
        $brand->save();

        return redirect()->route('brands.show', $brand);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Brand $brand)
    {
        $brand->delete();
        return redirect()->route('brands.index');
    }
}
