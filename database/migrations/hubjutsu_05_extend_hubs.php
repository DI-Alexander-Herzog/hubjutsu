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
        Schema::table('hubs', function (Blueprint $table) {
            $table->string('color_primary')->nullable();
            $table->string('color_primary_text')->nullable();

            $table->string('color_secondary')->nullable();
            $table->string('color_secondary_text')->nullable();

            $table->string('color_tertiary')->nullable();
            $table->string('color_tertiary_text')->nullable();

            $table->string('color_text')->nullable();
            $table->string('color_background')->nullable();

            $table->boolean('has_darkmode')->default(true);
            $table->boolean('enable_registration')->default(false);
            $table->boolean('enable_guestmode')->default(false);
            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hubs', function (Blueprint $table) {
            $table->dropColumn('color_primary');
            $table->dropColumn('color_primary_text');
            $table->dropColumn('color_secondary');
            $table->dropColumn('color_secondary_text');
            $table->dropColumn('color_tertiary');
            $table->dropColumn('color_tertiary_text');
            $table->dropColumn('color_text');
            $table->dropColumn('color_background');
            $table->dropColumn('has_darkmode');
            $table->dropColumn('enable_registration');
            $table->dropColumn('enable_guestmode');
        });
    }
};
