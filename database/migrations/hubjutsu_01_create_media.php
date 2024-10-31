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
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->user();

            $table->string('name');
            $table->text('description');
            $table->json('tags')->nullable();
            $table->string('storage', 128)->nullable();
            $table->string('filename', 512)->nullable();
            
            $table->boolean('private')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
