import { useForm, usePage } from "@inertiajs/react";
import { PageProps } from "@/types";
import FormSection from "@hubjutsu/Components/FormSection";
import Input from "@hubjutsu/Components/Input";
import NavLink from "@hubjutsu/Components/NavLink";

export default function UpdateProfileInformation({
	mustVerifyEmail,
	status,
}: {
	mustVerifyEmail: boolean;
	status?: string;
	className?: string;
}) {
	const user = usePage<PageProps>().props.auth.user;

	const { data, setData, patch, errors } = useForm({
		name: user.name,
		email: user.email,
	});

	return (
		<>
			<FormSection
				title="Profile Information"
				subtitle="Update your account's profile information and email address."
				onSave={() => patch(route("profile.update"))}
			>
				<Input
					inputName="name"
					useForm={{ data, setData, errors }}
					required
					isFocused
					autoComplete="name"
					isFirst={true}
				/>

				<Input
					inputName="email"
					type="email"
					useForm={{ data, setData, errors }}
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
