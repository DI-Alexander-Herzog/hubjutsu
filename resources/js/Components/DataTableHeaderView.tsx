import React from "react";
import classNames from "classnames";
import Checkbox from "@/Components/Checkbox";
import type { Column } from "@/Components/DataTableTypes";

interface DataTableHeaderViewProps {
	columns: Column[];
	recordsLength: number;
	selectedRecordsLength: number;
	headerZIndex: number;
	multiSortMeta: Array<[string, number]>;
	isResizingRef: React.MutableRefObject<boolean>;
	onSort: (field: string, event?: React.MouseEvent) => void;
	onToggleSelectAll: () => void;
	onStartResize: (event: React.MouseEvent<HTMLSpanElement>, field: string) => void;
	getColumnWidth: (col: Column) => string;
	stickyLeft: (idx: number) => string;
	stickyZHead: (idx?: number) => number;
	getSortOrderText: (index: number) => string;
}

const StickyRightDivider = ({ z = 999 }: { z?: number }) => (
	<span
		className="pointer-events-none absolute right-0 top-0 h-full w-px bg-background-700 dark:bg-gray-700"
		style={{ zIndex: z }}
	/>
);

const DataTableHeaderView: React.FC<DataTableHeaderViewProps> = ({
	columns,
	recordsLength,
	selectedRecordsLength,
	headerZIndex,
	multiSortMeta,
	isResizingRef,
	onSort,
	onToggleSelectAll,
	onStartResize,
	getColumnWidth,
	stickyLeft,
	stickyZHead,
	getSortOrderText,
}) => {
	return (
		<thead
			className="bg-background-600 dark:bg-gray-800 sticky top-0"
			style={{ zIndex: headerZIndex }}
		>
			<tr>
				<th
					className=" px-3 py-2 text-left text-sm font-bold text-text-500 dark:text-gray-400 uppercase tracking-wider border-gray-200 dark:border-gray-700 sticky left-0 z-20 bg-background-600 dark:bg-gray-800"
					style={{ width: "3rem" }}
				>
					<Checkbox
						checked={recordsLength === selectedRecordsLength && recordsLength > 0}
						onChange={onToggleSelectAll}
					/>
					<StickyRightDivider z={headerZIndex + 5} />
				</th>
				{columns.map((col, idx) => {
					const sortKey = typeof col.sortable === "string" ? col.sortable : col.field;
					const isSortable = !!col.sortable;
					const sortIndex = multiSortMeta.findIndex(([field]) => field === sortKey);
					const currentSortMeta = multiSortMeta.find(([field]) => field === sortKey) || [sortKey, 1];
					return (
						<th
							key={col.field}
							style={{
								width: getColumnWidth(col),
								...(col.frozen
									? { left: stickyLeft(idx), zIndex: stickyZHead(idx) }
									: {}),
							}}
							className={classNames(
								"relative px-3 py-2 text-left text-sm font-bold text-text-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0",
								col.frozen && "border-r-0 sticky bg-background-600 dark:bg-gray-800",
								isSortable && "cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-800/10"
							)}
							onClick={
								!isSortable
									? undefined
									: (e) => {
										if (isResizingRef.current) return;
										if ((e.target as Element)?.closest(".filter-dropdown")) return;
										onSort(sortKey, e);
									}
							}
						>
								<div className="flex items-center min-w-0">
									<span className="truncate">{col.label}</span>
									<div className="ml-2 flex items-center gap-1 flex-shrink-0">
										{isSortable && sortIndex !== -1 && (
											<div className="ml-2 flex items-center gap-1 flex-shrink-0">
											<span className="text-[0.5rem] font-medium text-white bg-primary px-1 py-0.25 rounded-full">
												{getSortOrderText(Math.abs(sortIndex + 1))}
											</span>
											<span className="text-primary text-sm">{currentSortMeta[1] > 0 ? "↑" : "↓"}</span>
										</div>
									)}
								</div>
							</div>

							{col.frozen && <StickyRightDivider z={stickyZHead(idx) + 5} />}
							<span
								role="separator"
								aria-orientation="vertical"
								onMouseDown={(event) => onStartResize(event, col.field)}
								className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20"
							/>
						</th>
					);
				})}
			</tr>
		</thead>
	);
};

export default DataTableHeaderView;
