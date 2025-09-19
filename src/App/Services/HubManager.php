<?php


namespace AHerzog\Hubjutsu\App\Services;

use App\Models\Hub;

class HubManager {

    private Hub $hub;

    public function __construct(\Illuminate\Http\Request $request) {
        
        if (app()->runningInConsole()) {
            $this->hub = Hub::where('primary', true)->firstOrFail();
        } else {
            $this->hub = Hub::where('primary', true)->orWhere('url', 'LIKE', '%'.$request->getHost().'%')->orderBy('primary', 'asc')->firstOrFail();
        }
    }

    public function current(): Hub {
        return $this->hub;
    }
    
}
