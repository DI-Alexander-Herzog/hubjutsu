import { useForm } from "@inertiajs/react";
import FormSection from "@hubjutsu/Components/FormSection";
import Input from "@hubjutsu/Components/Input";

export default function UpdatePasswordForm({
	className = "",
}: {
	className?: string;
}) {
	const { data, setData, errors, put, reset, processing } = useForm({
		current_password: "",
		password: "",
		password_confirmation: "",
	});

	const updatePassword = () => {
		put(route("password.update"), {
			preserveScroll: true,
			onSuccess: () => {
				reset();
			},
			onError: (errors) => {
				if (errors.password) {
					reset("password", "password_confirmation");
				}

				if (errors.current_password) {
					reset("current_password");
				}
			},
		});
	};

	return (
		<FormSection
			title="Update Password"
			subtitle="Ensure your account is using a long, random password to stay secure."
			onSave={updatePassword}
			className={className}
		>
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
		</FormSection>
	);
}
