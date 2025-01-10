<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Api;

use AHerzog\Hubjutsu\Models\Base;
use Exception;
use Gate;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Http\Request;
use Log;
use Str;
use Auth;

class HubjutsuApiTokenController
{
 
    public function create(Request $requeset) {
        
        try {
            $credentials = $requeset->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);
        } catch( \Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }
        
        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $token = $user->createToken('API Token')->plainTextToken;
    
            return response()->json([
                'token' => $token,
                'user' => $user,
            ]);
        }
        
        return response()->json(['error' => 'User not found...'], 401);
    }


}