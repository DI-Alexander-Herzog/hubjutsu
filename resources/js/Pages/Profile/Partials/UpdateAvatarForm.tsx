import { useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import FormSection from "@hubjutsu/Components/FormSection";
import MediaUpload from "../../../Components/MediaUpload";
import { PageProps } from "@hubjutsu/types";
import { validateAvatar } from "@hubjutsu/Helper/validation";

export default function UpdateAvatarForm({
	className = "",
}: {
	className?: string;
}) {
	const user = usePage<PageProps>().props.auth.user;
	const { data, setData, errors, post, processing } = useForm({
		avatar: user.avatar,
	});

	const [clientErrors, setClientErrors] = useState<{ [key: string]: string }>(
		{}
	);

	const updateAvatar = () => {
		setClientErrors({});

		const avatarValidation = validateAvatar(data.avatar);
		if (!avatarValidation.isValid) {
			setClientErrors({
				avatar: avatarValidation.error || "Invalid avatar file.",
			});
			return false;
		}

		post(route("profile.avatar"), {
			preserveScroll: true,
			onError: (error) => {
				console.log(error);
				alert("Error updating avatar");
			},
			onSuccess: () => {
				window.location.reload();
			},
		});
	};

	const allErrors = { ...errors, ...clientErrors };

	return (
		<FormSection
			title="Update Avatar"
			subtitle="Update your profile picture to personalize your account."
			onSave={updateAvatar}
			className={className}
		>
			<div>
				<MediaUpload
					useForm={{ data, setData, errors: allErrors }}
					accept="image/*"
					name="avatar"
				/>
			</div>
		</FormSection>
	);
}
