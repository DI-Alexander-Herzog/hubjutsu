<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use App\Models\Hub;



return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('hubs', function (Blueprint $table) {
            $table->string('font_sans')->nullable();
            $table->string('font_serif')->nullable();
            $table->string('font_mono')->nullable();
            $table->string('font_header')->nullable();
            $table->string('font_text')->nullable();
            $table->string('font_import')->nullable();
            $table->string('font_size_root')->nullable();
        });

        
        Hub::query()->update([
            'font_sans'   => 'Barlow Condensed',
            'font_serif'  => 'Philosopher',
            'font_mono'   => 'ui-monospace',
            'font_header' => 'Philosopher',
            'font_text'   => 'Barlow Condensed',
            'font_import' => "https://fonts.googleapis.com/css2?family=Philosopher&family=Barlow+Condensed:wght@400;700&display=swap",
            'font_size_root' => '1.15em',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hubs', function (Blueprint $table) {
            $table->dropColumn('font_sans');
            $table->dropColumn('font_serif');
            $table->dropColumn('font_mono');
            $table->dropColumn('font_header');
            $table->dropColumn('font_text');
            $table->dropColumn('font_import');
            $table->dropColumn('font_size_root');
        });
    }
};
