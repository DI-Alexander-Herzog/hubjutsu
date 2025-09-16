<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Base;

class Role extends Base
{
    use HasFactory, UserTrait; //HasTimestamp

    protected $fillable = [
        'name', 
    ];

    protected $casts = [];

    protected $appends = [];

    protected $with = [];

}
