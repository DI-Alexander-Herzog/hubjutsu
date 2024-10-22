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
        './vendor/aherzog/hubjutsu/resources/js/tailwind.conig.js',
        './node_modules/primereact/**/*.{js,ts,jsx,tsx}',
    ],

    darkMode: 'selector',
    
    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            boxShadow: {
                'outline-primary': '0 0 0 0.2rem rgba(var(--color-primary) / 0.5)'
            },
            colors: {
                text: shadeVariables('text'),
                primary: shadeVariables('primary'),
                secondary: shadeVariables('secondary'),
                onprimary: shadeVariables('onprimary'),
                onsecondary: shadeVariables('onsecondary'),
            }
        },
    },

    plugins: [require('@tailwindcss/forms')],
};
