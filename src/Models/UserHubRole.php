<?php

namespace AHerzog\Hubjutsu\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Base;

class UserHubRole extends Base
{
    use HasFactory; //HasTimestamp

    protected $fillable = [
        'user_id', 
        'hub_id', 
        'role_id'
    ];

    protected $casts = [];

    protected $appends = [];

    protected $with = [];


    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id', 'id');
    }
    public function hub()
    {
        return $this->belongsTo(\App\Models\Hub::class, 'hub_id', 'id');
    }
    public function role()
    {
        return $this->belongsTo(\App\Models\Role::class, 'role_id', 'id');
    }

}
