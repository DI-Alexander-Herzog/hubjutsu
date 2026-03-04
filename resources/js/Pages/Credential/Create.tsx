import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CredentialForm from "./Form";

export default function CredentialCreate() {
	const credential = {
		type: "app",
		status: "active",
		public_data: {},
		secret_data: {},
		meta: {},
	} as Record<string, any>;

	return (
		<AuthenticatedLayout
			title="Credential erstellen"
			breadcrumbs={[
				{ label: "Credentials", url: route("credentials.index") },
				{ label: "Neu" },
			]}
		>
			<CredentialForm credential={credential} disabled={false} />
		</AuthenticatedLayout>
	);
}
