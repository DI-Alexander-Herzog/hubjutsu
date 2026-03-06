<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningBundle;
use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningBundleRole extends Base
{
    use HasFactory;

    protected $table = 'learning_bundle_role';

    protected $fillable = [
        'learning_bundle_id',
        'role_id',
    ];

    protected $with = [
        'role',
    ];

    public static function getRules(): array
    {
        return [
            'learning_bundle_id' => ['required', 'integer', 'exists:learning_bundles,id'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ];
    }

    public function bundle(): BelongsTo
    {
        return $this->belongsTo(LearningBundle::class, 'learning_bundle_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}
