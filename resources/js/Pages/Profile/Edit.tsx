import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DeleteUserForm from "@/Pages/Profile/Partials/DeleteUserForm";
import UpdatePasswordForm from "@/Pages/Profile/Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "@/Pages/Profile/Partials/UpdateProfileInformationForm";
import { Head } from "@inertiajs/react";
import { PageProps } from "@/types";
import UpdateAvatarForm from "./Partials/UpdateAvatarForm";

export default function Edit({
	mustVerifyEmail,
	status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
	return (
		<AuthenticatedLayout title="Profile">
			<div className="py-12">
				<div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
					<div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
						<UpdateProfileInformationForm
							mustVerifyEmail={mustVerifyEmail}
							status={status}
						/>
					</div>
					<div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
						<UpdateAvatarForm className="max-w-xl" />
					</div>

					<div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
						<UpdatePasswordForm className="max-w-xl" />
					</div>

					<div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
						<DeleteUserForm className="max-w-xl" />
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}