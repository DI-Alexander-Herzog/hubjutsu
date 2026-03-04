import axios from "axios";

export type CredentialRecord = {
	id: number;
	name?: string;
	type?: string;
	status?: string;
	provider?: string | null;
	public_data?: Record<string, unknown> | null;
	secret_data_preview?: Record<string, unknown> | null;
	secret_data_revealed?: Record<string, unknown> | null;
	[key: string]: unknown;
};

export const credentialAPI = {
	async find(id: number, withRelations: string[] = []): Promise<CredentialRecord> {
		const response = await axios.get(route("api.model.get", { model: "credential", id }), {
			params: { with: withRelations },
		});
		return response.data;
	},

	async revealSecretData(id: number, withRelations: string[] = []): Promise<CredentialRecord> {
		const response = await axios.get(route("api.model.get", { model: "credential", id }), {
			params: {
				with: withRelations,
				include_secret_data: true,
			},
		});
		return response.data;
	},
};

export default credentialAPI;
