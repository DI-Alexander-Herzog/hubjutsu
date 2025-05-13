<?php

namespace AHerzog\Hubjutsu\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Base;

class Role extends Base
{
    use HasFactory; //HasTimestamp

    protected $fillable = [];

    protected $casts = [];

    protected $appends = [];

    protected $with = [];

}
