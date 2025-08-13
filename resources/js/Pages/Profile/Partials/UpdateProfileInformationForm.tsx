import { Link, useForm, usePage } from "@inertiajs/react";
import { ChangeEvent } from "react";
import { PageProps } from "@/types";
import FormSection from "@hubjutsu/Components/FormSection";
import InputLabel from "@hubjutsu/Components/InputLabel";
import TextInput from "@hubjutsu/Components/InputText";
import InputError from "@hubjutsu/Components/InputError";

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
				<div>
					<InputLabel htmlFor="name" value="Name" />

					<TextInput
						id="name"
						className="mt-1 block w-full"
						value={data.name}
						onChange={(e) => setData("name", e.target.value)}
						required
						isFocused
						autoComplete="name"
					/>

					<InputError message={errors.name} />
				</div>

				<div>
					<InputLabel htmlFor="email" value="Email" className="mt-4" />

					<TextInput
						id="email"
						type="email"
						className="mt-1 block w-full"
						value={data.email}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							setData("email", e.target.value)
						}
						required
						autoComplete="username"
					/>

					<InputError className="mt-2" message={errors.email} />
				</div>

				{mustVerifyEmail && user.email_verified_at === null && (
					<div>
						<p className="text-sm mt-2 text-gray-800 dark:text-gray-200">
							Your email address is unverified.
							<Link
								href={route("verification.send")}
								method="post"
								as="button"
								className="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
							>
								Click here to re-send the verification email.
							</Link>
						</p>

						{status === "verification-link-sent" && (
							<div className="mt-2 font-medium text-sm text-green-600 dark:text-green-400">
								A new verification link has been sent to your email address.
							</div>
						)}
					</div>
				)}
			</FormSection>
		</>
	);
}
