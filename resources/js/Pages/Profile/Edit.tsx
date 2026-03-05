import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DeleteUserForm from "@/Pages/Profile/Partials/DeleteUserForm";
import UpdatePasswordForm from "@/Pages/Profile/Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "@/Pages/Profile/Partials/UpdateProfileInformationForm";
import { PageProps } from "@/types";
import UpdateAvatarForm from "./Partials/UpdateAvatarForm";

import FormContainer from "@/Components/FormContainer";
import Separator from "@/Components/Separator";

export default function Edit({
	mustVerifyEmail,
	status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
	return (
		<AuthenticatedLayout title="Profile">
			<FormContainer size="large" stack gap="md" className="py-4">
				<UpdateProfileInformationForm
					mustVerifyEmail={mustVerifyEmail}
					status={status}
				/>
				<Separator />
				<UpdateAvatarForm />
				<Separator />
				<UpdatePasswordForm />
				<Separator />
				<DeleteUserForm />
			</FormContainer>
		</AuthenticatedLayout>
	);
}
