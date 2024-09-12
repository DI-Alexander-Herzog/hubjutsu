import { PropsWithChildren, ReactNode } from 'react';
import { User } from '@/types';
import Layout from '@hubjutsu/Layouts/AuthenticatedLayout';

export default function Authenticated({ user, header, children }: PropsWithChildren<{ user: User, header?: ReactNode }>) {
    return <Layout user={user} header={header}>{children}</Layout>;
}
