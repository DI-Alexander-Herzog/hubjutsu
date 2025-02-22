<?php

namespace AHerzog\Hubjutsu\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use AHerzog\Hubjutsu\Models\Base;

class Hub extends Base
{
    use HasFactory; //HasTimestamp

    protected $fillable = [];

    protected $casts = [];

    protected $appends = [];

    protected $with = [];


    public static function colors(
        string $primary = '#F39200',
        string $onPrimary = '#FFFFFF',
        string $secondary = '#F39200',
        string $onSecondary = '#FFFFFF',
        string $tertiary = '#F39200',
        string $onTertiary = '#FFFFFF',
        string $error = '#B3261E',
        string $onError = '#FFFFFF'
    ) {
        
        return self::getColors(compact('primary', 'onPrimary', 'secondary', 'onSecondary', 'tertiary', 'onTertiary', 'error', 'onError'));
    }



    protected static function getColors($baseColors) { 
        return (object) [
            'lightColors' => self::generateTheme($baseColors, 'light'),
            'darkColors' => self::generateTheme($baseColors, 'dark')
        ];
    }

    // Farbmanipulations-Funktionen
    protected static function lightenColor($hex, $percent) {
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
    protected static function generateTheme($baseColors, $theme = 'light') {
        if ($theme === 'light') {
            // Verwende die Basiswerte direkt:
            $p  = $baseColors['primary'];
            $op = $baseColors['onPrimary'];
            $s  = $baseColors['secondary'];
            $os = $baseColors['onSecondary'];
            $t  = $baseColors['tertiary'];
            $ot = $baseColors['onTertiary'];
            $e  = $baseColors['error'];
            $oe = $baseColors['onError'];
        } else { // dark theme: Swap!
            $p  = $baseColors['onPrimary'];
            $op = $baseColors['primary'];
            $s  = $baseColors['onSecondary'];
            $os = $baseColors['secondary'];
            $t  = $baseColors['onTertiary'];
            $ot = $baseColors['tertiary'];
            // Error-Farben bleiben hier unverändert – typischerweise nicht geswappt.
            $e  = $baseColors['error'];
            $oe = $baseColors['onError'];
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
            
            'elevation'             => $elevation
        ];
    }

}
