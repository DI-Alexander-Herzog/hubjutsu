import classNames from "classnames";
import { ReactNode } from "react";

type FormSectionType = {
	title?: string;
	subtitle?: string;
	children?: ReactNode;
	className?: string;
	boxed?: boolean;
	
};

export default function FormSection({
	title,
	subtitle,
	children,
	className = "",
	boxed = false
}: FormSectionType) {

	return (
		<div
			className={classNames(
				{
					"w-full": !boxed,
					"max-w-7xl mx-auto": boxed
				},
				"md:grid md:grid-cols-3 md:gap-6 md:items-start",
				className
			)}
		>
			<div className="md:col-span-1 w-full ">
				<div className="px-4 sm:px-0 w-full">
					{title && <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
						{title}
					</h3>}
					{subtitle && (
						<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
							{subtitle}
						</p>
					)}
				</div>
			</div>

			<div className="mt-5 md:mt-0 md:col-span-2 w-full">
				<div className="w-full p-2 bg-white dark:bg-gray-800 sm:rounded-lg flex flex-col gap-2">
					{children}
				</div>
			</div>
		</div>
	);
}
