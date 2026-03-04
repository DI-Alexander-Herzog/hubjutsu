import credentialAPI, { CredentialRecord } from "@/api/credentialAPI";
import { useMemo, useState } from "react";
import NeutralButton from "@/Components/NeutralButton";

export default function CredentialSecretViewer({
	credential,
	credentialId,
	className = "",
}: {
	credential?: CredentialRecord | null;
	credentialId?: number | null;
	className?: string;
}) {
	const [loading, setLoading] = useState(false);
	const [revealedSecret, setRevealedSecret] = useState<Record<string, unknown> | null>(null);
	const [error, setError] = useState<string | null>(null);

	const id = useMemo(() => {
		if (typeof credentialId === "number" && credentialId > 0) {
			return credentialId;
		}
		if (credential?.id && Number(credential.id) > 0) {
			return Number(credential.id);
		}
		return null;
	}, [credential?.id, credentialId]);

	const preview = (credential?.secret_data_preview ?? null) as Record<string, unknown> | null;
	const hasSecretData = !!revealedSecret || !!preview;

	const onReveal = async () => {
		if (!id || loading) {
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const item = await credentialAPI.revealSecretData(id);
			setRevealedSecret((item?.secret_data_revealed ?? null) as Record<string, unknown> | null);
		} catch (err: any) {
			setError(err?.response?.data?.message ?? err?.message ?? "Secret konnte nicht geladen werden.");
		} finally {
			setLoading(false);
		}
	};

	if (!hasSecretData) {
		return <span className="text-xs text-text-500">Keine Secret-Daten hinterlegt</span>;
	}

	return (
		<div className={className}>
			{revealedSecret ? (
				<pre className="text-xs whitespace-pre-wrap rounded bg-background-700 p-2">
					{JSON.stringify(revealedSecret, null, 2)}
				</pre>
			) : (
				<pre className="text-xs whitespace-pre-wrap rounded bg-background-700 p-2">
					{JSON.stringify(preview, null, 2)}
				</pre>
			)}
			{!revealedSecret && id ? (
				<div className="mt-2">
					<NeutralButton onClick={onReveal} disabled={loading}>
						{loading ? "Lade..." : "Secret anzeigen"}
					</NeutralButton>
				</div>
			) : null}
			{error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
		</div>
	);
}
