import classNames from "classnames";
import { ReactNode, useState } from "react";
import axios from "axios";
import PrimaryButton from "./PrimaryButton";
import { Transition } from "@headlessui/react";

type FormSectionType = {
	title: string;
	subtitle?: string;
	children?: ReactNode;
	className?: string;
	apiConfig?: {
		route: string;
		method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
		params?: Record<string, any>;
		withRelations?: string[];
		onSuccess?: (response: any) => void;
		onError?: (error: any) => void;
		showSaveButton?: boolean;
		saveButtonText?: string;
		disableSaveButton?: boolean;
	};
	formData?: Record<string, any>;
	onSave?: () => void;
};

export default function FormSection({
	title,
	subtitle,
	children,
	className = "",

	apiConfig,
	formData,

	onSave,
}: FormSectionType) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<any>(null);
	const [recentlySuccessful, setRecentlySuccessful] = useState(false);

	const handleSave = async () => {
		if (onSave) {
			if (loading) return;
			setLoading(true);
			try {
				await onSave();
				setRecentlySuccessful(true);
				setTimeout(() => setRecentlySuccessful(false), 2000);
			} catch (err: any) {
				setError(err);
			} finally {
				setLoading(false);
			}
			return;
		}

		if (!apiConfig) return;

		if (loading) return;
		setLoading(true);
		setError(null);

		try {
			const method = apiConfig.method || "POST";
			const url = apiConfig.route;
			const data = apiConfig.params || formData || {};

			const csrf =
				document
					.querySelector('meta[name="csrf-token"]')
					?.getAttribute("content") || "";

			const axiosCfg = {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"X-CSRF-TOKEN": csrf,
					Accept: "application/json",
				},
				withCredentials: true,
			};

			let response;
			if (method === "GET") {
				response = await axios.get(url, { ...axiosCfg, params: data });
			} else if (method === "POST") {
				response = await axios.post(url, data, axiosCfg);
			} else if (method === "PUT") {
				response = await axios.put(url, data, axiosCfg);
			} else if (method === "PATCH") {
				response = await axios.patch(url, data, axiosCfg);
			} else if (method === "DELETE") {
				response = await axios.delete(url, { ...axiosCfg, data });
			}

			setRecentlySuccessful(true);
			setTimeout(() => setRecentlySuccessful(false), 2000);

			if (apiConfig.onSuccess && response) {
				apiConfig.onSuccess(response.data);
			}
		} catch (err: any) {
			setError(err);
			if (apiConfig.onError) apiConfig.onError(err);
		} finally {
			setLoading(false);
		}
	};

	const renderSaveButton = () => {
		if (!apiConfig?.showSaveButton && !onSave) return null;

		return (
			<div className="flex items-center gap-4 mt-6">
				<PrimaryButton
					type="button"
					disabled={loading || apiConfig?.disableSaveButton}
					onClick={handleSave}
					className=""
				>
					{loading ? "Saving..." : apiConfig?.saveButtonText || "Save"}
				</PrimaryButton>

				{recentlySuccessful && (
					<Transition
						show={recentlySuccessful}
						enter="transition ease-in-out"
						enterFrom="opacity-0"
						leave="transition ease-in-out"
						leaveTo="opacity-0"
					>
						<p className="text-sm text-gray-600 dark:text-gray-400">Saved.</p>
					</Transition>
				)}

				{error && (
					<p className="text-sm text-red-600 dark:text-red-400">
						Error:{" "}
						{error.response?.data?.message ||
							error.message ||
							"Something went wrong"}
					</p>
				)}
			</div>
		);
	};

	return (
		<div
			className={classNames(
				"w-full md:grid md:grid-cols-3 md:gap-6 md:items-start",
				className
			)}
		>
			<div className="md:col-span-1 w-full md:pt-6">
				<div className="px-4 sm:px-0 w-full">
					<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
						{title}
					</h3>
					{subtitle && (
						<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
							{subtitle}
						</p>
					)}
				</div>
			</div>

			<div className="mt-5 md:mt-0 md:col-span-2 w-full">
				<div className="w-full p-6 bg-white dark:bg-gray-800 sm:rounded-lg">
					{children}
					{renderSaveButton()}
				</div>
			</div>
		</div>
	);
}
