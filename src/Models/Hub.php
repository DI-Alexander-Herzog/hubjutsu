<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\DTO\Colors;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Base;

class Hub extends Base
{
    use HasFactory; //HasTimestamp

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'name',
        'slug',
        'url',
        'primary',
        'app_id',
        'color_primary',
        'color_primary_text',
        'color_secondary',
        'color_secondary_text',
        'color_tertiary',
        'color_tertiary_text',
        'color_text',
        'color_background',
        'has_darkmode',
        'enable_registration',
        'enable_guestmode',
        'font_sans',
        'font_serif',
        'font_mono',
        'font_header',
        'font_text',
        'font_import',
    ];

    protected $casts = [
        'has_darkmode' => 'boolean',
        'enable_registration' => 'boolean',
        'enable_guestmode' => 'boolean',
    ];

    protected $appends = [];

    protected $with = [];


    public static function appColors(?Colors $colors=null) {
        if (!$colors) {
            $colors = new Colors();
        }
        return self::getColors($colors);
    }



    protected static function getColors(Colors $baseColors) { 
        return (object) [
            'lightColors' => self::generateTheme($baseColors, 'light'),
            'darkColors' => self::generateTheme($baseColors, 'dark')
        ];
    }

    // Farbmanipulations-Funktionen
    protected static function lightenColor($hex, $percent) {
        if ($percent < 0) {
            return self::darkenColor($hex, -$percent);
        }
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3)
            $hex = preg_replace('/(.)(.)(.)/', '$1$1$2$2$3$3', $hex);

        list($r, $g, $b) = [
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2))
        ];
        $r = round($r + (255 - $r) * $percent);
        $g = round($g + (255 - $g) * $percent);
        $b = round($b + (255 - $b) * $percent);
        return sprintf("#%02X%02X%02X", $r, $g, $b);
    }

    protected static function darkenColor($hex, $percent) {
        if ($percent < 0) {
            return self::lightenColor($hex, -$percent);
        }
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3)
            $hex = preg_replace('/(.)(.)(.)/', '$1$1$2$2$3$3', $hex);
        list($r, $g, $b) = [
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2))
        ];
        $r = round($r * (1 - $percent));
        $g = round($g * (1 - $percent));
        $b = round($b * (1 - $percent));
        return sprintf("#%02X%02X%02X", $r, $g, $b);
    }

    protected static function getContrastColor($hex) {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3)
            $hex = preg_replace('/(.)(.)(.)/', '$1$1$2$2$3$3', $hex);
        list($r, $g, $b) = [
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2))
        ];
        $luminance = (0.299 * $r + 0.587 * $g + 0.114 * $b) / 255;
        return ($luminance > 0.5) ? '#000000' : '#FFFFFF';
    }

    // Elevation generieren basierend auf Surface
    protected static function generateElevation($surface, $theme = 'light') {
        $levels = [];
        $levels['level0'] = 'transparent';
        if ($theme === 'light') {
            $levels['level1'] = self::darkenColor($surface, 0.03);
            $levels['level2'] = self::darkenColor($surface, 0.05);
            $levels['level3'] = self::darkenColor($surface, 0.07);
            $levels['level4'] = self::darkenColor($surface, 0.09);
            $levels['level5'] = self::darkenColor($surface, 0.11);
        } else {
            $levels['level1'] = self::lightenColor($surface, 0.03);
            $levels['level2'] = self::lightenColor($surface, 0.05);
            $levels['level3'] = self::lightenColor($surface, 0.07);
            $levels['level4'] = self::lightenColor($surface, 0.09);
            $levels['level5'] = self::lightenColor($surface, 0.11);
        }
        return $levels;
    }

    // Theme-Generierung: Für Light-Theme bleiben die Basiswerte, für Dark-Theme tauschen wir Textfarben (primary, secondary, tertiary) aus.
    protected static function generateTheme(Colors $baseColors, $theme = 'light') {
        if ($theme === 'light') {
            // Verwende die Basiswerte direkt:
            $p  = $baseColors->primary;
            $op = $baseColors->onPrimary;
            $s  = $baseColors->secondary;
            $os = $baseColors->onSecondary;
            $t  = $baseColors->tertiary;
            $ot = $baseColors->onTertiary;
            $e  = $baseColors->error;
            $oe = $baseColors->onError;
        } else { // dark theme: Swap!
            $p  = $baseColors->onPrimary;
            $op = $baseColors->primary;
            $s  = $baseColors->onSecondary;
            $os = $baseColors->secondary;
            $t  = $baseColors->onTertiary;
            $ot = $baseColors->tertiary;
            // Error-Farben bleiben hier unverändert – typischerweise nicht geswappt.
            $e  = $baseColors->error;
            $oe = $baseColors->onError;
        }
        
        // Container: Ableitung aus der definierten Textfarbe.
        $primaryContainer   = ($theme === 'light') ? self::lightenColor($p, 0.5) : self::darkenColor($p, 0.5);
        $secondaryContainer = ($theme === 'light') ? self::lightenColor($s, 0.5) : self::darkenColor($s, 0.5);
        $tertiaryContainer  = ($theme === 'light') ? self::lightenColor($t, 0.5) : self::darkenColor($t, 0.5);
        $errorContainer     = ($theme === 'light') ? self::lightenColor($e, 0.5) : self::darkenColor($e, 0.5);
        
        // Surface, Backdrop, Outline: Ableitung basierend auf primärer Farbe
        $surface  = ($theme === 'light') ? self::lightenColor($p, 0.9) : self::darkenColor($p, 0.9);
        $backdrop = ($theme === 'light') ? self::lightenColor($p, 0.8) : self::darkenColor($p, 0.8);
        $outline  = ($theme === 'light') ? self::lightenColor($p, 0.6) : self::darkenColor($p, 0.6);
        
        $surfaceVariant = ($theme === 'light') ? self::lightenColor($p, 0.8) : self::darkenColor($p, 0.8);

        // Elevation
        $elevation = self::generateElevation($surface, $theme);
        
        return [
            'primary'               => $p,
            'onPrimary'             => $op,
            'primaryContainer'      => $primaryContainer,
            'onPrimaryContainer'    => self::getContrastColor($primaryContainer),
            
            'secondary'             => $s,
            'onSecondary'           => $os,
            'secondaryContainer'    => $secondaryContainer,
            'onSecondaryContainer'  => self::getContrastColor($secondaryContainer),
            
            'tertiary'              => $t,
            'onTertiary'            => $ot,
            'tertiaryContainer'     => $tertiaryContainer,
            'onTertiaryContainer'   => self::getContrastColor($tertiaryContainer),
            
            'error'                 => $e,
            'onError'               => $oe,
            'errorContainer'        => $errorContainer,
            'onErrorContainer'      => self::getContrastColor($errorContainer),
            
            'surface'               => $surface,
            'onSurface'             => self::getContrastColor($surface),
            
            'backdrop'              => $backdrop,
            'onBackdrop'            => self::getContrastColor($backdrop),
            
            'outline'               => $outline,
            
            'elevation'             => $elevation,


            'surfaceVariant'        => $surfaceVariant,
            'onSurfaceVariant'      => self::getContrastColor($surfaceVariant),

            'background'            => $surface,
            'onBackground'          => $surface,
            
            'surfaceDisabled'       => $surface,
            'onSurfaceDisabled'     => $surface,

            'outlineVariant'        => $surface,

            'inversePrimary'        => $surface,

            'inverseSurface'        => $surface,
            'inverseOnSurface'      => $surface,
            
            'shadow'                => $surface,

            'scrim'                 => $surface,
        ];
    }

    public function cssVars(): string
    {

        $out = '';

        if ($this->font_import) {
            $out .= "@import url('" . $this->font_import . "');\n\n";
        }


        $out .= ":root{\n";

        if ($this->font_size_root) {
            $out .= "font-size: " . $this->font_size_root . ";\n\n";
        }

        $out .= '--font-sans: "'.$this->font_sans.'";' . "\n";
        $out .= '--font-serif: "'.$this->font_serif.'";' . "\n";
        $out .= '--font-mono: "'.$this->font_mono.'";' . "\n";
        $out .= '--font-header: "'.$this->font_header.'";' . "\n";
        $out .= '--font-text: "'.$this->font_text.'";' . "\n";

        $out .= $this->shadeVars('text', $this->color_text) . "\n";
        $out .= $this->shadeVars('primary', $this->color_primary) . "\n";
        $out .= $this->shadeVars('onprimary', $this->color_primary_text) . "\n";
        $out .= $this->shadeVars('secondary', $this->color_secondary) . "\n";
        $out .= $this->shadeVars('onsecondary', $this->color_secondary_text) . "\n";
        $out .= $this->shadeVars('tertiary', $this->color_tertiary) . "\n";
        $out .= $this->shadeVars('ontertiary', $this->color_tertiary_text) . "\n";

        $out .= $this->shadeVars('background', $this->color_background) . "\n";
        $out .= $this->shadeVars('onbackground', $this->color_text) . "\n";
        
        $out .= "}\n";
        return $out;
    }

    protected function adjust(string $hex, float $amount): array
    {
        [$r,$g,$b] = sscanf($hex, "#%02x%02x%02x");
        if ($amount > 0) {
            $t = $amount / 100;
            $r = (1-$t)*$r + $t*255;
            $g = (1-$t)*$g + $t*255;
            $b = (1-$t)*$b + $t*255;
        } else {
            $t = -$amount / 100;
            $r = (1-$t)*$r;
            $g = (1-$t)*$g;
            $b = (1-$t)*$b;
        }
        return [round($r), round($g), round($b)];
    }

    protected function shadeVars(string $name, string $hex): string
    {
        $steps = [0,90,80,60,40,20,0,-10,-20,-30,-40,-50];
        $suf   = ['',50,100,200,300,400,500,600,700,800,900,950];

        $out = [];
        foreach ($steps as $i => $amt) {
            [$r,$g,$b] = $this->adjust($hex, $amt);
            $key = "--color-{$name}" . ($suf[$i] !== '' ? "-{$suf[$i]}" : '');
            $out[] = "{$key}: {$r} {$g} {$b};";
        }
        return implode("\n", $out);
    }


}
