import { useRef, FormEventHandler } from 'react';
import InputError from '@hubjutsu/Components/InputError';
import InputLabel from '@hubjutsu/Components/InputLabel';
import PrimaryButton from '@hubjutsu/Components/PrimaryButton';
import TextInput from '@hubjutsu/Components/InputText';
import { useForm } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import MediaUpload from '../../../Components/MediaUpload';

export default function UpdateAvatarForm({ className = '' }: { className?: string }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
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

            <MediaUpload 
                accept='image/*'
                name='avatar'
            />
            
        </section>
    );
}
