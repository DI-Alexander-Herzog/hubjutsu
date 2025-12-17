<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Base;
use App\Models\RolePermission;

class Role extends Base
{
    use HasFactory, UserTrait; //HasTimestamp

    protected $fillable = [
        'name', 
    ];

    protected $casts = [];

    protected $appends = [];

    protected $with = [];

    public function permissions()
    {
        return $this->hasMany(RolePermission::class);
    }

    public function roleAssignments()
    {
        return $this->hasMany(\App\Models\RoleAssignment::class, 'role_id', 'id');
    }

}
