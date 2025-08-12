import './bootstrap';
import '../css/app.scss';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { LaravelReactI18nProvider } from 'laravel-react-i18n';
import ErrorBoundary from '@hubjutsu/Components/ErrorBoundary';


const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Farben aus den shared props holen
            if ((props.initialPage.props?.hub as any).cssVars) {
                const styleTag = document.createElement('style');
                styleTag.id = 'hub-colors';
                styleTag.innerHTML = (props.initialPage.props.hub as any)?.cssVars as string;
                document.head.appendChild(styleTag);
            }
            
        root.render(
            <ErrorBoundary>
                <LaravelReactI18nProvider
                    locale={'de'}
                    fallbackLocale={'en'}
                    files={import.meta.glob('/lang/*.json')}
                >
                
                    <App {...props} />
                </LaravelReactI18nProvider>
            </ErrorBoundary>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
