import React from "react";
import classNames from "classnames";
import { handleDoubleClick } from "@/Helper/doubleClick";
import Checkbox from "@/Components/Checkbox";
import { DataTableFormatter } from "@/Components/DataTableFormatter";
import DataTableEditor from "@/Components/DataTableEditor";
import type { DataTableCustomEditorProps, EditorConfig } from "@/Components/DataTableEditor";
import type { Column, Row } from "@/Components/DataTableTypes";

interface DataTableRowsViewProps {
	records: Row[];
	columns: Column[];
	datakey: string;
	selectedRecords: Row[];
	editingRecord: { [key: number]: Row };
	lastFrozenIndex: number;
	noEditor: boolean;
	toggleRowSelection: (row: Row, state?: boolean) => void;
	enableEditing: (row: Row) => void;
	focusEditor: (target: any, field: string) => void;
	setRowValue: (id: number, field: string, value: any) => void;
	handleKeyDown: (event: React.KeyboardEvent<HTMLElement>, field: string, row: Row, rowIndex: number) => void;
	stickyLeft: (idx: number) => string;
	stickyZBody: (idx?: number) => number;
	getColumnWidth: (col: Column) => string;
}

type EditorCompatibleColumn = Column & {
	editor?: string | EditorConfig | ((props: DataTableCustomEditorProps) => React.ReactNode);
};

const StickyRightDivider = ({ z = 999 }: { z?: number }) => (
	<span
		className="pointer-events-none absolute right-0 top-0 h-full w-px bg-background-700 dark:bg-gray-700"
		style={{ zIndex: z }}
	/>
);

const DataTableRowsView: React.FC<DataTableRowsViewProps> = ({
	records,
	columns,
	datakey,
	selectedRecords,
	editingRecord,
	lastFrozenIndex,
	noEditor,
	toggleRowSelection,
	enableEditing,
	focusEditor,
	setRowValue,
	handleKeyDown,
	stickyLeft,
	stickyZBody,
	getColumnWidth,
}) => {
	return (
		<tbody className="bg-background dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
			{records.map((row, rowOfs) => {
				let firstEditor = true;
				const isSelected = selectedRecords.includes(row);

				return (
					<tr
						key={row[datakey]}
						className={classNames(
							"group transition-colors duration-150",
							isSelected &&
								(rowOfs % 2 === 0
									? "bg-primary-50 dark:bg-primary-900/20"
									: "bg-primary-100 dark:bg-primary-900/30"),
							rowOfs % 2 === 0
								? "bg-background dark:bg-gray-900"
								: "bg-background-600 dark:bg-gray-800"
						)}
					>
						<td
							className={classNames(
								" px-3 py-2 whitespace-nowrap text-sm text-text-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 sticky left-0 z-10",
								{
									"bg-primary-50 dark:bg-primary-900/20 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30":
										isSelected && rowOfs % 2 === 0,
									"bg-primary-100 dark:bg-primary-900/30 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/40":
										isSelected && rowOfs % 2 !== 0,
									"bg-background dark:bg-gray-900 group-hover:bg-primary-50 dark:group-hover:bg-gray-700":
										!isSelected && rowOfs % 2 === 0,
									"bg-background-600 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-gray-600":
										!isSelected && rowOfs % 2 !== 0,
								},
								"overflow-hidden"
							)}
						>
							<Checkbox checked={isSelected} onChange={() => toggleRowSelection(row)} />
							<StickyRightDivider z={stickyZBody(0) + 5} />
						</td>

						{columns.map((col, idx) => {
							const editorColumn = col as EditorCompatibleColumn;
							if (col.editor && firstEditor) {
								col.editor_properties = col.editor_properties || {};
								col.editor_properties.autoFocus = true;
								firstEditor = false;
							}

							const isFrozen = col.frozen;
							const stickyStyle = isFrozen
								? {
										left: stickyLeft(idx),
										zIndex: stickyZBody(idx),
								  }
								: {};

							return (
								<td
									data-col={col.field}
									key={col.field}
									style={{
										width: getColumnWidth(col),
										...stickyStyle,
									}}
									className={classNames(
										"relative whitespace-nowrap text-sm text-text-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0 [&_a]:font-semibold [&_a]:text-primary-700 [&_a]:underline-offset-2 [&_a]:transition-colors group-hover:[&_a]:text-primary-900 dark:[&_a]:text-primary-400 dark:group-hover:[&_a]:text-primary-200",
										{
											"px-3 py-2": !(editingRecord[row[datakey]] && col.editor),
											"sticky border-r-0": isFrozen,
											"bg-primary-50 dark:bg-primary-900/20 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30":
												isSelected && rowOfs % 2 === 0,
											"bg-primary-100 dark:bg-primary-900/30 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/40":
												isSelected && rowOfs % 2 !== 0,
											"[&_a]:text-primary-900 dark:[&_a]:text-primary-100": isSelected,
											"bg-background dark:bg-gray-900 group-hover:bg-primary-50 dark:group-hover:bg-gray-700":
												!isSelected && rowOfs % 2 === 0,
											"bg-background-600 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-gray-600":
												!isSelected && rowOfs % 2 !== 0,
										},
										"overflow-hidden"
									)}
									onClick={(() => {
										if (noEditor) {
											return () => toggleRowSelection(row);
										}
										if (Object.keys(editingRecord).length > 0) {
											return (event: React.MouseEvent) => {
												enableEditing(row);
												focusEditor(event.target, col.field);
											};
										}
										return handleDoubleClick(
											() => toggleRowSelection(row),
											(event: React.MouseEvent) => {
												enableEditing(row);
												focusEditor(event.target, col.field);
											}
										);
									})()}
								>
									{editingRecord[row[datakey]] && editorColumn.editor ? (
										<DataTableEditor
											editor={editorColumn.editor}
											column={editorColumn}
											row={editingRecord[row[datakey]]}
											datakey={datakey}
											rowIndex={rowOfs}
											onValueChange={setRowValue}
											onKeyDown={handleKeyDown}
										/>
									) : (
										<div className="text-text-900 dark:text-gray-100">
											{(() => {
												const value = col.formatter
													? col.formatter(row, col.field)
													: DataTableFormatter.default(row, col.field);
												if (
													typeof value === "string" ||
													typeof value === "number" ||
													React.isValidElement(value) ||
													value === null ||
													value === undefined
												) {
													return value;
												}
												return JSON.stringify(value);
											})()}
										</div>
									)}

									{isFrozen && <StickyRightDivider z={stickyZBody(idx) + 5} />}
								</td>
							);
						})}
					</tr>
				);
			})}
			{records.length === 0 && (
				<tr>
					<td colSpan={columns.length + 1} className="h-12 px-3 py-2 text-sm text-text-400 dark:text-gray-500">
						&nbsp;
					</td>
				</tr>
			)}
		</tbody>
	);
};

export default DataTableRowsView;
