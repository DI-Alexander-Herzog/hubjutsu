<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class RoleAssignment extends Base
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'role_id',
        'scope_type',
        'scope_id',
    ];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id', 'id');
    }

    public function role()
    {
        return $this->belongsTo(\App\Models\Role::class, 'role_id', 'id');
    }

    public function scope(): MorphTo
    {
        return $this->morphTo();
    }
}
