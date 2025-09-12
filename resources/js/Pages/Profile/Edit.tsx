import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DeleteUserForm from "@/Pages/Profile/Partials/DeleteUserForm";
import UpdatePasswordForm from "@/Pages/Profile/Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "@/Pages/Profile/Partials/UpdateProfileInformationForm";
import { PageProps } from "@/types";
import UpdateAvatarForm from "./Partials/UpdateAvatarForm";
import FormContainer from "@/Components/FormContainer";

export default function Edit({
	mustVerifyEmail,
	status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
	return (
		<AuthenticatedLayout title="Profile">
			<FormContainer>
				<UpdateProfileInformationForm
					mustVerifyEmail={mustVerifyEmail}
					status={status}
				/>
			</FormContainer>

			<FormContainer>
				<UpdateAvatarForm />
			</FormContainer>

			<FormContainer>
				<UpdatePasswordForm />
			</FormContainer>

			<FormContainer>
				<DeleteUserForm />
			</FormContainer>
		</AuthenticatedLayout>
	);
}
