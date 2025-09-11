import React from "react";
import { Link, InertiaLinkProps } from "@inertiajs/react";
import classNames from "classnames";

interface DataTableLinkProps
	extends Omit<InertiaLinkProps, "className" | "href"> {
	children: React.ReactNode;
	className?: string;
	variant?: "default" | "button";
	href?: string;
	target?: string;
}

const ExternalLink: React.FC<{
	href: string;
	className: string;
	target?: string;
	children: React.ReactNode;
}> = ({ href, className, target, children }) => (
	<a
		href={href}
		target={target ?? "_blank"}
		rel="noopener noreferrer"
		className={className}
	>
		{children}
	</a>
);

const DataTableLink: React.FC<DataTableLinkProps> = ({
	children,
	className = "",
	variant = "default",
	href,
	target = "_self",
	...props
}) => {
	const baseClasses =
		"text-primary hover:text-primary/80 transition-colors duration-200";

	const variantClasses = {
		default: "hover:underline",
		button:
			"inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
	};

	const combinedClasses = classNames(
		baseClasses,
		variantClasses[variant],
		className
	);

	const isExternal = (url?: string) => {
		if (!url) return false;

		try {
			const currentHost = window.location.origin;
			const urlObj = new URL(url, currentHost);
			return urlObj.origin !== currentHost;
		} catch {
			return url.startsWith("mailto:") || url.startsWith("tel:");
		}
	};

	if (href && isExternal(href)) {
		return (
			<ExternalLink href={href} target={target} className={combinedClasses}>
				{children}
			</ExternalLink>
		);
	}

	return (
		<Link
			href={href ?? "#"}
			className={combinedClasses}
			{...props}
			preserveState={true}
			preserveScroll={true}
		>
			{children}
		</Link>
	);
};

export default DataTableLink;
