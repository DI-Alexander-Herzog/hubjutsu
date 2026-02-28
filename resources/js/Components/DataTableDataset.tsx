import React, { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import classNames from "classnames";
import DataTableFilter from "@/Components/DataTableFilter";
import DataTableHeaderView from "@/Components/DataTableHeaderView";
import DataTableRowsView from "@/Components/DataTableRowsView";
import DataTableFooterView from "@/Components/DataTableFooterView";
import ErrorToast from "@/Components/ErrorToast";
import type { Column, DataTableAction, DataTableFilterConfig, Row } from "@/Components/DataTableTypes";
import { useLaravelReactI18n } from "laravel-react-i18n";

interface DataTableDatasetProps {
	dataset: Row[];
	columns: Column[];
	height?: string | null;
	perPage?: number;
	useGlobalSearch?: boolean;
	defaultSortField?: string | Array<[string, number]>;
	actions?: DataTableAction[];
	condensed?: boolean;
	initialSelection?: "all" | ((records: Row[]) => Row[]);
	onSelectionChange?: (records: Row[]) => void;
}

export interface DataTableDatasetRef {
	refresh: () => void;
}

type DatasetRow = Row & { __datasetIndex: number };

const compareValues = (a: any, b: any) => {
	if (a === b) return 0;
	if (a === null || a === undefined) return -1;
	if (b === null || b === undefined) return 1;
	if (typeof a === "number" && typeof b === "number") return a - b;
	const aDate = Date.parse(String(a));
	const bDate = Date.parse(String(b));
	if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;
	return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

const toArray = (value: any): any[] => (Array.isArray(value) ? value : [value]);

const matchesFilter = (rowValue: any, filterValue: any, matchMode: string) => {
	const mode = matchMode?.toUpperCase?.() || "CONTAINS";
	if (mode === "IN") return toArray(filterValue).includes(rowValue);
	if (mode === "=") return String(rowValue ?? "") === String(filterValue ?? "");
	if (mode === "BETWEEN") {
		const [start, end] = toArray(filterValue);
		if (start === undefined || end === undefined) return true;
		const rowTs = Date.parse(String(rowValue));
		const startTs = Date.parse(String(start));
		const endTs = Date.parse(String(end));
		if (!Number.isNaN(rowTs) && !Number.isNaN(startTs) && !Number.isNaN(endTs)) {
			return rowTs >= startTs && rowTs <= endTs;
		}
		const rowNum = Number(rowValue);
		const startNum = Number(start);
		const endNum = Number(end);
		if (!Number.isNaN(rowNum) && !Number.isNaN(startNum) && !Number.isNaN(endNum)) {
			return rowNum >= startNum && rowNum <= endNum;
		}
		return String(rowValue ?? "") >= String(start) && String(rowValue ?? "") <= String(end);
	}
	const value = String(rowValue ?? "").toLowerCase();
	const filter = String(filterValue ?? "").toLowerCase();
	return value.includes(filter);
};

const DataTableDataset = forwardRef<DataTableDatasetRef, DataTableDatasetProps>(({ 
	dataset,
	columns,
	height = null,
	perPage = 20,
	useGlobalSearch = false,
	defaultSortField = undefined,
	actions = [],
	condensed = false,
	initialSelection,
	onSelectionChange,
}, ref) => {
	const tableRef = useRef<HTMLTableElement>(null);
	const actionMenuRef = useRef<HTMLDivElement>(null);
	const isResizingRef = useRef(false);
	const datasetKey = "__datasetIndex" as const;

	const indexedDataset = useMemo<DatasetRow[]>(
		() =>
			dataset.map((row, index) => ({
				...(row as Row),
				__datasetIndex: index,
			})),
		[dataset]
	);
	const stripDatasetKey = (row: DatasetRow): Row => {
		const { __datasetIndex: _index, ...rest } = row;
		return rest;
	};

	const { t } = useLaravelReactI18n();
	const tr = (key: string, fallback: string) => {
		const translated = t(key);
		return translated === key ? fallback : translated;
	};

	const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
		const initial: Record<string, number> = {};
		columns.forEach((col) => {
			if (!col.width) return;
			const parsed = parseInt(col.width, 10);
			if (!Number.isNaN(parsed)) initial[col.field] = parsed;
		});
		return initial;
	});

	useEffect(() => {
		setColumnWidths((prev) => {
			const next = { ...prev };
			columns.forEach((col) => {
				if (next[col.field] !== undefined || !col.width) return;
				const parsed = parseInt(col.width, 10);
				if (!Number.isNaN(parsed)) next[col.field] = parsed;
			});
			return next;
		});
	}, [columns]);

	const stickyLeft = (idx: number) => {
		const widths = ["3rem"];
		for (let i = 0; i < idx; i++) {
			if (columns[i].frozen) {
				const width = columnWidths[columns[i].field];
				widths.push(width ? `${width}px` : columns[i].width ?? "180px");
			}
		}
		return `calc(${widths.join(" + ")})`;
	};

	const stickyZBody = (idx = 0) => 10 + idx;
	const stickyZHead = (idx = 0) => 20 + idx;
	const headerZIndex = 20;

	const lastFrozenIndex = useMemo(() => {
		let last = -1;
		columns.forEach((c, i) => {
			if (c.frozen) last = i;
		});
		return last;
	}, [columns]);

	const [selectedRecords, setSelectedRecords] = useState<DatasetRow[]>([]);
	const [actionMenuOpen, setActionMenuOpen] = useState(false);
	const [pageInput, setPageInput] = useState("1");
	const [error, setError] = useState<null | string | any>(null);
	const [showFilterPanel, setShowFilterPanel] = useState(false);
	const [activeFilters, setActiveFilters] = useState<{ [field: string]: any }>({});
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState(perPage);
	const [multiSortMeta, setMultiSortMeta] = useState<Array<[string, number]>>(() => {
		if (typeof defaultSortField === "string") return [[defaultSortField, 1]];
		if (Array.isArray(defaultSortField)) return [...defaultSortField];
		return [[datasetKey, 1]];
	});

	const updateSelectedRecords = (
		updater: DatasetRow[] | ((prev: DatasetRow[]) => DatasetRow[])
	) => {
		setSelectedRecords((prev) => {
			const next =
				typeof updater === "function"
					? (updater as (p: DatasetRow[]) => DatasetRow[])(prev)
					: updater;
			onSelectionChange?.(next.map(stripDatasetKey));
			return next;
		});
	};

	const normalizeSelectedRows = (input: Row[]): DatasetRow[] => {
		return input
			.map((row) => {
				const directIndex = (row as any)?.[datasetKey];
				if (typeof directIndex === "number") {
					return records.find((r) => r[datasetKey] === directIndex) ?? null;
				}
				return (
					records.find((candidate) =>
						columns.every((col) => candidate?.[col.field] === row?.[col.field])
					) ?? null
				);
			})
			.filter((row): row is DatasetRow => row !== null);
	};

	useEffect(() => {
		if (!actionMenuOpen) return;
		const handleClick = (event: MouseEvent) => {
			if (!actionMenuRef.current) return;
			if (!actionMenuRef.current.contains(event.target as Node)) setActionMenuOpen(false);
		};
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [actionMenuOpen]);

	const filteredAndSorted = useMemo(() => {
		let next = [...indexedDataset];

		if (!useGlobalSearch && search.trim() !== "") {
			const q = search.toLowerCase();
			next = next.filter((row: DatasetRow) =>
				columns.some((col) => String(row?.[col.field] ?? "").toLowerCase().includes(q))
			);
		}

		Object.entries(activeFilters).forEach(([field, filterConfig]) => {
			if (!filterConfig) return;
			const matchMode = filterConfig.matchMode || "contains";
			const value = filterConfig.value;
			next = next.filter((row: DatasetRow) => matchesFilter(row?.[field], value, matchMode));
		});

		if (multiSortMeta.length > 0) {
			next.sort((a, b) => {
				for (const [field, order] of multiSortMeta) {
					const result = compareValues(a?.[field], b?.[field]);
					if (result !== 0) return order > 0 ? result : -result;
				}
				return 0;
			});
		}

		return next;
	}, [indexedDataset, columns, activeFilters, multiSortMeta, search, useGlobalSearch]);

	const totalRecords = filteredAndSorted.length;
	const totalPages = Math.max(1, Math.ceil(totalRecords / rows));
	const first = (page - 1) * rows;
	const records = filteredAndSorted.slice(first, first + rows);

	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
		setPageInput(String(Math.min(page, totalPages)));
	}, [page, totalPages]);

	useEffect(() => {
		if (initialSelection) {
			const selection =
				initialSelection === "all"
					? records
					: normalizeSelectedRows(initialSelection(records as Row[]));
			updateSelectedRecords(selection);
			return;
		}
		updateSelectedRecords([]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [records]);

	useImperativeHandle(ref, () => ({
		refresh: () => {
			setError(null);
			setSelectedRecords([]);
		},
	}));

	const perPageList = [2, 10, 15, 20, 50, 100, 1000];
	if (!perPageList.includes(perPage)) {
		perPageList.push(perPage);
		perPageList.sort((a, b) => a - b);
	}

	const handleSort = (field: string, event?: React.MouseEvent) => {
		setMultiSortMeta((prev) => {
			let ms = [...prev];
			const isShiftClick = event?.shiftKey;
			const existingIndex = ms.findIndex(([f]) => f === field);
			if (isShiftClick) {
				if (existingIndex === -1) ms.push([field, 1]);
				else ms[existingIndex][1] *= -1;
			} else {
				if (existingIndex !== -1) ms = [[field, -ms[existingIndex][1]]];
				else ms = [[field, 1]];
			}
			return ms;
		});
	};

	const getSortOrderText = (index: number) => {
		const suffixes = ["th", "st", "nd", "rd"];
		const v = index % 100;
		return index + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
	};

	const applyFilter = (field: string, value: any, matchMode?: string) => {
		const newFilters = { ...activeFilters };
		if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
			delete newFilters[field];
		} else {
			if (matchMode === "dateRange" && typeof value === "object") {
				const filterValue = [];
				if (value.start) filterValue.push(value.start);
				if (value.end) filterValue.push(value.end);
				newFilters[field] = {
					value: filterValue.length > 1 ? filterValue : filterValue[0],
					matchMode: filterValue.length > 1 ? "BETWEEN" : "=",
				};
			} else {
				newFilters[field] = { value, matchMode: matchMode || "contains" };
			}
		}
		setActiveFilters(newFilters);
		setPage(1);
	};

	const clearFilter = (field: string) => applyFilter(field, null);
	const clearAllFilters = () => {
		setActiveFilters({});
		setPage(1);
	};

	const onPageChange = (newPage: number) => setPage(newPage);

	const getColumnWidth = (col: Column) => {
		const width = columnWidths[col.field];
		return width ? `${width}px` : col.width ?? "auto";
	};

	const startResize = (event: React.MouseEvent<HTMLSpanElement>, field: string) => {
		event.preventDefault();
		event.stopPropagation();
		isResizingRef.current = true;
		const target = event.currentTarget.parentElement as HTMLElement | null;
		const startWidth = target?.getBoundingClientRect().width ?? 0;
		const startX = event.clientX;
		const minWidth = 80;

		const onMouseMove = (moveEvent: MouseEvent) => {
			const delta = moveEvent.clientX - startX;
			const nextWidth = Math.max(minWidth, Math.round(startWidth + delta));
			setColumnWidths((prev) => ({ ...prev, [field]: nextWidth }));
		};

		const onMouseUp = () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			window.setTimeout(() => {
				isResizingRef.current = false;
			}, 0);
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
	};

	const commitPageInput = () => {
		const parsed = Number(pageInput);
		if (!Number.isFinite(parsed)) {
			setPageInput(String(page));
			return;
		}
		const next = Math.min(Math.max(Math.round(parsed), 1), totalPages);
		setPageInput(String(next));
		if (next !== page) onPageChange(next);
	};

	const toggleRowSelection = (inputRow: Row, state?: boolean) => {
		const row = inputRow as DatasetRow;
		if (state === undefined) {
			updateSelectedRecords((prev) =>
				prev.findIndex((r) => r[datasetKey] === row[datasetKey]) !== -1
					? prev.filter((r) => r[datasetKey] !== row[datasetKey])
					: [...prev, row]
			);
		} else if (state) {
			if (selectedRecords.findIndex((r) => r[datasetKey] === row[datasetKey]) !== -1) return;
			updateSelectedRecords((prev) => [...prev.filter((r) => r[datasetKey] !== row[datasetKey]), row]);
		} else {
			updateSelectedRecords((prev) => prev.filter((r) => r[datasetKey] !== row[datasetKey]));
		}
	};

	const toggleSelectAll = () => updateSelectedRecords(records.length === selectedRecords.length ? [] : [...records]);

	const hasActiveFilters = Object.keys(activeFilters).length > 0;

	return (
		<div className={classNames("w-full h-full flex flex-col")} style={{ ...(height ? { height } : {}) }}>
			<div className="relative flex-grow overflow-auto w-full" {...(height ? { style: { height } } : {})}>
				<ErrorToast error={error} onClose={() => setError(null)} />

				<DataTableFilter
					columns={columns}
					records={indexedDataset}
					activeFilters={activeFilters}
					onApplyFilter={applyFilter}
					onClearFilter={clearFilter}
					onClearAllFilters={clearAllFilters}
					isVisible={showFilterPanel}
					onToggle={() => setShowFilterPanel(false)}
				/>

				<div className="bg-background dark:bg-gray-900 overflow-hidden w-full h-full flex-1 rounded-lg shadow-sm">
					<div className="overflow-x-auto w-full h-full">
						<table ref={tableRef} className="w-full min-w-full table-fixed border-collapse">
							<DataTableHeaderView
								columns={columns}
								recordsLength={records.length}
								selectedRecordsLength={selectedRecords.length}
								headerZIndex={headerZIndex}
								multiSortMeta={multiSortMeta}
								isResizingRef={isResizingRef}
								onSort={handleSort}
								onToggleSelectAll={toggleSelectAll}
								onStartResize={startResize}
								getColumnWidth={getColumnWidth}
								stickyLeft={stickyLeft}
								stickyZHead={stickyZHead}
								getSortOrderText={getSortOrderText}
							/>
							<DataTableRowsView
								records={records}
								columns={columns}
								datakey={datasetKey}
								selectedRecords={selectedRecords}
								editingRecord={{}}
								lastFrozenIndex={lastFrozenIndex}
								noEditor={true}
								toggleRowSelection={toggleRowSelection}
								enableEditing={() => {}}
								focusEditor={() => {}}
								setRowValue={() => {}}
								handleKeyDown={() => {}}
								stickyLeft={stickyLeft}
								stickyZBody={stickyZBody}
								getColumnWidth={getColumnWidth}
							/>
						</table>
					</div>
				</div>
			</div>

			<DataTableFooterView
				condensed={condensed}
				columnsLength={columns.length}
				showFilterPanel={showFilterPanel}
				hasActiveFilters={hasActiveFilters}
				activeFiltersCount={Object.keys(activeFilters).length}
				onToggleFilterPanel={() => {
					setShowFilterPanel(!showFilterPanel);
					setActionMenuOpen(false);
				}}
				onReload={() => {
					setError(null);
					updateSelectedRecords([]);
				}}
				loading={false}
				canCreate={false}
				onCreate={() => {}}
				actionMenuOpen={actionMenuOpen}
				onToggleActionMenu={() => setActionMenuOpen((open) => !open)}
				actionMenuRef={actionMenuRef}
				canDelete={false}
				onDeleteSelected={() => {}}
				editingCount={0}
				onSaveEditing={() => {}}
				actions={actions}
				selectedRecords={selectedRecords}
				onAction={(action) => {
					action.onClick(selectedRecords.map(stripDatasetKey), () => {
						setError(null);
						updateSelectedRecords([]);
					});
					setActionMenuOpen(false);
				}}
				perPageList={perPageList}
				rows={rows}
				onRowsChange={(nextRows) => {
					setRows(nextRows);
					setPage(1);
				}}
				useGlobalSearch={useGlobalSearch}
				search={search}
				onSearchChange={(nextSearch) => {
					setSearch(nextSearch);
					setPage(1);
				}}
				page={page}
				totalPages={totalPages}
				onPageChange={onPageChange}
				pageInput={pageInput}
				onPageInputChange={setPageInput}
				onPageInputCommit={commitPageInput}
				displayStart={1 + first}
				displayEnd={first + rows < totalRecords ? first + rows : totalRecords}
				totalRecords={totalRecords}
				tr={tr}
				t={t}
			/>
		</div>
	);
});

export default DataTableDataset;
export type { Column, DataTableFilterConfig };
