import React from "react";
import { DateTime } from "luxon";
import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import axios from "axios";
import { DataTableFormatter } from "./DataTableFormatter";


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
export type EditorConfig =
    | SelectEditorConfig
    | NumberEditorConfig
    | BooleanEditorConfig
    | DatetimeEditorConfig
    | ModelEditorConfig;


interface DataTableEditorColumn {
	field: string;
	editor?: string | EditorConfig | ((props: DataTableCustomEditorProps) => React.ReactNode);
	/**
 	 * @deprecated Nicht mehr verwenden. 
	 * Wurde durch "editor: { type: 'select', ... }" ersetzt.
	 */
	editor_properties?: Record<string, any>;
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
        const handler = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
}

const ModelEditor: EditorRenderer = ({
    column,
    row,
    onValueChange,
    onKeyDown,
    className
}) => {
    const cfg = column.editor as ModelEditorConfig;

    const [query, setQuery] = useState("");
    const debouncedSearch = useDebounce(query, cfg.debounce ?? 300);

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const valueField = cfg.valueField ?? "id";
    const labelField = cfg.labelField ?? "name";

    useEffect(() => {
        if (!debouncedSearch) return;

        setLoading(true);

		
        axios.get(route("api.model.search", { model: cfg.model }), {
            params: {
                q: debouncedSearch,
                ...(cfg.filter ? cfg.filter(row) : {})
            }
        }).then(res => {
            setData(res.data.data);
        }).finally(() => setLoading(false));
    }, [debouncedSearch]);

    const selectedDisplay = (() => {
        const v = row[column.field];
        const found = data.find(r => r[valueField] === v);
        return found ? found[labelField] : "";
    })();

	const cols = cfg.columns ?? [{ field: labelField, label: cfg.model }];

    return (
        <Popover className="relative w-full">
            <PopoverButton  as="div" className="w-full">
                <input
                    readOnly
                    onKeyDown={onKeyDown}
                    className={className}
                    value={selectedDisplay}
                    placeholder="Bitte auswählen…"
                />
            </PopoverButton>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <PopoverPanel
                    className="
                        absolute z-50 w-[900px] mt-1
                        bg-white dark:bg-gray-800
                        border border-gray-300 dark:border-gray-700 
                        rounded-md shadow-xl
                        max-h-[300px] overflow-auto
                    "
                >
                    {/* Search */}
                    <div className="p-2 border-b dark:border-gray-700">
                        <input
                            className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-700"
                            value={query}
                            autoFocus
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Suchen…"
                        />
                    </div>

                    {/* Table */}
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                            <tr>
                                {cols.map(col => (
									<th key={col.field} className="px-2 py-1 text-left border-b dark:border-gray-700" style={{width: col.width}}>{col.label}</th>
								))}
                            </tr>
                        </thead>

                        <tbody>
                            {!loading && data.map((r, i) => (
                                <tr
                                    key={i}
                                    className="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900"
                                    onClick={() => {
                                        onValueChange(r[valueField]);
                                    }}
                                >
                                    {cols.map((col) => (
                                        <td key={col.field} className="px-2 py-1 border-b dark:border-gray-700">
                                            {col.formatter ? col.formatter(r, col.field) : DataTableFormatter.default(r, col.field)}
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {loading && (
                                <tr>
                                    <td className="p-3 text-center opacity-60">Lade…</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </PopoverPanel>
            </Transition>
        </Popover>
    );
};


const editorMap: Record<string, EditorRenderer> = {
	number: numberEditor,
	datetime: datetimeEditor,
	select: selectEditor,
	boolean: booleanEditor,
	model: ModelEditor,
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
