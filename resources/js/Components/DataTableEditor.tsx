import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import axios from "axios";
import { DataTableFormatter } from "./DataTableFormatter";
import ColorInput from "./ColorInput";
import modelAPI from "@hubjutsu/api/modelAPI";
import { createPortal } from "react-dom";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { MEDIA_DELETE_FLAG, isMediaMarkedForDeletion, markMediaForDeletion } from "../constants/media";


interface BaseEditorConfig {
    type: string;
}

export interface SelectEditorConfig extends BaseEditorConfig {
    type: "select";
    options: Array<{ label: string; value: any }>;
}

export interface NumberEditorConfig extends BaseEditorConfig {
    type: "number";
    min?: number;
    max?: number;
    step?: number;
}

export interface BooleanEditorConfig extends BaseEditorConfig {
    type: "boolean";
}

export interface DatetimeEditorConfig extends BaseEditorConfig {
    type: "datetime";
}

export interface ModelEditorConfig extends BaseEditorConfig {
    type: "model";
    model: string;
    filter?: (row: Record<string, any>) => Record<string, any>;
    valueField?: string;
    labelField: string;
    debounce?: number;   // optional
	columns?: Array<{ field: string; label: string, width?: string, formatter?: (row: Record<string, any>, field: string) => JSX.Element | string | Element; }>;
}

export interface MediaEditorConfig extends BaseEditorConfig {
	type: "media";
	accept?: string;
	label?: string;
	className?: string;
	attributes?: Record<string, any>;
}
export type EditorConfig =
    | SelectEditorConfig
    | NumberEditorConfig
    | BooleanEditorConfig
    | DatetimeEditorConfig
    | ModelEditorConfig
    | MediaEditorConfig;


interface DataTableEditorColumn {
	field: string;
	editor?: string | EditorConfig | ((props: DataTableCustomEditorProps) => React.ReactNode);
	/**
 	 * @deprecated Nicht mehr verwenden. 
	 * Wurde durch "editor: { type: 'select', ... }" ersetzt.
	 */
	editor_properties?: Record<string, any>;
	formatter?: ((row: Record<string, any>, field: string) => JSX.Element | string | Element) | undefined;
}

interface DataTableEditorProps {
	editor: DataTableEditorColumn["editor"];
	column: DataTableEditorColumn;
	row: Record<string, any>;
	datakey: string;
	rowIndex: number;
	onValueChange: (id: number, field: string, value: any) => void;
	onKeyDown: (
		event: React.KeyboardEvent<HTMLElement>,
		field: string,
		row: Record<string, any>,
		rowIndex: number
	) => void;
}

export interface DataTableCustomEditorProps {
	column: DataTableEditorColumn;
	row: Record<string, any>;
	rowIndex: number;
	datakey: string;
	defaultValue: any;
	onValueChange: (value: any) => void;
	onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
	editorProperties?: Record<string, any>;
}

type EditorRenderer = (props: {
	column: DataTableEditorColumn;
	row: Record<string, any>;
	className: string;
	onValueChange: (value: any) => void;
	onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}) => JSX.Element;

const editorClassName =
	"text-sm w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary rounded-md";

const getMediaPreview = (value: any): string | null => {
	if (isMediaMarkedForDeletion(value)) return null;
	if (!value) return null;
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		return value.thumbnail ?? value.url ?? null;
	}
	return null;
};

const getMediaLabel = (value: any): string => {
	if (isMediaMarkedForDeletion(value)) return "Wird gelöscht";
	if (!value) return "";
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		return value.name ?? value.filename ?? value.id ?? "";
	}
	return "";
};

const numberEditor: EditorRenderer = ({ column, row, onValueChange, onKeyDown, className }) => (
	<input
		type="number"
		defaultValue={row[column.field]}
		onKeyDown={(event) => onKeyDown(event)}
		className={className}
		{...column.editor_properties}
		onChange={(event) =>
			onValueChange(event.target.value)
		}
	/>
);

const datetimeEditor: EditorRenderer = ({ column, row, onValueChange, onKeyDown, className }) => (
	<input
		type="datetime-local"
		defaultValue={
			row[column.field]
				? DateTime.fromISO(row[column.field], { zone: "utc" })
					.setZone("Europe/Vienna")
					.toFormat("yyyy-MM-dd'T'HH:mm:ss")
				: ""
		}
		onKeyDown={(event) => onKeyDown(event)}
		className={className}
		{...column.editor_properties}
		onChange={(event) =>
			onValueChange(event.target.value)
		}
	/>
);

const selectEditor: EditorRenderer = ({ column, row, onValueChange, onKeyDown, className }) => (
	<select
		defaultValue={row[column.field]}
		onKeyDown={(event) => onKeyDown(event)}
		className={className}
		{...column.editor_properties}
		onChange={(event) =>
			onValueChange(event.target.value)
		}
	>
		<option value="">-- Select --</option>
		{column.editor_properties?.options?.map((option: any, index: number) => (
			<option key={index} value={option.value}>
				{option.label}
			</option>
		))}
	</select>
);

const booleanEditor: EditorRenderer = ({ column, row, onValueChange, onKeyDown, className }) => {
	const checked = row[column.field] && row[column.field] != '0';
	
	return <label className={"inline-flex items-center cursor-pointer align-middle ml-2"}>
		<input {...column.editor_properties} name={column.field} onKeyDown={onKeyDown} type="checkbox" value="1" className="sr-only peer" checked={checked} onChange={() => onValueChange(!checked)} />
  		<div className={
			"relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 " +
			"rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white " + 
			"after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full " +
			"after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 dark:peer-checked:bg-primary-600 "
		}></div>
  	</label>;
};

const mediaEditor: EditorRenderer = ({ column, row, onValueChange, onKeyDown }) => {
	const editorProps = column.editor_properties ?? {};
	const currentValue = row[column.field];
	const markedForDeletion = isMediaMarkedForDeletion(currentValue);
	const [preview, setPreview] = useState<string | null>(getMediaPreview(currentValue));
	const [label, setLabel] = useState<string>(getMediaLabel(currentValue));
	const [progress, setProgress] = useState(0);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setPreview(getMediaPreview(currentValue));
		setLabel(getMediaLabel(currentValue));
	}, [currentValue]);

	const uploadFile = useCallback(
		async (file: File) => {
			const chunkSize = 1024 * 512;
			const uploadId = uuidv4();
			const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

			setUploading(true);
			setError(null);
			setProgress(0);

			try {
				for (let i = 0; i < totalChunks; i++) {
					const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
					const form = new FormData();
					form.append("chunk", chunk);
					form.append("upload_id", uploadId);
					form.append("chunk_index", i.toString());
					form.append("total_chunks", totalChunks.toString());
					form.append("filename", file.name);

					const response = await axios.post("/media/chunked-upload", form, {
						onUploadProgress: (event) => {
							if (!event.total) return;
							const percent = Math.min(
								100,
								((i + event.loaded / event.total) / totalChunks) * 100
							);
							setProgress(percent);
						},
					});

					if (response.data?.error) {
						throw new Error(response.data.error);
					}

					if (response.data?.done) {
						const uploaded = response.data.media;
						setPreview(getMediaPreview(uploaded));
						setLabel(getMediaLabel(uploaded));
						setProgress(100);
						const cleaned = { ...uploaded };
						delete cleaned[MEDIA_DELETE_FLAG];
						onValueChange(cleaned);
						break;
					}
				}
			} catch (err) {
				console.error(err);
				setError("Upload fehlgeschlagen");
			} finally {
				setUploading(false);
			}
		},
		[onValueChange]
	);

	const onDrop = useCallback(
		(accepted: File[]) => {
			const file = accepted[0];
			if (!file) return;

			const isImage = file.type.startsWith("image/");
			const tempUrl = isImage ? URL.createObjectURL(file) : null;
			if (tempUrl) {
				setPreview(tempUrl);
			} else {
				setPreview(null);
			}
			setLabel(file.name);
			setProgress(0);
			setError(null);

			uploadFile(file).finally(() => {
				if (tempUrl) {
					URL.revokeObjectURL(tempUrl);
				}
			});
		},
		[uploadFile]
	);

	const dropzoneAccept = useMemo(() => {
		if (!editorProps.accept) return undefined;
		if (typeof editorProps.accept === "string") {
			return { [editorProps.accept]: [] };
		}
		return editorProps.accept;
	}, [editorProps.accept]);

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		onDrop,
		accept: dropzoneAccept,
		multiple: false,
		noKeyboard: true,
		noClick: true,
	});
	const rootProps = getRootProps({
		onClick: (event) => {
			event.stopPropagation();
			open();
		},
	});

	const handleRemove = () => {
		const marked = markMediaForDeletion(currentValue);
		setPreview(null);
		setLabel(getMediaLabel(marked));
		setProgress(0);
		setError(null);
		onValueChange(marked);
	};

	return (
		<div
			className="flex items-center gap-3 text-xs text-gray-800 dark:text-gray-100"
			tabIndex={0}
			onKeyDown={(event) => onKeyDown(event)}
		>
			<div
				{...rootProps}
				className={`group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed transition ${
					isDragActive
						? "border-primary-500 bg-primary-50"
						: "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
				} ${uploading ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
				title={label || "Datei hochladen"}
			>
				<input {...getInputProps()} />
				{preview ? (
					<img
						src={preview}
						alt={label || "media"}
						className="absolute inset-0 h-full w-full object-cover"
					/>
				) : (
					<ArrowUpTrayIcon className="h-6 w-6 text-gray-400 group-hover:text-primary-500" />
				)}
				<div
					className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium text-white transition ${
						isDragActive || uploading
							? "bg-black/60 opacity-100"
							: "bg-black/60 opacity-0 group-hover:opacity-100"
					}`}
				>
					{uploading ? "Upload…" : "Ändern"}
				</div>
				{uploading && (
					<div
						className="absolute bottom-0 left-0 h-1 bg-primary-500 transition-all"
						style={{ width: `${progress}%` }}
					/>
				)}
			</div>

			<div className="min-w-0 space-y-1">
				{label && (
					<span className="block truncate text-[11px] text-gray-600 dark:text-gray-300">
						{label}
					</span>
				)}
				{!markedForDeletion && currentValue && (
					<button
						type="button"
						className="text-[11px] text-red-500 hover:text-red-600"
						onClick={(event) => {
							event.stopPropagation();
							handleRemove();
						}}
						disabled={uploading}
					>
						Entfernen
					</button>
				)}
				{error && <span className="block text-[11px] text-red-500">{error}</span>}
			</div>
		</div>
	);
};

const colorEditor: EditorRenderer = ({ column, row, onValueChange, onKeyDown }) => {
	return (
		<ColorInput
			value={row[column.field] ?? ""}
			className="w-full"
			disabled={column.editor_properties?.disabled}
			onKeyDown={onKeyDown}
			onChange={(val) => onValueChange(val)}
		/>
	);
};


const defaultEditor: EditorRenderer = ({ column, row, onValueChange, onKeyDown, className }) => (
	<input
		type={typeof column.editor === "string" ? column.editor : "text"}
		defaultValue={row[column.field]}
		onKeyDown={(event) => onKeyDown(event)}
		className={className}
		{...column.editor_properties}
		onChange={(event) =>
			onValueChange(event.target.value)
		}
	/>
);

function useDebounce(value: any, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const h = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(h);
    }, [value, delay]);
    return debounced;
}

export const ModelEditor: EditorRenderer = ({
    column,
    row,
    onValueChange,
    onKeyDown,
}) => {
    const cfg = column.editor as ModelEditorConfig;
    const [open, setOpen] = useState(false);

	const [highlightIndex, setHighlightIndex] = useState<number>(-1);
	const listRef = useRef<HTMLTableSectionElement | null>(null);

    const panelRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

    // Query / search
    const [query, setQuery] = useState("");
    const debounced = useDebounce(query, cfg.debounce ?? 300);

    // Data
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    const valueField = cfg.valueField ?? "id";
    const labelField = cfg.labelField ?? "name";

	const handleListKey = (e: React.KeyboardEvent) => {
		if (!open) return;

		if (e.key === "Escape") {
			e.preventDefault();
			setOpen(false);
			triggerRef.current?.focus();
			return;
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlightIndex(i => {
				const next = Math.min(i + 1, data.length - 1);
				return next < 0 ? 0 : next;
			});
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlightIndex(i => Math.max(i - 1, 0));
		}

		if (e.key === "Enter") {
			e.preventDefault();
			const row = data[highlightIndex];
			if (row) {
				onValueChange(row[valueField]);
				setOpen(false);
				triggerRef.current?.focus();
			}
		}
	};

	useEffect(() => {
		if (!listRef.current || highlightIndex < 0) return;

		const el = listRef.current.querySelector(`tr[data-idx="${highlightIndex}"]`);
		if (el) {
			el.scrollIntoView({ block: "nearest" });
		}
	}, [highlightIndex]);


    // Load data
    useEffect(() => {
        if (!open) return;

        setLoading(true);

        modelAPI(cfg.model as any)
            .search({
				order: [[labelField, 1]],
                search: debounced,
                filter: cfg.filter ? cfg.filter(row) : {},
            })
            .then((res) => {
                setData(res.data);
            })
            .finally(() => setLoading(false));
    }, [open, debounced]);

    // Position popup on open
    useEffect(() => {
        if (!open || !triggerRef.current) return;

        const r = triggerRef.current.getBoundingClientRect();
        setPos({
            top: r.bottom + window.scrollY + 2,
            left: r.left + window.scrollX,
            width: r.width,
        });
    }, [open]);

    // Close on outside click
	useEffect(() => {
		if (!open) return;

		const handler = (e: MouseEvent) => {
			const target = e.target as Node;

			const insideTrigger = triggerRef.current && triggerRef.current.contains(target);
			const insidePanel = panelRef.current && panelRef.current.contains(target);

			if (insideTrigger || insidePanel) return;

			setOpen(false);
		};

		window.addEventListener("mousedown", handler);
		return () => window.removeEventListener("mousedown", handler);
	}, [open]);

    // Selected label (fallback falls Liste noch nicht geladen)
    const selectedValue = row[column.field];
    const selectedLabel =
        data.find((r) => r[valueField] === selectedValue)?.[labelField] ?? (column.formatter ? column.formatter(row, column.field) : selectedValue);

    const cols =
        cfg.columns ??
        [{ field: labelField, label: cfg.model, width: "100%" }];

    const popup = open && createPortal(
            <div
                className="z-50 bg-white dark:bg-gray-800 border border-gray-300 
                           dark:border-gray-700 rounded-md shadow-xl
                           max-h-[300px] overflow-auto text-sm"
                style={{
                    position: "absolute",
                    top: pos.top,
                    left: pos.left,
                    width: Math.max(pos.width * 2, 600),
                }}
				ref={panelRef}
            >
                <div className="sticky top-0 z-10 p-1 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
					<input
						autoFocus
						className={editorClassName}
						value={query}
						placeholder="Suchen…"
						onChange={(e) => {
							setQuery(e.target.value);
							setHighlightIndex(0); // Reset Highlight bei neuer Suche
						}}
						onKeyDown={handleListKey}
					/>
				</div>

                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                        <tr>
                            {cols.map((c) => (
                                <th
                                    key={c.field}
                                    className="px-2 py-1 text-left border-b dark:border-gray-700"
                                    style={{ width: c.width }}
                                >
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody ref={listRef}>
                        {!loading &&
                            data.map((r, idx) => (
                                <tr
                                    key={idx}
                                    className={`
										border-b dark:border-gray-700 cursor-pointer
										hover:bg-primary-50 dark:hover:bg-primary-900
										${idx === highlightIndex ? "bg-primary-100 dark:bg-primary-800" : ""}
									`}
                                    onClick={() => {
                                        onValueChange(r[valueField]);
                                        setOpen(false);
										triggerRef.current?.focus();
                                    }}
                                >
                                    {cols.map((c) => (
                                        <td
                                            key={c.field}
                                            className="px-2 py-1 border-b dark:border-gray-700"
                                        >
                                            {c.formatter
                                                ? c.formatter(r, c.field)
                                                : DataTableFormatter.default(
                                                      r,
                                                      c.field
                                                  )}
                                        </td>
                                    ))}
                                </tr>
                            ))}

                        {loading && (
                            <tr>
                                <td
                                    className="p-3 text-center opacity-60"
                                    colSpan={cols.length}
                                >
                                    Lade…
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>,
            document.body
        );

    return (
        <>
            <button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen(v => !v)}
				onKeyDown={(e) => {
					onKeyDown(e);
					handleListKey(e);   // ← deine Navigation
				}}
				className="
					w-full relative text-left
					bg-white dark:bg-gray-800
					border border-gray-300 dark:border-gray-600
					rounded-md
					px-2 py-1
					flex items-center justify-between
					cursor-pointer
					text-sm
					text-gray-900 dark:text-gray-100
					hover:border-primary
					focus:outline-none
					focus:ring-2 focus:ring-primary
					transition
				"
			>
				<span className="truncate pointer-events-none">
					{selectedLabel || "Bitte auswählen…"}
				</span>

				<svg
					className={`
						w-4 h-4 ml-2 pointer-events-none text-gray-500 dark:text-gray-400
						transition-transform 
						${open ? "rotate-180" : ""}
					`}
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
            {popup}
        </>
    );
};

const editorMap: Record<string, EditorRenderer> = {
	number: numberEditor,
	datetime: datetimeEditor,
	select: selectEditor,
	boolean: booleanEditor,
	model: ModelEditor,
	media: mediaEditor,
	color: colorEditor,
};

const DataTableEditor: React.FC<DataTableEditorProps> = ({
	editor,
	column,
	row,
	datakey,
	rowIndex,
	onValueChange,
	onKeyDown,
}) => {
	const handleValueChange = (value: any) => {
		onValueChange(row[datakey], column.field, value);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
		onKeyDown(event, column.field, row, rowIndex);
	};

	const editorConfig =
        typeof editor === "object" && editor !== null
            ? editor
            : typeof editor === "string"
                ? { type: editor } // default config for string editors
                : null;

    const editorType = editorConfig?.type;

	const editorProperties =
        editorConfig && typeof editorConfig === "object"
            ? { ...(column.editor_properties ?? {}), ...editorConfig }
            : column.editor_properties;


	if (typeof editor === "function") {
		return (
			<>
				{editor({
					column,
					row,
					rowIndex,
					datakey,
					defaultValue: row[column.field],
					onValueChange: handleValueChange,
					onKeyDown: handleKeyDown,
					editorProperties: column.editor_properties,
				})}
			</>
		);
	}

	const renderer = editorType ? editorMap[editorType] : undefined;
    const renderEditor = renderer ?? defaultEditor;

    return renderEditor({
        column: { ...column, editor_properties: editorProperties },
        row,
        className: editorClassName,
        onValueChange: handleValueChange,
        onKeyDown: handleKeyDown,
    });
};

export default DataTableEditor;
