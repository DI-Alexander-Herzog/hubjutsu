import axios from 'axios';
import { AxiosInstance } from 'axios';
import classNames from 'classnames';

declare global {
    interface Window {
        axios: AxiosInstance;
    }
}
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
} else {
    document.documentElement.classList.remove('dark')
}

/*
// Whenever the user explicitly chooses light mode
localStorage.theme = 'light'
// Whenever the user explicitly chooses dark mode
localStorage.theme = 'dark'
// Whenever the user explicitly chooses to respect the OS preference
localStorage.removeItem('theme')
*/
