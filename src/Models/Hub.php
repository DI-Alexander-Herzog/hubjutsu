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

}
