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

            if (Auth::attempt($credentials)) {
                $user = Auth::user();
                $token = $user->createToken('API Token')->plainTextToken;
        
                return response()->json([
                    'token' => $token,
                    'user' => $user,
                ]);
            }
            throw new \Exception('User not found');

        } catch( \Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }
    }

    public function delete(Request $requeset) {
        $requeset->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Token deleted']);
    }
    
    public function deleteAll(Request $requeset) {
        $requeset->user()->tokens()->delete();
        return response()->json(['message' => 'All tokens deleted']);
    }

    public function list() {
        return response()->json(['tokens' => Auth::user()->tokens]);
    }

}