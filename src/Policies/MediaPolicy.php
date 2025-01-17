<?php

namespace AHerzog\Hubjutsu\Policies;

use App\Models\Media;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class MediaPolicy
{
    public function attach(User $user, Media $media): bool
    {
        // is already attached
        if ($media->mediable_id) return false;
        // no user
        if (!$media->user_id) return true;
        // same user
        return $user->id == $media->user_id;
    }
    
    public function access(User $user, Media $media, Model $model) {
        // is already attached
        if ($media->mediable_id == $model->getKey() && $media->mediable_type == get_class($model)) return true;
        
        return $user->id == $media->user_id;
    }
}
