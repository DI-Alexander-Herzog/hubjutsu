import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CredentialForm from "./Form";

export default function CredentialView({ credential }: { credential: Record<string, any> }) {
	return (
		<AuthenticatedLayout
			title="Credential"
			breadcrumbs={[
				{ label: "Credentials", url: route("credentials.index") },
				{ label: credential?.name || `#${credential?.id || "?"}` },
			]}
		>
			<CredentialForm credential={credential} disabled={true} />
		</AuthenticatedLayout>
	);
}
