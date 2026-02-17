<?php
use Illuminate\Support\Facades\Schedule;

Schedule::command('queue:work --stop-when-empty --tries=3 --timeout=1800')
    ->everyMinute()
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/queue.log'));

Schedule::command('hubjutsu:recordings:cleanup --days=3')
    ->dailyAt('03:30')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/recordings-cleanup.log'));
