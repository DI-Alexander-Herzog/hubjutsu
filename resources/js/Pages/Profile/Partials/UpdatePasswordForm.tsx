import { useForm } from "@inertiajs/react";
import { useState } from "react";
import FormSection from "@hubjutsu/Components/FormSection";
import Input from "@hubjutsu/Components/Input";
import {
	passwordUpdateSchema,
	validateWithZod,
	type PasswordUpdateData,
} from "@hubjutsu/Helper/validation";

export default function UpdatePasswordForm({
	className = "",
}: {
	className?: string;
}) {
	const { data, setData, errors, put, reset, processing } =
		useForm<PasswordUpdateData>({
			current_password: "",
			password: "",
			password_confirmation: "",
		});

	const [clientErrors, setClientErrors] = useState<{ [key: string]: string }>(
		{}
	);

	const updatePassword = () => {
		setClientErrors({});

		const validationResult = validateWithZod(passwordUpdateSchema, data);

		if (!validationResult.success) {
			setClientErrors(validationResult.errors);
			return;
		}

		put(route("password.update"), {
			preserveScroll: true,
			onSuccess: () => {
				reset();
				setClientErrors({});
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

	const allErrors = { ...errors, ...clientErrors };

	return (
		<FormSection
			title="Update Password"
			subtitle="Ensure your account is using a long, random password to stay secure."
			onSave={updatePassword}
			className={className}
		>
			<Input
				inputName="current_password"
				type="password"
				useForm={{ data, setData, errors: allErrors }}
				required
				isFocused
				autoComplete="current-password"
				isFirst={true}
			/>

			<Input
				inputName="password"
				type="password"
				useForm={{ data, setData, errors: allErrors }}
				required
				autoComplete="new-password"
			/>

			<Input
				inputName="password_confirmation"
				type="password"
				useForm={{ data, setData, errors: allErrors }}
				required
				autoComplete="new-password"
			/>
		</FormSection>
	);
}
