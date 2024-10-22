import { Link, Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeModeButton from '@hubjutsu/Components/ThemeMode';
import Input from '@/Components/Input';
import { FormEventHandler } from 'react';
import { useLaravelReactI18n } from 'laravel-react-i18n';

export default function Welcome({ auth, laravelVersion, phpVersion, canLogin, canRegister, brandImage }: PageProps<{ laravelVersion: string, phpVersion: string, canLogin:boolean, canRegister:boolean, brandImage:string }>) {
    const { t } = useLaravelReactI18n();
    
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });
    const formInput = { data, setData, post, processing, errors, reset };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Welcome" />
            
            <div className="text-black dark:bg-gray-800 dark:text-gray-100 flex min-h-full flex-1">

                <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                    <div className="flex flex-0 justify-end" >
                        <ThemeModeButton />        
                    </div>
                
                    <div className="mx-auto w-full max-w-sm lg:w-96">
                        <div>
                            <ApplicationLogo className='w-[100px] m-auto'/>

                            <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight">
                                {t('Sign in to your account')}
                            </h2>
                            {canRegister && (
                                <p className="mt-2 text-sm leading-6 ">
                                    {t('Not a member?')}{' '}
                                    <a href="#" className="font-semibold text-primary-500 hover:text-primary-400">
                                        {t('Register now')}!
                                    </a>
                                </p>
                            )}
                        </div>

                        <div className="mt-10">
                            <div>
                                <form action="#" method="POST" className="space-y-4" onSubmit={submit}>
                                
                                <Input inputName='email' label="Email address" useForm={ formInput }/>
                                <Input inputName='password' type="password" label="Password"  useForm={ formInput } />
                            

                                <div className="flex items-center justify-between">
                                    <Input inputName='remember' label="Remember me" type="checkbox" useForm={ formInput }/>
                                    

                                    <div className="text-sm leading-6">
                                        <a href="#" className="font-semibold text-primary-500 hover:text-primary-400">
                                            Forgot password?
                                        </a>
                                    </div>
                                </div>

                                    <div>
                                        <button
                                        type="submit"
                                        className="flex w-full justify-center rounded-md bg-primary-500 px-3 py-1.5 text-sm font-semibold leading-6 text-onprimary shadow-sm hover:bg-primary-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                                        >
                                        Sign in
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="relative hidden w-0 flex-1 lg:block">
                    <img
                        alt=""
                        src={brandImage ? brandImage : 'https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80'}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                </div>
            </div>
        
        </>
    );
}
