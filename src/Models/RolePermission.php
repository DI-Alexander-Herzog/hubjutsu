<?php

namespace AHerzog\Hubjutsu\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Base;

class RolePermission extends Base
{
    use HasFactory; //HasTimestamp

    protected $fillable = [
        'role_id', 
        'permission'
    ];

    protected $casts = [];

    protected $appends = [];

    protected $with = [];


    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id', 'id');
    }

}
