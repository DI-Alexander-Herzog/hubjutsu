import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import FormContainer from "@/Components/FormContainer";
import FormSection from "@/Components/FormSection";
import Modal from "@/Components/Modal";
import NeutralButton from "@/Components/NeutralButton";
import PrimaryButton from "@/Components/PrimaryButton";
import Checkbox from "@/Components/Checkbox";
import DangerButton from "@/Components/DangerButton";
import Input from "@/Components/Input";

type ScopeConfig = {
	type: string;
	id: number;
	label?: string;
};

type ConnectField = {
	name: string;
	label: string;
	type?: string;
	required?: boolean;
	placeholder?: string;
	help?: string;
	options?: string[];
	default?: string | string[];
};

type ServiceEntry = {
	provider: string;
	label: string;
	description?: string;
	type: string;
	allow_multiple?: boolean;
	redirect_uri?: string;
	configured_scopes?: string[];
	setup_instructions?: string[];
	setup_docs_url?: string | null;
	configured: boolean;
	connect_fields?: ConnectField[];
	credentials: Array<{
		id: number;
		name?: string;
		status?: string;
		public_data?: Record<string, unknown>;
		valid_until?: string | null;
		refresh_valid_until?: string | null;
		public_data_summary?: string;
		token_preview?: string | null;
		refresh_token_preview?: string | null;
		has_access_token?: boolean;
		has_client_secret?: boolean;
		has_system_user_token?: boolean;
		has_refresh_token?: boolean;
	}>;
};

type ServicesResponse = {
	scope: {
		type: string;
		id: number;
		label: string;
		type_label: string;
	};
	services: ServiceEntry[];
	credentials: Array<{
		id: number;
		name?: string;
		provider?: string;
		status?: string;
		valid_until?: string | null;
		public_data_summary?: string;
	}>;
};

export default function IntegrationServiceSection({
	scope,
	disabled = false,
	className = "",
}: {
	scope?: ScopeConfig;
	disabled?: boolean;
	className?: string;
}) {
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<ServicesResponse | null>(null);
	const [showConnectModal, setShowConnectModal] = useState(false);
	const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
	const [selectedCredential, setSelectedCredential] = useState<ServiceEntry["credentials"][number] | null>(null);
	const [connectMode, setConnectMode] = useState<"connect" | "reauth">("connect");
	const [formData, setFormData] = useState<Record<string, string | string[]>>({});
	const [clearSecretFields, setClearSecretFields] = useState<Record<string, boolean>>({});
	const [connecting, setConnecting] = useState(false);
	const [deletingCredentialId, setDeletingCredentialId] = useState<number | null>(null);

	const openOauthSummaryPopup = (
		redirectUrl: string,
		summary: Record<string, any>,
		fallbackTitle: string,
		service?: ServiceEntry | null,
	) => {
		const oauthWindow = window.open("", "hubjutsu-oauth-connect", "popup=yes,width=640,height=760");

		const rootStyles = getComputedStyle(document.documentElement);
		const primaryRgb = (rootStyles.getPropertyValue("--color-primary-500") || "").trim() || "37 99 235";
		const onPrimaryRgb = (rootStyles.getPropertyValue("--color-onprimary-500") || "").trim() || "255 255 255";
		const bgRgb = (rootStyles.getPropertyValue("--color-background-600") || "").trim() || "243 244 246";
		const bgCardRgb = (rootStyles.getPropertyValue("--color-background") || "").trim() || "255 255 255";
		const textRgb = (rootStyles.getPropertyValue("--color-text-900") || "").trim() || "17 24 39";
		const borderRgb = (rootStyles.getPropertyValue("--color-background-700") || "").trim() || "229 231 235";

		const escapeHtml = (value: unknown) =>
			String(value ?? "")
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;")
				.replaceAll('"', "&quot;")
				.replaceAll("'", "&#039;");

		const title = escapeHtml(summary?.label || fallbackTitle);
		let callbackUrlRaw = String(summary?.redirect_uri || "").trim();
		if (callbackUrlRaw === "") {
			try {
				const parsed = new URL(redirectUrl);
				const parsedRedirect = parsed.searchParams.get("redirect_uri");
				if (parsedRedirect) {
					callbackUrlRaw = parsedRedirect;
				}
			} catch (error) {
				// no-op
			}
		}
		const redirectUri = escapeHtml(callbackUrlRaw);
		const authorizeUrl = escapeHtml(summary?.authorize_url || "");
		const scopeLabel = escapeHtml(summary?.scope || "");
		const setupInstructions = Array.isArray(service?.setup_instructions) ? service.setup_instructions : [];
		const setupDocsUrl = typeof service?.setup_docs_url === "string" ? service.setup_docs_url : "";
		const setupStepsHtml = setupInstructions
			.map((step, index) => `<li>${index + 1}. ${step}</li>`)
			.join("");
		const setupDocsHtml = setupDocsUrl
			? `<div class="row"><p><strong>Doku:</strong> <a href="${escapeHtml(setupDocsUrl)}" target="_blank" rel="noreferrer">${escapeHtml(setupDocsUrl)}</a></p></div>`
			: "";

		if (oauthWindow && !oauthWindow.closed) {
			oauthWindow.document.open();
			oauthWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} OAuth</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 16px; background: rgb(${bgRgb}); color: rgb(${textRgb}); }
    .card { background: rgb(${bgCardRgb}); border: 1px solid rgb(${borderRgb}); border-radius: 10px; padding: 16px; max-width: 680px; margin: 0 auto; }
    h1 { font-size: 18px; margin: 0 0 8px 0; }
    p { margin: 6px 0; font-size: 14px; }
    code { display: block; background: rgb(${bgRgb}); border: 1px solid rgb(${borderRgb}); border-radius: 6px; padding: 8px; margin-top: 4px; font-size: 12px; word-break: break-all; }
    .row { margin-bottom: 10px; }
    ul { margin: 6px 0 0 18px; padding: 0; }
    li { margin: 2px 0; }
    a { color: rgb(${primaryRgb}); text-decoration: underline; }
    .actions { display: flex; gap: 8px; margin-top: 16px; }
    button { border: 0; border-radius: 6px; padding: 10px 14px; cursor: pointer; font-weight: 600; }
    .primary { background: rgb(${primaryRgb}); color: rgb(${onPrimaryRgb}); }
    .secondary { background: rgb(${bgRgb}); color: rgb(${textRgb}); border: 1px solid rgb(${borderRgb}); }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title} verbinden</h1>
    <p>Prüfe die Werte und starte dann den OAuth-Login.</p>
    <div class="row">
      <p><strong>Callback-URL / Redirect-URL:</strong></p>
      <code>${redirectUri}</code>
    </div>
    <div class="row">
      <p><strong>Authorization-Endpoint:</strong></p>
      <code>${authorizeUrl}</code>
    </div>
    <details class="row">
      <summary><strong>Scopes</strong></summary>
      <code>${scopeLabel}</code>
    </details>
    ${setupStepsHtml ? `<details class="row"><summary><strong>Einrichtung</strong></summary><ul>${setupStepsHtml}</ul></details>` : ""}
    ${setupDocsHtml}
    <div class="actions">
      <button class="secondary" onclick="window.close()">Abbrechen</button>
      <button class="primary" id="continueBtn">Weiter zu OAuth</button>
    </div>
  </div>
  <script>
    document.getElementById('continueBtn')?.addEventListener('click', function () {
      window.location.href = ${JSON.stringify(redirectUrl)};
    });
  </script>
</body>
</html>`);
			oauthWindow.document.close();
			oauthWindow.focus();
		} else {
			window.location.assign(redirectUrl);
		}
	};

	const hasScope = !!scope?.type && !!scope?.id;

	const load = async () => {
		if (!hasScope) return;
		setLoading(true);
		setLoaded(false);
		setError(null);
		try {
			const response = await axios.get(route("integrations.services"), {
				params: {
					credentialable_type: scope!.type,
					credentialable_id: scope!.id,
				},
			});
			setData(response.data);
		} catch (err: any) {
			setError(err?.response?.data?.message ?? err?.message ?? "Services konnten nicht geladen werden.");
		} finally {
			setLoading(false);
			setLoaded(true);
		}
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [scope?.type, scope?.id]);

	const services = data?.services ?? [];
	const selectedService = services.find((entry) => entry.provider === selectedProvider) ?? null;
	const trustedHtml = (value: string) => ({ __html: value });
	const modalUseForm = {
		data: formData,
		errors: {},
		setData: (updater: any) => {
			if (typeof updater === "function") {
				setFormData((prev) => updater(prev));
				return;
			}
			setFormData(updater);
		},
	};

	const unconfiguredServices = useMemo(
		() => services.filter((service) => !service.configured || service.allow_multiple),
		[services]
	);

	const createInitialFormData = (service: ServiceEntry | null): Record<string, string | string[]> => {
		if (!service) return {};
		const initial: Record<string, string | string[]> = {};
		for (const field of service.connect_fields ?? []) {
			if (Array.isArray(field.default)) {
				initial[field.name] = field.default;
			} else if (typeof field.default === "string") {
				initial[field.name] = field.default;
			} else {
				initial[field.name] = "";
			}
		}
		return initial;
	};

	const prefillFormDataFromCredential = (
		service: ServiceEntry | null,
		credential: ServiceEntry["credentials"][number] | null,
	): Record<string, string | string[]> => {
		const initial = createInitialFormData(service);
		if (!service || !credential) return initial;

		const publicData = credential.public_data ?? {};
		const clientId = String((publicData.client_id as string | undefined) ?? "").trim();
		const scopeRaw = String((publicData.scope as string | undefined) ?? "").trim();
		const scopes = scopeRaw
			.split(/[,\s]+/)
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);

		for (const field of service.connect_fields ?? []) {
			const fieldName = field.name.toLowerCase();
			const fieldType = (field.type || "text").toLowerCase();

			if (fieldType === "password") {
				// Secrets are never prefetched into the form.
				continue;
			}

			if (fieldType === "multicheck" && scopes.length > 0) {
				initial[field.name] = scopes;
				continue;
			}

			if (
				clientId !== "" &&
				(fieldName.includes("client_id") || fieldName.includes("app_id"))
			) {
				initial[field.name] = clientId;
			}
		}

		return initial;
	};

	const openCreateFor = (provider: string) => {
		const service = services.find((entry) => entry.provider === provider) ?? null;
		setConnectMode("connect");
		setSelectedProvider(provider);
		setSelectedCredential(null);
		setFormData(createInitialFormData(service));
		setClearSecretFields({});
		setShowConnectModal(true);
	};

	const openReauthFor = (provider: string, credential: ServiceEntry["credentials"][number]) => {
		const service = services.find((entry) => entry.provider === provider) ?? null;
		setConnectMode("reauth");
		setSelectedProvider(provider);
		setSelectedCredential(credential);
		setFormData(prefillFormDataFromCredential(service, credential));
		setClearSecretFields({});
		setShowConnectModal(true);
	};

	const clearFlagForField = (fieldName: string): string | null => {
		if (fieldName === "meta_app_secret") return "clear_meta_app_secret";
		if (fieldName === "meta_system_user_token") return "clear_meta_system_user_token";
		return null;
	};

	const connectSelected = async () => {
		if (!scope || !selectedService) return;

		setError(null);
		const payload: Record<string, string> = {
			credentialable_type: scope.type,
			credentialable_id: String(scope.id),
			return_url: window.location.href,
		};
		for (const field of selectedService.connect_fields ?? []) {
			const rawValue = formData[field.name];
			const value = Array.isArray(rawValue) ? rawValue.join(",") : (rawValue ?? "");
			const isPasswordField = (field.type || "").toLowerCase() === "password";
			const clearFlag = clearFlagForField(field.name);
			const clearRequested = !!(clearFlag && clearSecretFields[field.name]);
			const keepStoredSecret = connectMode === "reauth" && isPasswordField && String(value).trim() === "" && !clearRequested;
			if (field.required && String(value).trim() === "" && !keepStoredSecret && !clearRequested) {
				setError(`${field.label} ist erforderlich.`);
				return;
			}
			if (clearFlag && clearRequested) {
				payload[clearFlag] = "1";
			}
			if (String(value).trim() !== "") {
				payload[field.name] = value;
			}
		}

		setConnecting(true);
		try {
			const api = (window as any).hubjutsuapi ?? axios;
			const response = await api.post(route("integrations.oauth.connect", { provider: selectedService.provider }), payload, {
				headers: { Accept: "application/json" },
			});
			if (response?.data?.direct_connected) {
				setShowConnectModal(false);
				await load();
				return;
			}
			const redirectUrl = response?.data?.redirect_url;
			const summary = response?.data?.summary ?? {};
			if (!redirectUrl || typeof redirectUrl !== "string") {
				throw new Error("OAuth Redirect-URL fehlt.");
			}
			setShowConnectModal(false);

			openOauthSummaryPopup(redirectUrl, summary, selectedService.label || selectedService.provider, selectedService);
		} catch (err: any) {
			const message =
				err?.response?.data?.errors?.integration?.[0] ??
				err?.response?.data?.message ??
				err?.message ??
				"OAuth konnte nicht gestartet werden.";
			setError(message);
		} finally {
			setConnecting(false);
		}
	};

	const formatRemaining = (validUntil?: string | null): string => {
		if (!validUntil) return "ohne Ablauf";
		const target = new Date(validUntil);
		const diffMs = target.getTime() - Date.now();
		if (Number.isNaN(diffMs)) return "unbekannt";
		if (diffMs <= 0) return "abgelaufen";

		const minutes = Math.floor(diffMs / 1000 / 60);
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.floor(minutes / 60);
		if (hours < 48) return `${hours} h`;
		const days = Math.floor(hours / 24);
		return `${days} d`;
	};

	const deleteCredential = async (provider: string, credentialId: number) => {
		if (!scope) return;
		const confirmed = window.confirm("Verbindung wirklich löschen?");
		if (!confirmed) return;

		setError(null);
		setDeletingCredentialId(credentialId);
		try {
			const api = (window as any).hubjutsuapi ?? axios;
			await api.delete(route("integrations.oauth.disconnect", { provider }), {
				data: {
					credentialable_type: scope.type,
					credentialable_id: String(scope.id),
					credential_id: String(credentialId),
				},
				headers: { Accept: "application/json" },
			});
			await load();
		} catch (err: any) {
			const message =
				err?.response?.data?.message ??
				err?.message ??
				"Verbindung konnte nicht gelöscht werden.";
			setError(message);
		} finally {
			setDeletingCredentialId(null);
		}
	};

	if (!hasScope) {
		return null;
	}

	if (!loaded && !loading) {
		return null;
	}

	if (loaded && !error && services.length === 0) {
		return null;
	}

	return (
		<FormContainer className={className}>
			<FormSection title="Services" subtitle="Provider-Credentials für diesen Scope">
				<div className="space-y-3">
					{error ? (
						<div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
					) : null}

					<div className="text-sm text-text-500">{loading ? "Lade..." : `${services.length} Services verfügbar`}</div>

					<div className="space-y-2">
						{services.map((service) => (
							<div key={service.provider} className="rounded border border-gray-200 p-3 dark:border-gray-700">
								<div className="flex items-center justify-between gap-3">
									<div>
										<div className="font-semibold">{service.label}</div>
										<div className="text-xs text-text-500">{service.description || service.provider}</div>
									</div>
									<div className="text-xs">
										{service.configured ? (
											<span className="rounded bg-green-100 px-2 py-1 text-green-700">Konfiguriert</span>
										) : (
											<span className="rounded bg-amber-100 px-2 py-1 text-amber-700">Nicht verbunden</span>
										)}
									</div>
								</div>

								{service.credentials.length > 0 ? (
									<div className="mt-2 space-y-1 text-sm">
										{service.credentials.map((credential) => (
											<div key={credential.id} className="rounded bg-background-700 px-2 py-1">
												<div className="flex items-center justify-between gap-2">
													<div className="font-medium">{credential.name || `Credential #${credential.id}`}</div>
													{!disabled ? (
														<div className="flex items-center gap-2">
															<NeutralButton
																size="small"
																onClick={() => openReauthFor(service.provider, credential)}
																disabled={connecting || deletingCredentialId === credential.id}
															>
																Reauth
															</NeutralButton>
															<DangerButton
																size="small"
																onClick={() => deleteCredential(service.provider, credential.id)}
																disabled={connecting || deletingCredentialId === credential.id}
															>
																{deletingCredentialId === credential.id ? "Lösche..." : "Löschen"}
															</DangerButton>
														</div>
													) : null}
												</div>
												<div className="text-xs text-text-500">
													Status: {credential.status || "-"}
													{credential.valid_until ? ` | Valid until: ${new Date(credential.valid_until).toLocaleString()} (${formatRemaining(credential.valid_until)})` : ""}
												</div>
												{credential.token_preview ? (
													<div className="text-xs text-text-500">Token: {credential.token_preview}</div>
												) : null}
												{credential.has_refresh_token || credential.refresh_token_preview || credential.refresh_valid_until ? (
													<>
														<div className="text-xs text-text-500">
															Refresh: {credential.has_refresh_token ? "vorhanden" : "unbekannt"}
															{credential.refresh_valid_until
																? ` | Valid until: ${new Date(credential.refresh_valid_until).toLocaleString()} (${formatRemaining(credential.refresh_valid_until)})`
																: ""}
														</div>
														{credential.refresh_token_preview ? (
															<div className="text-xs text-text-500">Refresh Token: {credential.refresh_token_preview}</div>
														) : null}
													</>
												) : null}
												{credential.public_data_summary ? (
													<div className="text-xs text-text-500">{credential.public_data_summary}</div>
												) : null}
											</div>
										))}
									</div>
								) : null}

								{!disabled && (!service.configured || service.allow_multiple) ? (
									<div className="mt-2">
										<PrimaryButton onClick={() => openCreateFor(service.provider)}>
											{service.configured ? "Weiteren Zugang verbinden" : "Service verbinden"}
										</PrimaryButton>
									</div>
								) : null}
							</div>
						))}
					</div>

					{!disabled && unconfiguredServices.length === 0 ? (
						<p className="text-xs text-text-500">Alle verfügbaren Services sind bereits konfiguriert.</p>
					) : null}
				</div>
			</FormSection>

			<Modal
				show={showConnectModal}
				onClose={() => setShowConnectModal(false)}
				title={connectMode === "reauth" ? "Service reauthentifizieren" : "Service verbinden"}
				subtitle={selectedService ? `${selectedService.label} konfigurieren` : "Service konfigurieren"}
				maxWidth="lg"
			>
				<div className="space-y-3">
					{!selectedService ? (
						<p className="text-sm text-text-500">Kein Service ausgewählt.</p>
					) : (
						<>
							<div className="font-medium">{selectedService.label}</div>
							{(selectedService.setup_instructions && selectedService.setup_instructions.length > 0) || selectedService.setup_docs_url ? (
								<details
									className="rounded bg-background-700 px-3 py-2 text-xs text-text-500"
									open={connectMode !== "reauth"}
								>
									<summary className="cursor-pointer select-none font-medium text-text-700">Einrichtung</summary>
									<div className="mt-2 space-y-1">
										{(selectedService.setup_instructions ?? []).map((step, index) => (
											<div
												key={`${selectedService.provider}-modal-setup-${index}`}
												dangerouslySetInnerHTML={trustedHtml(`${index + 1}. ${step}`)}
											/>
										))}
										{selectedService.setup_docs_url ? (
											<a
												href={selectedService.setup_docs_url}
												target="_blank"
												rel="noreferrer"
												className="inline-block underline"
											>
												Dokumentation
											</a>
										) : null}
									</div>
								</details>
							) : null}
							<div className="rounded bg-background-700 px-3 py-2 text-xs text-text-500">
								<div className="font-medium text-text-700">Callback-URL / Redirect-URL</div>
								<code className="mt-1 block break-all rounded bg-background-600 px-2 py-1">
									{selectedService.redirect_uri || route("integrations.oauth.callback", { provider: selectedService.provider })}
								</code>
							</div>
							{selectedService.configured_scopes && selectedService.configured_scopes.length > 0 ? (
								<details className="rounded bg-background-700 px-3 py-2 text-xs text-text-500">
									<summary className="cursor-pointer select-none font-medium text-text-700">Scopes (fix pro Service)</summary>
									<div className="mt-2 space-y-1">
										{selectedService.configured_scopes.map((scope) => (
											<div key={`${selectedService.provider}-scope-${scope}`}>
												<code
													className="block overflow-hidden whitespace-nowrap text-right"
													title={scope}
													style={{ direction: "rtl", textOverflow: "ellipsis" }}
												>
													{scope}
												</code>
											</div>
										))}
									</div>
								</details>
							) : null}
							{(selectedService.connect_fields ?? []).map((field) => {
								if (field.type === "multicheck") {
									const values = Array.isArray(formData[field.name]) ? (formData[field.name] as string[]) : [];
									return (
										<div key={field.name} className="space-y-2">
											<label className="text-sm">{field.label}</label>
											<div className="grid grid-cols-1 gap-1 md:grid-cols-2">
												{(field.options ?? []).map((option) => (
													<label key={option} className="inline-flex items-center gap-2 text-sm">
														<Checkbox
															checked={values.includes(option)}
															onChange={(event) =>
																setFormData((prev) => {
																	const current = Array.isArray(prev[field.name]) ? (prev[field.name] as string[]) : [];
																	const next = event.target.checked
																		? Array.from(new Set([...current, option]))
																		: current.filter((entry) => entry !== option);
																	return {
																		...prev,
																		[field.name]: next,
																	};
																})
															}
														/>
														<span>{option}</span>
													</label>
												))}
											</div>
											{field.help ? <p className="text-xs text-text-500">{field.help}</p> : null}
										</div>
									);
								}

								return (
									<div key={field.name} className="space-y-1">
										{(() => {
											const hasExistingSecret = (() => {
												if (connectMode !== "reauth" || !selectedCredential) return false;
												if (field.name === "meta_app_secret") return !!selectedCredential.has_client_secret;
												if (field.name === "meta_system_user_token") return !!selectedCredential.has_system_user_token;
												return false;
											})();
											const isCleared = !!clearSecretFields[field.name];
											const placeholder = hasExistingSecret && !isCleared
												? "********"
												: (field.placeholder || "");

											return (
										<Input
											useForm={modalUseForm as any}
											inputName={field.name}
											label={field.label}
											type={field.type || "text"}
											placeholder={placeholder}
											autoComplete={field.type === "password" ? "new-password" : "off"}
											autoCorrect="off"
											autoCapitalize="none"
											spellCheck={false}
											data-lpignore="true"
											data-1p-ignore="true"
										/>
											);
										})()}
										{field.help ? <p className="text-xs text-text-500">{field.help}</p> : null}
										{(() => {
											const isPasswordField = (field.type || "").toLowerCase() === "password";
											const hasExistingSecret = (() => {
												if (connectMode !== "reauth" || !selectedCredential) return false;
												if (field.name === "meta_app_secret") return !!selectedCredential.has_client_secret;
												if (field.name === "meta_system_user_token") return !!selectedCredential.has_system_user_token;
												return false;
											})();
											if (!isPasswordField || !hasExistingSecret) return null;

											const isCleared = !!clearSecretFields[field.name];
											return (
												<div>
													<NeutralButton
														size="small"
														onClick={() =>
															setClearSecretFields((prev) => ({
																...prev,
																[field.name]: !prev[field.name],
															}))
														}
													>
														{isCleared ? "Nicht löschen" : "Löschen"}
													</NeutralButton>
												</div>
											);
										})()}
										{connectMode === "reauth" && (field.type || "").toLowerCase() === "password" ? (
											<p className="text-xs text-text-500">Leer lassen = vorhandenen Geheimcode beibehalten.</p>
										) : null}
									</div>
								);
							})}
							<div className="flex gap-2">
								<NeutralButton onClick={() => setShowConnectModal(false)} disabled={connecting}>Abbrechen</NeutralButton>
								<PrimaryButton onClick={connectSelected} disabled={connecting}>
									{connecting ? "Starte..." : (connectMode === "reauth" ? "Reauth starten" : "OAuth starten")}
								</PrimaryButton>
							</div>
						</>
					)}
				</div>
			</Modal>
		</FormContainer>
	);
}
