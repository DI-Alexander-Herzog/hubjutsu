import { useForm } from "@inertiajs/react";
import FormSection from "@hubjutsu/Components/FormSection";
import Input from "@hubjutsu/Components/Input";
import PrimaryButton from "@hubjutsu/Components/PrimaryButton";
import { Transition } from "@headlessui/react";
import { FormEventHandler, useRef } from "react";

export default function UpdatePasswordForm({
	className = "",
}: {
	className?: string;
}) {
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
		<FormSection
			title="Update Password"
			subtitle="Ensure your account is using a long, random password to stay secure."
			
			className={className}
		>
			<form onSubmit={updatePassword}  className="flex flex-col gap-4">
				<Input
					inputName="current_password"
					label="Current Password"
					type="password"
					useForm={{ data, setData, errors }}
					required
					isFocused
					autoComplete="current-password"
					isFirst={true}
				/>

				<Input
					inputName="password"
					label="New Password"
					type="password"
					useForm={{ data, setData, errors }}
					required
					autoComplete="new-password"
				/>

				<Input
					inputName="password_confirmation"
					label="Confirm Password"
					type="password"
					useForm={{ data, setData, errors }}
					required
					autoComplete="new-password"
				/>

				<div className="flex items-center gap-4 mt-4">
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
		</FormSection>
	);
}
