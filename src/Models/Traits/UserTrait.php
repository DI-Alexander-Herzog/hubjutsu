<?php


namespace  AHerzog\Hubjutsu\Models\Traits;

use Auth;

trait UserTrait {
    public static function bootUserTrait() {
        static::creating(function ($model) {
            $model->created_by = Auth::id();
            $model->updated_by = Auth::id();
        });

        static::updating(function ($model) {
            $model->updated_by = Auth::id();
        });
    }
}
