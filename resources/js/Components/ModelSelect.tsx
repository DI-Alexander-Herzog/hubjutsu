import React, { useState, useRef, useEffect } from "react";
import modelAPI from "@hubjutsu/api/modelAPI";
import { DataTableFormatter } from "./DataTableFormatter";

const inputClassName =
	"text-sm w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary rounded-md";

type ColumnConfig = {
	field: string;
	label: string;
	width?: string;
	formatter?: (row: Record<string, any>, field: string) => JSX.Element | string | Element;
};

type FilterConfig =
	| Record<string, any>
	| (() => Record<string, any>);

interface ModelSelectProps {
	id?: string;
	name?: string;
	className?: string;
	value?: any;
	model: string;
	initialObject?: Record<string, any>;
	labelField?: string;
	valueField?: string;
	placeholder?: string;
	filter?: FilterConfig;
	columns?: ColumnConfig[];
	debounce?: number;
	disabled?: boolean;
	returnObject?: boolean;
	onChange: (value: any) => void;
}

function useDebounce<T>(value: T, delay = 300) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const h = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(h);
	}, [value, delay]);
	return debounced;
}

const ModelSelect: React.FC<ModelSelectProps> = ({
	id,
	className = "",
	value,
	model,
	initialObject,
	labelField = "name",
	valueField = "id",
	placeholder = "Bitte auswählen…",
	filter,
	columns,
	debounce = 300,
	disabled = false,
	returnObject = false,
	onChange,
}) => {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [highlightIndex, setHighlightIndex] = useState(-1);
	const debounced = useDebounce(query, debounce);

	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);
	const listRef = useRef<HTMLTableSectionElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);

	const resolvedValue =
		typeof value === "object" && value !== null
			? value[valueField] ?? value.id
			: value;
	const fallbackLabel =
		typeof value === "object" && value !== null
			? value[labelField] ?? value.name
			: undefined;

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		const resolvedFilter =
			typeof filter === "function" ? filter() : filter ?? {};

		modelAPI(model as any)
			.search({
				order: [[labelField, 1]],
				search: debounced,
				filter: resolvedFilter,
			})
			.then((res) => setData(res.data))
			.finally(() => setLoading(false));
	}, [open, debounced, model, labelField, filter]);

	useEffect(() => {
		if (!open) return;
		const handler = (event: MouseEvent) => {
			const target = event.target as Node;
			if (containerRef.current && containerRef.current.contains(target)) {
				return;
			}
			setOpen(false);
		};
		window.addEventListener("mousedown", handler);
		return () => window.removeEventListener("mousedown", handler);
	}, [open]);

	useEffect(() => {
		if (!listRef.current || highlightIndex < 0) return;
		const el = listRef.current.querySelector(`tr[data-idx="${highlightIndex}"]`);
		if (el) {
			el.scrollIntoView({ block: "nearest" });
		}
	}, [highlightIndex]);

	const cols =
		columns ??
		[{ field: labelField, label: model, width: "100%" }];

	const initialObjectLabel = initialObject
		? initialObject[labelField] ?? initialObject.name
		: null;

	const selectedRow = data.find((row) => row[valueField] === resolvedValue);
	const selectedLabel =
		(
			selectedRow?.[labelField] ??
			fallbackLabel ??
			
			initialObjectLabel
		).toString();

	const handleSelect = (row: Record<string, any>) => {
		onChange(returnObject ? row : row[valueField]);
		setOpen(false);
		setQuery("");
		setHighlightIndex(-1);
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (!open) return;

		if (event.key === "Escape") {
			event.preventDefault();
			setOpen(false);
			triggerRef.current?.focus();
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setHighlightIndex((prev) => {
				const next = Math.min(prev + 1, data.length - 1);
				return next < 0 ? 0 : next;
			});
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			setHighlightIndex((prev) => Math.max(prev - 1, 0));
		}

		if (event.key === "Enter") {
			event.preventDefault();
			const row = data[highlightIndex];
			if (row) {
				handleSelect(row);
			}
		}
	};

	const popup =
		open && (
			<div
				ref={panelRef}
				className="absolute z-40 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-xl text-sm overflow-hidden"
			>
				<div className="sticky top-0 z-10 p-1 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
					<input
						autoFocus
						className={inputClassName}
						value={query}
						placeholder="Suchen…"
						onChange={(e) => {
							setQuery(e.target.value);
							setHighlightIndex(0);
						}}
						onKeyDown={handleKeyDown}
					/>
				</div>

				<div className="max-h-72 overflow-y-auto">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
							<tr>
								{cols.map((col) => (
									<th
										key={col.field}
										className="px-2 py-1 text-left border-b dark:border-gray-700"
										style={{ width: col.width }}
									>
										{col.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody ref={listRef}>
							{!loading &&
								data.map((rowData, idx) => (
									<tr
										key={rowData[valueField] ?? idx}
										data-idx={idx}
										className={`border-b dark:border-gray-700 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900 ${
											idx === highlightIndex
												? "bg-primary-100 dark:bg-primary-800"
												: ""
										}`}
										onClick={() => handleSelect(rowData)}
									>
										{cols.map((col) => (
											<td
												key={col.field}
												className="px-2 py-1 border-b dark:border-gray-700"
											>
												{col.formatter
													? col.formatter(rowData, col.field)
													: DataTableFormatter.default(rowData, col.field)}
											</td>
										))}
									</tr>
								))}

							{loading && (
								<tr>
									<td className="p-3 text-center opacity-60" colSpan={cols.length}>
										Lade…
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		);

	return (
		<div ref={containerRef} className={`relative w-full ${className}`}>
			<button
				type="button"
				id={id}
				ref={triggerRef}
				disabled={disabled}
				onClick={() => {
					if (disabled) return;
					setOpen((prev) => !prev);
				}}
				onKeyDown={handleKeyDown}
				className={`w-full relative text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 min-h-[42px] flex items-center justify-between cursor-pointer text-sm text-gray-900 dark:text-gray-100 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition ${
					disabled ? "opacity-60 cursor-not-allowed" : ""
				}`}
			>
				<span className="truncate pointer-events-none">
					{selectedLabel || placeholder}
				</span>
				<svg
					className={`w-4 h-4 ml-2 pointer-events-none text-gray-500 dark:text-gray-400 transition-transform ${
						open ? "rotate-180" : ""
					}`}
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{popup}
		</div>
	);
};

export default ModelSelect;
