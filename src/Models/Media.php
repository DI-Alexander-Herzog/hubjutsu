<?php


namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use App\Models\Base;
use Illuminate\Database\Eloquent\Concerns\HasTimestamps;

class Media extends Base {
    use UserTrait, HasTimestamps;

}