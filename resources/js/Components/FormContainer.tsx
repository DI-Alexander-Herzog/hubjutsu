import { HTMLAttributes } from "react";
import Container from "@/Components/Layout/Container";

export default function FormContainer({
	children,
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<Container size="large" className={className}>
			<div
				{...props}
				className={"p-4 sm:p-8 bg-background dark:bg-gray-800 shadow sm:rounded-lg w-full"}
			>
				{children}
			</div>
		</Container>
	);
}
