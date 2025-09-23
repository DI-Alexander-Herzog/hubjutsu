import React from "react";
import { DateTime } from "luxon";
import classNames from "classnames";

interface DataTableEditorColumn {
	field: string;
	editor?: string | ((props: DataTableCustomEditorProps) => React.ReactNode);
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
	
	return <label className={"inline-flex items-center cursor-pointer align-middle "}>
		<input {...column.editor_properties} name={column.field} onKeyDown={onKeyDown} type="checkbox" value="1" className="sr-only peer" checked={checked} onChange={() => onValueChange(!checked)} />
  		<div className={
			" relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 " +
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

const editorMap: Record<string, EditorRenderer> = {
	number: numberEditor,
	datetime: datetimeEditor,
	select: selectEditor,
	boolean: booleanEditor
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

	const renderer = editor && typeof editor === "string" ? editorMap[editor] : undefined;
	const renderEditor = renderer ?? defaultEditor;

	return renderEditor({
		column,
		row,
		className: editorClassName,
		onValueChange: handleValueChange,
		onKeyDown: handleKeyDown,
	});
};

export default DataTableEditor;
