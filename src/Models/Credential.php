<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use App\Services\CredentialDisplayService;
use Illuminate\Database\Eloquent\Concerns\HasTimestamps;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @property int $id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property string $name
 * @property string $type
 * @property string|null $provider
 * @property string $status
 * @property array<array-key, mixed>|null $public_data
 * @property array<array-key, mixed>|null $secret_data
 * @property array<array-key, mixed>|null $meta
 * @property \Illuminate\Support\Carbon|null $last_used_at
 * @property \Illuminate\Support\Carbon|null $valid_until
 * @property string|null $credentialable_type
 * @property int|null $credentialable_id
 * @property-read bool $has_secret_data
 * @property-read array<array-key, mixed>|null $secret_data_preview
 * @property-read string $public_data_summary
 * @property-read string|null $credentialable_summary
 * @property-read \Illuminate\Database\Eloquent\Model|\Eloquent|null $credentialable
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential query()
 * @method static Builder<static>|Credential search($term)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereCredentialableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereCredentialableType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereValidUntil($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereLastUsedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereMeta($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential wherePublicData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereSecretData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential whereUpdatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Credential withoutTrashed()
 * @mixin \Eloquent
 */
class Credential extends Base
{
    use UserTrait, HasTimestamps, SoftDeletes;

    public const TYPE_APP = 'app';
    public const TYPE_API_KEY = 'api_key';
    public const TYPE_BASIC_AUTH = 'basic_auth';
    public const TYPE_OAUTH2 = 'oauth2';
    public const TYPE_SSH_KEY = 'ssh_key';
    public const TYPE_FTP_BASIC = 'ftp_basic';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_REVOKED = 'revoked';
    public const STATUS_INVALID = 'invalid';

    protected $fillable = [
        'name',
        'type',
        'provider',
        'status',
        'public_data',
        'secret_data',
        'meta',
        'last_used_at',
        'valid_until',
        'credentialable_type',
        'credentialable_id',
    ];

    protected $casts = [
        'public_data' => 'array',
        'secret_data' => 'encrypted:array',
        'meta' => 'array',
        'last_used_at' => 'datetime',
        'valid_until' => 'datetime',
    ];

    protected $appends = [
        'has_secret_data',
        'secret_data_preview',
        'public_data_summary',
        'credentialable_summary',
    ];

    protected $hidden = [
        'secret_data',
    ];

    public static function getTypes(): array
    {
        return [
            self::TYPE_APP => 'App',
            self::TYPE_API_KEY => 'API Key',
            self::TYPE_BASIC_AUTH => 'Basic Auth',
            self::TYPE_OAUTH2 => 'OAuth2',
            self::TYPE_SSH_KEY => 'SSH Key',
            self::TYPE_FTP_BASIC => 'FTP Basic',
        ];
    }

    public static function getStatuses(): array
    {
        return [
            self::STATUS_ACTIVE,
            self::STATUS_EXPIRED,
            self::STATUS_REVOKED,
            self::STATUS_INVALID,
        ];
    }

    public static function getRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(array_keys(self::getTypes()))],
            'provider' => ['nullable', 'string', 'max:128'],
            'status' => ['nullable', 'string', Rule::in(self::getStatuses())],
            'public_data' => ['nullable', 'array'],
            'secret_data' => ['nullable', 'array'],
            'meta' => ['nullable', 'array'],
            'last_used_at' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'credentialable_type' => ['nullable', 'string', 'max:255'],
            'credentialable_id' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function prepareForApi(Request $request)
    {
        parent::prepareForApi($request);

        if ($request->boolean('include_secret_data')) {
            $this->setAttribute('secret_data_revealed', $this->displayService()->normalizeSecretData($this->secret_data));
        } else {
            unset($this->attributes['secret_data_revealed']);
        }

        return $this;
    }

    public function credentialable()
    {
        return $this->morphTo();
    }

    public function getHasSecretDataAttribute(): bool
    {
        $normalized = $this->displayService()->normalizeSecretData($this->secret_data);
        return count($normalized) > 0;
    }

    public function getSecretDataPreviewAttribute(): ?array
    {
        $normalized = $this->displayService()->normalizeSecretData($this->secret_data);
        if (count($normalized) === 0) {
            return null;
        }

        return $this->displayService()->maskSecretData($normalized);
    }

    public function getPublicDataSummaryAttribute(): string
    {
        return $this->displayService()->summarizePublicData($this);
    }

    public function getCredentialableSummaryAttribute(): ?string
    {
        return $this->displayService()->summarizeCredentialable($this);
    }

    protected function displayService(): CredentialDisplayService
    {
        return app(CredentialDisplayService::class);
    }
}
