import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CredentialForm from "./Form";

export default function CredentialEdit({ credential }: { credential: Record<string, any> }) {
	return (
		<AuthenticatedLayout
			title="Credential bearbeiten"
			breadcrumbs={[
				{ label: "Credentials", url: route("credentials.index") },
				{ label: credential?.name || `#${credential?.id || "?"}`, url: route("credentials.show", [credential?.id]) },
				{ label: "Bearbeiten" },
			]}
		>
			<CredentialForm credential={credential} disabled={false} />
		</AuthenticatedLayout>
	);
}
