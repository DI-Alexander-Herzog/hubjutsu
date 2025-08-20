import { useForm, usePage } from "@inertiajs/react";
import FormSection from "@hubjutsu/Components/FormSection";
import MediaUpload from "../../../Components/MediaUpload";
import { PageProps } from "@hubjutsu/types";

export default function UpdateAvatarForm({
	className = "",
}: {
	className?: string;
}) {
	const user = usePage<PageProps>().props.auth.user;
	const { data, setData, errors, post, processing } = useForm({
		avatar: user.avatar,
	});

	console.log(user, { data });

	const updateAvatar = () => {
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

	return (
		<FormSection
			title="Update Avatar"
			subtitle="Update your profile picture to personalize your account."
			onSave={updateAvatar}
			className={className}
		>
			<div>
				<MediaUpload
					useForm={{ data, setData, errors }}
					accept="image/*"
					name="avatar"
				/>
			</div>
		</FormSection>
	);
}
