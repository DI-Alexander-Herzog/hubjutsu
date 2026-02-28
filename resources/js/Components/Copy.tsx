import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { CheckCircleIcon, ClipboardDocumentIcon } from "@heroicons/react/20/solid";
import { createPortal } from "react-dom";

interface CopyProps {
	children?: React.ReactNode;
	value?: string;
	getValue?: () => string | Promise<string>;
	onCopy?: () => void | Promise<void>;
	label?: React.ReactNode;
	className?: string;
	iconClassName?: string;
	successText?: string;
	disabled?: boolean;
	variant?: "auto" | "button" | "inline";
}

const fallbackCopy = (text: string) => {
	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "true");
	textarea.style.position = "absolute";
	textarea.style.left = "-9999px";
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand("copy");
	document.body.removeChild(textarea);
};

const extractText = (node: React.ReactNode): string => {
	if (node === null || node === undefined) return "";
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(extractText).join("");
	if (React.isValidElement(node)) return extractText((node.props as any)?.children);
	return "";
};

const Copy: React.FC<CopyProps> = ({
	children,
	value,
	getValue,
	onCopy,
	label = "Copy",
	className = "",
	iconClassName = "",
	successText = "Kopiert!",
	disabled = false,
	variant = "auto",
}) => {
	const [showSuccess, setShowSuccess] = useState(false);
	const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
	const hideTimerRef = useRef<number | null>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const hasChildren = children !== undefined && children !== null;
	const mode = variant === "auto" ? (hasChildren ? "inline" : "button") : variant;

	useEffect(() => {
		return () => {
			if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
		};
	}, []);

	const handleCopy = async () => {
		if (disabled) return;
		if (onCopy) {
			await onCopy();
		} else {
			const text = getValue ? await getValue() : (value ?? extractText(children));
			if (!text) return;
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				fallbackCopy(text);
			}
		}
		setShowSuccess(true);
		const rect = buttonRef.current?.getBoundingClientRect();
		if (rect) {
			setPopoverPosition({
				top: rect.top - 10,
				left: rect.left + rect.width / 2,
			});
		}
		if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
		hideTimerRef.current = window.setTimeout(() => {
			setShowSuccess(false);
			setPopoverPosition(null);
		}, 1000);
	};

	useEffect(() => {
		if (!showSuccess) return;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			setPopoverPosition({
				top: rect.top - 10,
				left: rect.left + rect.width / 2,
			});
		};
		window.addEventListener("scroll", updatePosition, true);
		window.addEventListener("resize", updatePosition);
		return () => {
			window.removeEventListener("scroll", updatePosition, true);
			window.removeEventListener("resize", updatePosition);
		};
	}, [showSuccess]);

	return (
		<span className="relative inline-flex">
			<button
				ref={buttonRef}
				type="button"
				onClick={() => {
					void handleCopy();
				}}
				disabled={disabled}
				className={classNames(
					mode === "button"
						? "inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-background px-2.5 py-1.5 text-xs font-medium text-text-900 shadow-sm transition-colors hover:bg-background-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
						: "inline-flex items-center gap-1 rounded text-inherit underline decoration-dotted underline-offset-4 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
					className
				)}
			>
				{mode === "button" ? <span>{label}</span> : <span>{children}</span>}
				<ClipboardDocumentIcon
					className={classNames(mode === "button" ? "h-4 w-4 opacity-90" : "h-3.5 w-3.5 opacity-70", iconClassName)}
				/>
			</button>

			{showSuccess &&
				popoverPosition &&
				typeof document !== "undefined" &&
				createPortal(
					<span
						className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-green-300 bg-green-100 px-2 py-1 text-xs font-semibold text-green-900 shadow-md dark:border-green-500 dark:bg-green-900 dark:text-green-100"
						style={{
							left: `${popoverPosition.left}px`,
							top: `${popoverPosition.top}px`,
						}}
					>
						<span className="inline-flex items-center gap-1">
							<CheckCircleIcon className="h-4 w-4" />
							{successText}
						</span>
					</span>,
					document.body
				)}
		</span>
	);
};

export default Copy;
