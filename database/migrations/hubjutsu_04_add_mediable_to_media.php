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
        Schema::table('media', function (Blueprint $table) {
            $table->string('mediable_type')->nullable();
            $table->unsignedBigInteger('mediable_id')->nullable();
            $table->unsignedInteger('mediable_sort')->nullable();

            $table->string('category')->nullable();
            $table->index(['mediable_type', 'mediable_id'], 'mediable_ref');
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropIndex('mediable_ref');

            $table->dropColumn('mediable_type');
            $table->dropColumn('mediable_id');
            $table->dropColumn('mediable_sort');

            $table->dropColumn('category');
        });
    }
};
