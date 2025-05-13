<?php

namespace AHerzog\Hubjutsu\DTO;

class Colors {
    public function __construct(
        public string $primary = '#F39200',
        public string $onPrimary = '#FFFFFF',
        public string $secondary = '#AABBCC',
        public string $onSecondary = '#FFFFFF',
        public string $tertiary = '#BBCCAA',
        public string $onTertiary = '#FFFFFF',
        public string $error = '#B3261E',
        public string $onError = '#FFFFFF',
        public string $text = "#000000",
        public string $background = "#FFFFFF"
    ) {

    }



    static function green() {
        return new Colors(
            primary: '#4CAF50',        // sattes Grün
            onPrimary: '#FFFFFF',
            secondary: '#AABBCC',
            onSecondary: '#FFFFFF',
            tertiary: '#BBCCAA',
            onTertiary: '#FFFFFF',
            error: '#B3261E',
            onError: '#FFFFFF',
            text: "#000000",
            background: "#FFFFFF"
        );
    }

    static function blue() {
        return new Colors(
            primary: '#2196F3',        // kräftiges Blau
            onPrimary: '#FFFFFF',
            secondary: '#AABBCC',
            onSecondary: '#FFFFFF',
            tertiary: '#BBCCAA',
            onTertiary: '#FFFFFF',
            error: '#B3261E',
            onError: '#FFFFFF',
            text: "#000000",
            background: "#FFFFFF"
        );
    }

    static function darkorange() {
        return new Colors(
            primary: '#000000',        // Schwarz als primär
            onPrimary: '#FFFFFF',
            secondary: '#333333',      // Dunkelgrau
            onSecondary: '#FFFFFF',
            tertiary: '#444444',       // Etwas heller
            onTertiary: '#FFFFFF',
            error: '#CF6679',
            onError: '#000000',
            text: "#FFFFFF",
            background: "#121212"
        );
    }
    
}