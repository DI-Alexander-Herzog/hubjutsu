import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import i18n from 'laravel-react-i18n/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    
    const server = {};
    if (env.VITE_SERVER_HOST) {
        server.host = env.VITE_SERVER_HOST;
    }
    if (env.VITE_SERVER_HTTPS_CERT && env.VITE_SERVER_HTTPS_KEY) {
        server.https = {
            key: fs.readFileSync(env.VITE_SERVER_HTTPS_KEY),
            cert: fs.readFileSync(env.VITE_SERVER_HTTPS_CERT),
        };
    }

    return {
        server: server,
        plugins: [
            laravel({
<<<<<<< HEAD:packages/aherzog/hubjutsu/stubs/vite.config.dist.js
                input: 'resources/js/app.jsx',
=======
                input: 'resources/js/app.tsx',
>>>>>>> 1f5f7c3 (Squashed 'packages/aherzog/hubjutsu/' changes from 20470ff..ec48f0c):stubs/vite.config.dist.js
                refresh: true,
            }),
            react(),
            i18n()
        ],
        resolve: {
            alias: {
                '@hubjutsu': resolve(__dirname, 'vendor/aherzog/hubjutsu/resources/js'),
            },
        },
    };
});

