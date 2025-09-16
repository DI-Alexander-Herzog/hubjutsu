const defaultTheme = require('tailwindcss/defaultTheme');


const shadeVariables = (name) => {
    return {
        50: 'rgb(var(--color-'+name+'-50))',
        100: 'rgb(var(--color-'+name+'-100))',
        200: 'rgb(var(--color-'+name+'-200))',
        300: 'rgb(var(--color-'+name+'-300))',
        400: 'rgb(var(--color-'+name+'-400))',
        500: 'rgb(var(--color-'+name+'-500))',
        600: 'rgb(var(--color-'+name+'-600))',
        700: 'rgb(var(--color-'+name+'-700))',
        800: 'rgb(var(--color-'+name+'-800))',
        900: 'rgb(var(--color-'+name+'-900))',
        950: 'rgb(var(--color-'+name+'-950))',
        DEFAULT: 'rgb(var(--color-'+name+'))'
    }
};

/** @type {import('tailwindcss').Config} */
module.exports = { 
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
        './vendor/aherzog/hubjutsu/resources/js/**/*.tsx',
        './vendor/aherzog/hubjutsu/resources/js/hubjutsu-style.js',
        './vendor/aherzog/hubjutsu/resources/js/tailwind.config.js',
    ],

    darkMode: 'selector',
    
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', 'Figtree', ...defaultTheme.fontFamily.sans],
                serif: ['var(--font-serif)', ...defaultTheme.fontFamily.serif],
                mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
                header: ['var(--font-header)', 'sans-serif'],
                text: ['var(--font-text)', 'sans-serif'],
            },
            boxShadow: {
                'outline-primary': '0 0 0 0.2rem rgba(var(--color-primary) / 0.5)'
            },
            colors: {
                text: shadeVariables('text'),
                background: shadeVariables('background'),

                primary: shadeVariables('primary'),
                onprimary: shadeVariables('onprimary'),

                secondary: shadeVariables('secondary'),
                onsecondary: shadeVariables('onsecondary'),

                tertiary: shadeVariables('tertiary'),
                ontertiary: shadeVariables('ontertiary'),

                error: shadeVariables('error'),
                onerror: shadeVariables('onerror'),

                warning: shadeVariables('warning'),
                onwarning: shadeVariables('onwarning'),

                success: shadeVariables('success'),
                onsuccess: shadeVariables('onsuccess'),
                
                info: shadeVariables('info'),
                oninfo: shadeVariables('oninfo'),
            }
        },
    },

    plugins: [require('@tailwindcss/forms')],
};
