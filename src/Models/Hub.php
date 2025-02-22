<?php

namespace AHerzog\Hubjutsu\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use AHerzog\Hubjutsu\Models\Base;

class Hub extends Base
{
    use HasFactory; //HasTimestamp

    protected $fillable = [];

    protected $casts = [];

    protected $appends = [];

    protected $with = [];

}
