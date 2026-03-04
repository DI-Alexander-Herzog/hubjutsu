import FormContainer from "@/Components/FormContainer";
import FormSection from "@/Components/FormSection";
import Input from "@/Components/Input";
import Separator from "@/Components/Separator";
import { FormContext, FormContextSubmitButton } from "@/Components/FormContext";
import CredentialSecretViewer from "@/Components/CredentialSecretViewer";

const typeOptions = [
	["app", "App"],
	["api_key", "API Key"],
	["basic_auth", "Basic Auth"],
	["oauth2", "OAuth2"],
	["ssh_key", "SSH Key"],
	["ftp_basic", "FTP Basic"],
];

const statusOptions = [
	["active", "Active"],
	["expired", "Expired"],
	["revoked", "Revoked"],
	["invalid", "Invalid"],
];

export default function CredentialForm({ credential, disabled = true }: { credential: Record<string, any>; disabled?: boolean }) {
	return (
		<FormContext data={credential} model="Credential" readonly={disabled}>
			<FormContainer>
				<FormSection title="Credential" subtitle="Öffentliche Identifikationsdaten">
					<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
						<Input inputName="id" label="ID" disabled={true} />
						<Input inputName="name" type="text" label="Name" />
						<Input inputName="type" type="select" options={typeOptions} label="Typ" />
						<Input inputName="provider" type="text" label="Provider Adapter" />
						<Input inputName="status" type="select" options={statusOptions} label="Status" />
						<Input inputName="valid_until" type="datetime" label="Valid Until" />
						<Input inputName="credentialable_type" type="text" label="Credentialable Type" />
						<Input inputName="credentialable_id" type="number" label="Credentialable ID" />
					</div>
				</FormSection>

				<Separator />

				<FormSection title="Secret Preview" subtitle="Secret-Daten bleiben standardmäßig maskiert">
					<CredentialSecretViewer credential={credential as any} credentialId={credential?.id} />
				</FormSection>
			</FormContainer>

			<FormSection boxed={true}>
				<FormContextSubmitButton>Speichern</FormContextSubmitButton>
			</FormSection>
		</FormContext>
	);
}
