import React from "react";

interface ColorInputProps {
	id?: string;
	value?: string | null;
	disabled?: boolean;
	className?: string;
	onChange: (value: string) => void;
	onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

const textInputClass =
	"text-sm w-full px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary rounded-md";

const isValidHex = (val: string | null | undefined) =>
	typeof val === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val.trim());

const fallbackColor = "#000000";

const ColorInput: React.FC<ColorInputProps> = ({
	id,
	value,
	disabled = false,
	className = "",
	onChange,
	onKeyDown,
}) => {
	const textValue = value ?? "";
	const pickerValue = isValidHex(textValue) ? textValue : fallbackColor;

	return (
		<div className={`flex items-center gap-3 ${className}`}>
			<label className="relative w-10 h-10 rounded-md border border-gray-300 dark:border-gray-600 shadow-inner overflow-hidden">
				<span
					className="absolute inset-0"
					style={{ backgroundColor: pickerValue }}
				/>
				<input
					type="color"
					className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
					value={pickerValue}
					disabled={disabled}
					onChange={(event) => onChange(event.target.value)}
				/>
			</label>
			<input
				id={id}
				type="text"
				value={textValue}
				disabled={disabled}
				onKeyDown={onKeyDown}
				onChange={(event) => onChange(event.target.value)}
				placeholder="#000000"
				className={textInputClass}
			/>
		</div>
	);
};

export default ColorInput;
