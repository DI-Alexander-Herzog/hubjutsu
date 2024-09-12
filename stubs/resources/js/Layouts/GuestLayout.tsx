import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import Layout from '@hubjutsu/Layouts/GuestLayout';

export default function Guest({ children }: PropsWithChildren) {
    return <Layout>{children}</Layout>;
}
