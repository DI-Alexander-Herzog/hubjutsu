<?php

use App\Models\LearningBundle;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_bundle_role', function (Blueprint $table) {
            $table->id();
            $table->timestamps();

            $table->foreignId('learning_bundle_id')
                ->constrained('learning_bundles')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('role_id')
                ->constrained('roles')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->unique(['learning_bundle_id', 'role_id'], 'learning_bundle_role_unique');
        });

        if (!Schema::hasTable('role_assignments')) {
            return;
        }

        $bundleMorphs = array_values(array_unique([
            (new LearningBundle())->getMorphClass(),
            LearningBundle::class,
            \AHerzog\Hubjutsu\Models\LearningBundle::class,
        ]));

        $existing = DB::table('role_assignments')
            ->select(['scope_id as learning_bundle_id', 'role_id'])
            ->whereIn('scope_type', $bundleMorphs)
            ->whereNotNull('scope_id')
            ->whereNotNull('role_id')
            ->groupBy('scope_id', 'role_id')
            ->get();

        if ($existing->isEmpty()) {
            return;
        }

        $now = now();
        $payload = $existing
            ->map(fn ($row) => [
                'learning_bundle_id' => intval($row->learning_bundle_id),
                'role_id' => intval($row->role_id),
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->all();

        DB::table('learning_bundle_role')->upsert(
            $payload,
            ['learning_bundle_id', 'role_id'],
            ['updated_at']
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_bundle_role');
    }
};
