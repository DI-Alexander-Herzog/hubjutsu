const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = { 
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
        './vendor/aherzog/hubjutsu/resources/js',
        './node_modules/primereact/**/*.{js,ts,jsx,tsx}',
    ],

    darkMode: 'selector',
    
    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary: {
                    50: 'rgb(var(--color-primary-50))',
                    100: 'rgb(var(--color-primary-100))',
                    200: 'rgb(var(--color-primary-200))',
                    300: 'rgb(var(--color-primary-300))',
                    400: 'rgb(var(--color-primary-400))',
                    500: 'rgb(var(--color-primary-500))',
                    600: 'rgb(var(--color-primary-600))',
                    700: 'rgb(var(--color-primary-700))',
                    800: 'rgb(var(--color-primary-800))',
                    900: 'rgb(var(--color-primary-900))',
                    DEFAULT: 'rgb(var(--color-primary))'
                },
                secondary: {
                    50: 'rgb(var(--color-secondary-50))',
                    100: 'rgb(var(--color-secondary-100))',
                    200: 'rgb(var(--color-secondary-200))',
                    300: 'rgb(var(--color-secondary-300))',
                    400: 'rgb(var(--color-secondary-400))',
                    500: 'rgb(var(--color-secondary-500))',
                    600: 'rgb(var(--color-secondary-600))',
                    700: 'rgb(var(--color-secondary-700))',
                    800: 'rgb(var(--color-secondary-800))',
                    900: 'rgb(var(--color-secondary-900))',
                    DEFAULT: 'rgb(var(--color-secondary))'
                }
            }
        },
    },

    plugins: [require('@tailwindcss/forms')],
};
