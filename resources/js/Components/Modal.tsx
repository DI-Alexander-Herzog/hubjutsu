import { PropsWithChildren } from "react";
import {
	Dialog,
	DialogPanel,
	Transition,
	TransitionChild,
} from "@headlessui/react";
import NeutralButton from "@/Components/NeutralButton";
import DangerButton from "@/Components/DangerButton";
import PrimaryButton from "@/Components/PrimaryButton";

export default function Modal({
	children,
	show = false,
	maxWidth = "2xl",
	closeable = true,
	onClose = () => {},
	title,
	subtitle,
	primaryButtonText,
	secondaryButtonText,
	onPrimaryClick,
	onSecondaryClick,
	primaryButtonDisabled = false,
	primaryButtonType = "danger",
}: PropsWithChildren<{
	show: boolean;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "screen";
	closeable?: boolean;
	onClose: CallableFunction;
	title?: string;
	subtitle?: string;
	primaryButtonText?: string;
	secondaryButtonText?: string;
	onPrimaryClick?: () => void;
	onSecondaryClick?: () => void;
	primaryButtonDisabled?: boolean;
	primaryButtonType?: "danger" | "primary";
}>) {
	const close = () => {
		if (closeable) {
			onClose();
		}
	};

	const maxWidthClass = {
		sm: "sm:max-w-sm",
		md: "sm:max-w-md",
		lg: "sm:max-w-lg",
		xl: "sm:max-w-xl",
		"2xl": "sm:max-w-2xl",
		screen: "w-[95vw] sm:w-[90vw] lg:w-[80vw] sm:max-w-[80vw]",
	}[maxWidth];

	const renderPrimaryButton = () => {
		if (!primaryButtonText || !onPrimaryClick) return null;

		if (primaryButtonType === "danger") {
			return (
				<DangerButton
					className="ms-3"
					disabled={primaryButtonDisabled}
					onClick={onPrimaryClick}
				>
					{primaryButtonText}
				</DangerButton>
			);
		}

		return (
			<PrimaryButton
				className="ms-3  "
				disabled={primaryButtonDisabled}
				onClick={onPrimaryClick}
			>
				{primaryButtonText}
			</PrimaryButton>
		);
	};

	return (
		<Transition show={show} leave="duration-200">
			<Dialog
				as="div"
				id="modal"
				className="fixed inset-0 flex overflow-y-auto px-4 py-6 sm:px-0 items-center z-50 transform transition-all"
				onClose={close}
			>
				<TransitionChild
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="absolute inset-0 bg-gray-500/75 dark:bg-gray-900/75" />
				</TransitionChild>

				<TransitionChild
					enter="ease-out duration-300"
					enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
					enterTo="opacity-100 translate-y-0 sm:scale-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100 translate-y-0 sm:scale-100"
					leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
				>
					<DialogPanel
						className={`mb-6 bg-background dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl transform transition-all sm:w-full sm:mx-auto ${maxWidthClass}`}
					>
						{(title || subtitle) && (
							<div className="p-6 pb-3">
								{title && (
									<h2 className="text-lg font-medium text-text-900 dark:text-gray-100">
										{title}
									</h2>
								)}
								{subtitle && (
									<p className="mt-1 text-sm text-text-600 dark:text-gray-400">
										{subtitle}
									</p>
								)}
							</div>
						)}

						<div className="p-6 pt-3">{children}</div>

						{(primaryButtonText || secondaryButtonText) && (
							<div className="px-6 py-4 flex justify-end">
								{secondaryButtonText && (
									<NeutralButton onClick={onSecondaryClick || close}>
										{secondaryButtonText}
									</NeutralButton>
								)}
								{renderPrimaryButton()}
							</div>
						)}
					</DialogPanel>
				</TransitionChild>
			</Dialog>
		</Transition>
	);
}
