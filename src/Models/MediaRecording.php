<?php
namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;

class MediaRecording extends Base
{
    protected $fillable = [
        'uuid',
        'user_id',
        'upload_token_hash',
        'status',
        'last_chunk_index',
        'mp4_path',
        'processed_at',
        'error_message',
    ];
}
