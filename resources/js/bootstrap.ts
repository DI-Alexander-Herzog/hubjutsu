import axios from 'axios';
import { AxiosInstance } from 'axios';
import { router } from '@inertiajs/react'

declare global {
    interface Window {
        axios: AxiosInstance;
        hubjutsuapi: AxiosInstance
    }
}
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;



const hubjutsuapi = axios.create({
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

let csrfFlight: any = null;
let redirecting = false;

function ensureCsrf() {
  if (!csrfFlight) {
    csrfFlight = hubjutsuapi
      .get('/sanctum/csrf-cookie')
      .finally(() => (csrfFlight = null))
  }
  return csrfFlight
}

hubjutsuapi.interceptors.response.use(
  r => r,
  async (e) => {
    const status = e?.response?.status
    const cfg = e?.config
    if (!cfg) throw e

    if (status === 419 && !cfg._retry419) {
      cfg._retry419 = true
      await ensureCsrf()
      return hubjutsuapi(cfg)
    }

    if (status === 401 && !redirecting) {
      redirecting = true
      router.visit('/login', { replace: true })
    }

    throw e
  }
)

window.hubjutsuapi = hubjutsuapi





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
