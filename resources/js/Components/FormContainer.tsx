import { HTMLAttributes } from "react";
import Container from "@/Components/Layout/Container";
import Card from "@/Components/Layout/Card";

type FormContainerProps = HTMLAttributes<HTMLDivElement> & {
	size?: "small" | "medium" | "large";
	gap?: "none" | "sm" | "md" | "lg";
	stack?: boolean;
};

export default function FormContainer({
	children,
	className,
	size = "large",
	gap = "none",
	stack = false,
	...props
}: FormContainerProps) {
	return (
		<Container size={size} gap={gap} stack={stack} className={className}>
			<Card className="w-full" bodyClassName="p-0">
				<div
					{...props}
					className="p-4 sm:p-8 w-full"
				>
					{children}
				</div>
			</Card>
		</Container>
	);
}
