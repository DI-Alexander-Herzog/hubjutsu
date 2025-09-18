import React from "react";
import { DateTime } from "luxon";

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
					.toFormat("yyyy-MM-dd'T'HH:mm")
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
