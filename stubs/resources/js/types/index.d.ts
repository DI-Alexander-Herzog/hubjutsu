import hubjutsu from '@hubjutsu/types/index';
export type User = { } & hubjutsu.User;

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & hubjutsu.PageProps & {
    auth: {
        user: User;
    };
};

export * from  '@hubjutsu/types/index';
