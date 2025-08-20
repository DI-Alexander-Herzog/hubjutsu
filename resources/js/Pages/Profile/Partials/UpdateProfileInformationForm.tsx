import { useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import { PageProps } from "@/types";
import FormSection from "@hubjutsu/Components/FormSection";
import Input from "@hubjutsu/Components/Input";
import NavLink from "@hubjutsu/Components/NavLink";
import {
	profileUpdateSchema,
	validateWithZod,
	type ProfileUpdateData,
} from "@hubjutsu/Helper/validation";

export default function UpdateProfileInformation({
	mustVerifyEmail,
	status,
}: {
	mustVerifyEmail: boolean;
	status?: string;
	className?: string;
}) {
	const user = usePage<PageProps>().props.auth.user;

	const { data, setData, patch, errors } = useForm<ProfileUpdateData>({
		name: user.name,
		email: user.email,
	});

	const [clientErrors, setClientErrors] = useState<{ [key: string]: string }>(
		{}
	);

	const updateProfile = () => {
		setClientErrors({});

		const validationResult = validateWithZod(profileUpdateSchema, data);

		if (!validationResult.success) {
			setClientErrors(validationResult.errors);
			return false;
		}

		patch(route("profile.update"));
	};

	const allErrors = { ...errors, ...clientErrors };

	return (
		<>
			<FormSection
				title="Profile Information"
				subtitle="Update your account's profile information and email address."
				onSave={updateProfile}
			>
				<Input
					inputName="name"
					useForm={{ data, setData, errors: allErrors }}
					required
					isFocused
					autoComplete="name"
					isFirst={true}
				/>

				<Input
					inputName="email"
					type="email"
					useForm={{ data, setData, errors: allErrors }}
					required
					autoComplete="username"
				/>

				{mustVerifyEmail && user.email_verified_at === null && (
					<NavLink
						href={route("verification.send")}
						method="post"
						active={false}
						icon={null}
						variant="inline"
						preText="Your email address is unverified."
						statusText={
							status === "verification-link-sent"
								? "A new verification link has been sent to your email address."
								: undefined
						}
					>
						Click here to re-send the verification email.
					</NavLink>
				)}
			</FormSection>
		</>
	);
}
