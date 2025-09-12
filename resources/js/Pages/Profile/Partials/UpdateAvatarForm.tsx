import { useForm, usePage } from "@inertiajs/react";
import FormSection from "@/Components/FormSection";
import MediaUpload from "@/Components/MediaUpload";
import { PageProps } from "@/types";
import { FormEventHandler } from "react";
import PrimaryButton from '@/Components/PrimaryButton';
import { Transition } from '@headlessui/react';


export default function UpdateAvatarForm({
	className = "",
}: {
	className?: string;
}) {
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
		<FormSection
			title="Update Avatar"
			subtitle="Update your profile picture to personalize your account."
			className={className}
		>
			<form onSubmit={submit} className="flex flex-col gap-2">
				<div>
				<MediaUpload 
					useForm={formInput}
					accept='image/*'
					name='avatar'

				/>
				</div>
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
