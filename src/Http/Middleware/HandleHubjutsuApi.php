<?php

namespace AHerzog\Hubjutsu\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Log;
use Redirect;
use Symfony\Component\HttpFoundation\Response;

class HandleHubjutsuApi
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $ret = $next($request);
            if ($ret instanceof RedirectResponse) {
                if ($ret->exception && $ret->exception->getMessage() == "Unauthenticated.") {
                    return response()->json([
                        'message' => $ret->exception->getMessage(),
                    ], 401);
                }
                return redirect($ret->getTargetUrl(), $ret->getStatusCode());
            }
            if(!$ret instanceof JsonResponse) {
                return response()->json([
                    'message' => 'Invalid response type',
                    'content' => $ret->getContent()
                ], 500);
            }
            if ($ret->exception) {               
                throw $ret->exception;
            }
            return $ret;
        } catch (\Throwable $e) {
            Log::error($e->getMessage());
            return response()->json([
                'message' => $e->getMessage(),
                'trace' => $e->getTrace(),
            ], 500);
        }
    }

    
}
