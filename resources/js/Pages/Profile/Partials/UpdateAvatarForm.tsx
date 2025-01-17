import { useRef, FormEventHandler } from 'react';
import InputError from '@hubjutsu/Components/InputError';
import InputLabel from '@hubjutsu/Components/InputLabel';
import PrimaryButton from '@hubjutsu/Components/PrimaryButton';
import TextInput from '@hubjutsu/Components/InputText';
import { useForm, usePage } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import MediaUpload from '../../../Components/MediaUpload';
import { PageProps } from '@hubjutsu/types';

export default function UpdateAvatarForm({ className = '' }: { className?: string }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const user = usePage<PageProps>().props.auth.user;
    const { data, setData, errors, post, reset, processing, recentlySuccessful } = useForm({
        avatar: user.avatar,
    });
    const formInput = {data, setData, errors};

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('profile.avatar'), {
            preserveScroll: true,
            onError: (error) => {
                console.log(error);
                alert('Error updating password');
            },
            onSuccess: () => {
                window.location.reload();
            }
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Update Avatar</h2>

                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Ensure your account is using a long, random password to stay secure.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
            <div>
            <MediaUpload 
                useForm={formInput}
                accept='image/*'
                name='avatar'

            />
            </div>
            <div className="flex items-center gap-4">
                                <PrimaryButton disabled={processing}>Save</PrimaryButton>
            
                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Saved.</p>
                                </Transition>
                            </div>
                        </form>
            
        </section>
    );
}
