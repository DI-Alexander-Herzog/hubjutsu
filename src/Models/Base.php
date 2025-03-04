<?php


namespace AHerzog\Hubjutsu\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class Base extends Model {    

    // doesn't do anything, only used for laoding extra data
    /**
     * @param Request $request 
     * @return $this 
     */
    public function prepareForApi(Request $request)
    {
        // prepares
        return $this;
    }

}