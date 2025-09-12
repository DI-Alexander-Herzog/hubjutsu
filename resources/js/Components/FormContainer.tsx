
import { HTMLAttributes } from "react";

export default function FormContainer({
	children,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return <div
		{...props}
		className={"p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg max-w-7xl mx-auto my-6 "}
	>
		{children}
	</div>;
}
