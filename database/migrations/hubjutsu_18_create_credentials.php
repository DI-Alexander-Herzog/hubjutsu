<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('credentials', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->softDeletes();
            $table->user();

            $table->string('name');
            $table->string('type', 64);
            $table->string('provider', 128)->nullable();
            $table->string('status', 32)->default('active');

            $table->json('public_data')->nullable();
            $table->text('secret_data')->nullable();
            $table->json('meta')->nullable();

            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('valid_until')->nullable();

            $table->string('credentialable_type')->nullable();
            $table->unsignedBigInteger('credentialable_id')->nullable();

            $table->index(['type', 'status'], 'credentials_type_status_idx');
            $table->index(['credentialable_type', 'credentialable_id'], 'credentialable_ref');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credentials');
    }
};
