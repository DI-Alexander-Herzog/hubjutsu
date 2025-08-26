import React from "react";
import { Link, InertiaLinkProps } from "@inertiajs/react";
import classNames from "classnames";

interface DataTableLinkProps extends Omit<InertiaLinkProps, "className"> {
	children: React.ReactNode;
	className?: string;
	variant?: "default" | "button";
}

const DataTableLink: React.FC<DataTableLinkProps> = ({
	children,
	className = "",
	variant = "default",
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

	return (
		<Link className={combinedClasses} {...props}>
			{children}
		</Link>
	);
};

export default DataTableLink;
