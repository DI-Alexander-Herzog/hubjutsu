<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\MediaTrait;
use App\Models\Base;
use App\Models\LearningCourseUserProgress;
use App\Models\LearningLectionUserProgress;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use App\Models\Hub;
use App\Models\Role;

use Illuminate\Auth\Authenticatable;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\Access\Authorizable as AuthorizableContract;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\Access\Authorizable;

class User extends Base implements 
    MustVerifyEmail, 
    AuthenticatableContract,
    AuthorizableContract,
    CanResetPasswordContract
{
    use Authenticatable, Authorizable, CanResetPassword;
    use HasFactory, Notifiable, HasApiTokens, MustVerifyEmailTrait, MediaTrait;


    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'email_verified_at'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $with = [
        'avatar'
    ];
    
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }



    public static function boot()
    {
        parent::boot();

        static::creating(function ($user) {
            if (!$user->password) {
                $user->password = env('ADMIN_PASSWORD', base64_encode(random_bytes(16)));
            }
        });

        static::created(function (User $user) {
            Hub::query()
                ->whereNotNull('role_id')
                ->with('defaultRole')
                ->get()
                ->each(function (Hub $hub) use ($user) {
                    $role = $hub->defaultRole;
                    if (!$role instanceof Role) {
                        return;
                    }

                    $hub->assignRole($user, $role);
                });
        });
    }
    
    /** 
     * @return Media
     */
    public function avatar(): MorphOne
    {
        return $this->media('avatar');
    }
    public function setAvatar(Media $media) {
        $this->setMedia($media, 'avatar', 1);
    }

    public function learningCourseProgress(): HasMany
    {
        return $this->hasMany(LearningCourseUserProgress::class, 'user_id');
    }

    public function learningLectionProgress(): HasMany
    {
        return $this->hasMany(LearningLectionUserProgress::class, 'user_id');
    }

    
}
