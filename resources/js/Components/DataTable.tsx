import React, { useEffect, useState, useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import axios from "axios";
import classNames from "classnames";
import { flushSync } from "react-dom";

import DataTableFilter from "@/Components/DataTableFilter";
import DataTableHeaderView from "@/Components/DataTableHeaderView";
import DataTableRowsView from "@/Components/DataTableRowsView";
import DataTableFooterView from "@/Components/DataTableFooterView";
import ErrorToast from "@/Components/ErrorToast";

import { useSearch } from "@/Components/SearchContext";
import { useLaravelReactI18n } from "laravel-react-i18n";
import type { Column, DataTableAction, Row, SearchState, DataTableFilterConfig } from "@/Components/DataTableTypes";

interface DataTableProps {
	routemodel?: string;
	columns: Column[];
	filters?: Record<string, any>;
	init?: string;
	height?: string | null;
	datakey?: string;
	with?: string[];
	perPage?: number;
	newRecord?: false | Record<string, any> | string | (() => void) | null;
	disableDelete?: boolean;
	useGlobalSearch?: boolean;
	defaultSortField?: string | Array<[string, number]>;
	actions?: DataTableAction[];
	condensed?: boolean;
	initialSelection?: "all" | ((records: Row[]) => Row[]);
	onSelectionChange?: (records: Row[]) => void;
}

export interface DataTableRef {
	refresh: () => void;
}

const DataTable = forwardRef<DataTableRef, DataTableProps>(({
	routemodel,
	columns,
	filters = {},
	init,
	datakey = "id",
	height = null,
	perPage = 20,
	newRecord = null,
	with: withRelations = [],
	disableDelete = false,
	useGlobalSearch = true,
	defaultSortField = undefined,
	actions = [],
	condensed = false,
	initialSelection,
	onSelectionChange,
}, ref) => {
	const tableRef = useRef<HTMLTableElement>(null);
	const actionMenuRef = useRef<HTMLDivElement>(null);
	const nextTempIdRef = useRef(-1);
	const isResizingRef = useRef(false);

	const { t } = useLaravelReactI18n();
	const tr = (key: string, fallback: string) => {
		const translated = t(key);
		return translated === key ? fallback : translated;
	};

	const { query } = useSearch();

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

	const [loading, setLoading] = useState(false);
	const [totalRecords, setTotalRecords] = useState(0);
	const [records, setRecords] = useState<Row[]>([]);
	const [selectedRecords, setSelectedRecords] = useState<Row[]>([]);
	const [actionMenuOpen, setActionMenuOpen] = useState(false);
	const [pageInput, setPageInput] = useState("1");
	const [error, setError] = useState<null | string | any>(null);
	const [editingRecord, setEditingRecord] = useState<{ [key: number]: Row }>({});
	const [showFilterPanel, setShowFilterPanel] = useState(false);
	const [activeFilters, setActiveFilters] = useState<{ [field: string]: any }>({});

	const updateSelectedRecords = (updater: Row[] | ((prev: Row[]) => Row[])) => {
		setSelectedRecords((prev) => {
			const next = typeof updater === "function" ? (updater as (p: Row[]) => Row[])(prev) : updater;
			onSelectionChange?.(next);
			return next;
		});
	};

	const [searchState, setSearchState] = useState<SearchState>(() => {
		const initialSort: Array<[string, number]> = [];
		if (typeof defaultSortField === "string") {
			initialSort.push([defaultSortField, 1]);
		} else if (Array.isArray(defaultSortField)) {
			initialSort.push(...defaultSortField);
		} else {
			initialSort.push([datakey, 1]);
		}

		return {
			first: 0,
			rows: perPage,
			page: 1,
			search: useGlobalSearch ? query : undefined,
			init,
			filters: Object.entries(filters).map(([key, value]) => {
				if (Array.isArray(value) && value.length > 0) return { field: key, matchMode: "IN", value };
				if (typeof value === "object" && value !== null && "matchMode" in value && "value" in value) {
					return { field: key, matchMode: (value as any).matchMode, value: (value as any).value };
				}
				return { field: key, matchMode: "=", value };
			}),
			multiSortMeta: initialSort,
			with: withRelations,
		};
	});

	useEffect(() => {
		if (!useGlobalSearch) return;
		setSearchState((prev) => (prev.search === query ? prev : { ...prev, search: query, first: 0, page: 1 }));
	}, [query, useGlobalSearch]);

	useEffect(() => {
		setSearchState((prev) => (prev.init === init ? prev : { ...prev, init, first: 0, page: 1 }));
	}, [init]);

	useEffect(() => {
		setPageInput(String(searchState.page));
	}, [searchState.page]);

	useEffect(() => {
		if (!actionMenuOpen) return;
		const handleClick = (event: MouseEvent) => {
			if (!actionMenuRef.current) return;
			if (!actionMenuRef.current.contains(event.target as Node)) setActionMenuOpen(false);
		};
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [actionMenuOpen]);

	const perPageList = [2, 10, 15, 20, 50, 100, 1000];
	if (!perPageList.includes(perPage)) {
		perPageList.push(perPage);
		perPageList.sort((a, b) => a - b);
	}

	useEffect(() => {
		loadLazyData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchState]);

	const loadLazyData = () => {
		setError(null);
		updateSelectedRecords([]);
		setEditingRecord({});
		setLoading(true);

		axios
			.get(route("api.model.search", { model: routemodel }), { params: searchState })
			.then((response) => {
				setLoading(false);
				setRecords(response.data.data);
				setTotalRecords(response.data.total);
				if (initialSelection) {
					const selection = initialSelection === "all" ? response.data.data : initialSelection(response.data.data);
					updateSelectedRecords(selection);
				}
			})
			.catch((err) => {
				setLoading(false);
				setError(err.response?.data || err.message || err.toString() || "Error");
			});
	};

	useImperativeHandle(ref, () => ({ refresh: () => loadLazyData() }));

	const handleSort = (field: string, event?: React.MouseEvent) => {
		setSearchState((prev) => {
			let ms = [...prev.multiSortMeta];
			const isShiftClick = event?.shiftKey;
			const existingIndex = ms.findIndex(([f]) => f === field);
			if (isShiftClick) {
				if (existingIndex === -1) ms.push([field, 1]);
				else ms[existingIndex][1] *= -1;
			} else {
				if (existingIndex !== -1) ms = [[field, -ms[existingIndex][1]]];
				else ms = [[field, 1]];
			}
			return { ...prev, multiSortMeta: ms };
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
		setSearchState((prev) => ({
			...prev,
			first: 0,
			page: 1,
			filters: Object.entries({ ...filters, ...newFilters }).map(([key, v]) => {
				if (Array.isArray(v) && v.length > 0) return { field: key, matchMode: "IN", value: v };
				if (typeof v === "object" && v !== null && "matchMode" in v && "value" in v) {
					return { field: key, matchMode: (v as any).matchMode, value: (v as any).value };
				}
				return { field: key, matchMode: "=", value: v };
			}),
		}));
	};

	const clearFilter = (field: string) => applyFilter(field, null);
	const clearAllFilters = () => {
		setActiveFilters({});
		setSearchState((prev) => ({
			...prev,
			first: 0,
			page: 1,
			filters: prev.filters.filter((f) => Object.keys(filters).includes(f.field)),
		}));
	};

	const onPageChange = (newPage: number) => {
		setSearchState((prev) => ({ ...prev, page: newPage, first: (newPage - 1) * prev.rows }));
	};

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

	const totalPages = Math.max(1, Math.ceil(totalRecords / searchState.rows));

	const commitPageInput = () => {
		const parsed = Number(pageInput);
		if (!Number.isFinite(parsed)) {
			setPageInput(String(searchState.page));
			return;
		}
		const next = Math.min(Math.max(Math.round(parsed), 1), totalPages);
		setPageInput(String(next));
		if (next !== searchState.page) onPageChange(next);
	};

	const focusEditor = (target: any, field: string) => {
		if (["select", "input", "textarea"].includes(target.tagName.toLowerCase())) return;
		const td = target.closest("td");
		setTimeout(() => {
			td?.querySelector("input,textarea,select")?.focus();
		}, 100);
	};

	const enableEditing = (row: Row) => {
		toggleRowSelection(row, true);
		const id = row[datakey];
		setEditingRecord((prev) => (prev[id] ? prev : { ...prev, [id]: { ...row } }));
	};

	const disableEditing = (id: number) => {
		setEditingRecord((prev) => {
			const clone = { ...prev };
			delete clone[id];
			return clone;
		});
	};

	const saveRow = (editingRecordId: number, rowOfs: number) => {
		setRecords((prev) => {
			const next = [...prev];
			next[rowOfs] = editingRecord[editingRecordId];
			return next;
		});

		setLoading(true);
		const updateOrCreateRoute =
			editingRecordId > 0
				? route("api.model.update", { model: routemodel, [datakey]: editingRecordId, with: withRelations })
				: route("api.model.create", { model: routemodel, with: withRelations });

		axios
			.post(updateOrCreateRoute, editingRecord[editingRecordId])
			.then((response) => {
				setLoading(false);
				disableEditing(editingRecordId);
				toggleRowSelection(response.data, true);
				setRecords((prev) => {
					const next = [...prev];
					next[rowOfs] = response.data;
					return next;
				});
			})
			.catch((err) => {
				setError(err.response?.data || err.message || err.toString() || "Error");
				setLoading(false);
			});
	};

	const handleKeyDown = (e: any, field: string, row: Row, rowOfs: number) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();
			flushSync(() => {});
			saveRow(row[datakey], rowOfs);
		}
		if (e.key === "Escape") {
			if (row[datakey] < 0) {
				setRecords((prev) => prev.filter((r) => r[datakey] !== row[datakey]));
				toggleRowSelection(row, false);
			}
			disableEditing(row[datakey]);
		}
	};

	const setRowValue = (id: number, field: string, value: any) => {
		setEditingRecord((prev) => {
			const base = prev[id] ?? {};
			const nextRow = { ...base, [field]: value };
			if (base[field] === value) return prev;
			return { ...prev, [id]: nextRow };
		});
	};

	const toggleRowSelection = (row: Row, state?: boolean) => {
		if (editingRecord[row[datakey]]) state = true;

		if (state === undefined) {
			updateSelectedRecords((prev) =>
				prev.findIndex((r) => r[datakey] === row[datakey]) !== -1
					? prev.filter((r) => r[datakey] !== row[datakey])
					: [...prev, row]
			);
		} else if (state) {
			if (selectedRecords.findIndex((r) => r[datakey] === row[datakey]) !== -1) return;
			updateSelectedRecords((prev) => [...prev.filter((r) => r[datakey] !== row[datakey]), row]);
		} else {
			updateSelectedRecords((prev) => prev.filter((r) => r[datakey] !== row[datakey]));
		}
	};

	const toggleSelectAll = () => updateSelectedRecords(records.length === selectedRecords.length ? [] : [...records]);

	const handleNewRecord = () => {
		if (newRecord === false) return;
		if (typeof newRecord === "string") {
			window.location.href = newRecord;
		} else if (typeof newRecord === "function") {
			newRecord();
		} else {
			const newRow = { ...newRecord, [datakey]: nextTempIdRef.current-- };
			setRecords((prev) => [newRow, ...prev]);
			setEditingRecord((prev) => ({ ...prev, [newRow[datakey]]: newRow }));
		}
	};

	const deleteSelected = () => {
		if (!confirm(tr("datatable.delete_confirm", "Are you sure you want to delete the selected records?"))) return;
		selectedRecords
			.filter((record) => Number(record?.[datakey]) > 0)
			.forEach((record) => {
				const index = records.findIndex((r) => r[datakey] === record[datakey]);
				if (index === -1) return;
				axios
					.delete(route("api.model.delete", { model: routemodel, id: record[datakey] }))
					.then(() => {
						setRecords((prev) => {
							const next = [...prev];
							const idx = next.findIndex((r) => r[datakey] === record[datakey]);
							if (idx !== -1) next.splice(idx, 1);
							return next;
						});
						toggleRowSelection(record, false);
						setTotalRecords((prev) => prev - 1);
					})
					.catch((err) => setError(err));
			});
		setActionMenuOpen(false);
	};

	const saveEditingRows = () => {
		Object.keys(editingRecord).forEach((id) => {
			const rowOfs = records.findIndex((r) => r[datakey] === editingRecord[Number(id)][datakey]);
			if (rowOfs !== -1) saveRow(Number(id), rowOfs);
		});
		setActionMenuOpen(false);
	};

	const hasActiveFilters = Object.keys(activeFilters).length > 0;
	const hasPersistedSelection = selectedRecords.some((record) => Number(record?.[datakey]) > 0);
	const noEditor = columns.filter((c) => c.editor).length === 0;

	return (
		<div className={classNames("w-full h-full flex flex-col")} style={{ ...(height ? { height } : {}) }}>
			<div className="relative flex-grow overflow-auto w-full" {...(height ? { style: { height } } : {})}>
				<ErrorToast error={error} onClose={() => setError(null)} />

				<DataTableFilter
					columns={columns}
					records={records}
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
								multiSortMeta={searchState.multiSortMeta}
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
								datakey={datakey}
								selectedRecords={selectedRecords}
								editingRecord={editingRecord}
								lastFrozenIndex={lastFrozenIndex}
								noEditor={noEditor}
								toggleRowSelection={toggleRowSelection}
								enableEditing={enableEditing}
								focusEditor={focusEditor}
								setRowValue={setRowValue}
								handleKeyDown={handleKeyDown}
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
				onReload={loadLazyData}
				loading={loading}
				canCreate={newRecord !== false}
				onCreate={handleNewRecord}
				actionMenuOpen={actionMenuOpen}
				onToggleActionMenu={() => setActionMenuOpen((open) => !open)}
				actionMenuRef={actionMenuRef}
				canDelete={!disableDelete && hasPersistedSelection && Object.keys(editingRecord).length === 0}
				onDeleteSelected={deleteSelected}
				editingCount={Object.keys(editingRecord).length}
				onSaveEditing={saveEditingRows}
				actions={actions}
				selectedRecords={selectedRecords}
				onAction={(action) => {
					action.onClick(selectedRecords, loadLazyData);
					setActionMenuOpen(false);
				}}
				perPageList={perPageList}
				rows={searchState.rows}
				onRowsChange={(rows) => setSearchState((prev) => ({ ...prev, rows }))}
				useGlobalSearch={useGlobalSearch}
				search={searchState.search || ""}
				onSearchChange={(search) => setSearchState((prev) => ({ ...prev, search, first: 0, page: 1 }))}
				page={searchState.page}
				totalPages={totalPages}
				onPageChange={onPageChange}
				pageInput={pageInput}
				onPageInputChange={setPageInput}
				onPageInputCommit={commitPageInput}
				displayStart={1 + searchState.first}
				displayEnd={searchState.first + searchState.rows < totalRecords ? searchState.first + searchState.rows : totalRecords}
				totalRecords={totalRecords}
				tr={tr}
				t={t}
			/>
		</div>
	);
});

export default DataTable;
export type { Column, DataTableFilterConfig };
