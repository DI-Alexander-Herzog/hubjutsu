<?php


namespace AHerzog\Hubjutsu\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Nette\Utils\Arrays;

class Base extends Model {    

    // doesn't do anything, only used for laoding extra data
    /**
     * @param Request $request 
     * @return $this 
     */
    public function prepareForApi(Request $request)
    {
        $with = $request->get('with', []);
        foreach($with as $relation) {
            if (method_exists($this, $relation)) {
                $this->loadMissing($relation);
            }
        }
        return $this;
    }

}