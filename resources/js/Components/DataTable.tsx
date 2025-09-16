import React, { useEffect, useState, useRef, JSX, useMemo } from "react";
import axios from "axios";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronDoubleLeftIcon,
	ChevronDoubleRightIcon,
	ArrowPathIcon,
	TrashIcon,
	CheckIcon,
	PlusIcon,
	FunnelIcon
} from "@heroicons/react/20/solid";
import { handleDoubleClick } from "@hubjutsu/Helper/doubleClick";
import classNames from "classnames";
import Checkbox from "@/Components/Checkbox";
import { DateTime } from "luxon";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import DangerButton from "@/Components/DangerButton";
import DataTableFilter from "@/Components/DataTableFilter";

import { flushSync } from "react-dom";
import { useSearch } from "@/Components/SearchContext";
import { useLaravelReactI18n } from "laravel-react-i18n";
import ErrorToast from "@/Components/ErrorToast";
import { DataTableFormatter } from "@/Components/DataTableFormatter";

// 📌 Spalten-Typen definieren
interface Column {
	label?: string;
	field: string;
	editor?: "text" | "number" | "select" | any;
	editor_properties?: Record<string, any>;
	sortable?: boolean;
	filter?: boolean | string | any;

	frozen?: boolean;
	width?: string;
	align?: string;
	headerAlign?: string;
	formatter?: (row: Row, field: string) => JSX.Element;
}

interface Row {
	[key: string]: any;
}

interface DataTableAction {
	label: string;
	icon?: JSX.Element;
	onClick: (selectedRecords: Row[]) => void;
	variant?: "primary" | "secondary" | "danger" | "link";
	disabled?: boolean | ((selectedRecords: Row[]) => boolean);
}

interface DataTableProps {
	routemodel?: string;
	columns: Column[];
	filters?: Record<string, any>;
	height?: string | null;
	datakey?: string;
	with?: string[];
	perPage?: number;
	newRecord?: false | Record<string, any> | string | (() => void) | null;
	disableDelete?: boolean;
	useGlobalSearch?: boolean;
	defaultSortField?: string | Array<[string, number]>;
	actions?: DataTableAction[];
}

interface SearchState {
	first: number;
	rows: number;
	page: number;
	search?: string;
	filters: Array<{ field: string; matchMode: string; value: any }>;
	multiSortMeta: Array<[string, number]>;
	with: string[];
}

const DataTable: React.FC<DataTableProps> = ({
	routemodel,
	columns,
	filters = {},
	datakey = "id",
	height = null,
	perPage = 20,
	newRecord = null,
	with: withRelations = [],
	disableDelete = false,
	useGlobalSearch = true,
	defaultSortField = undefined,
	actions = [],
}) => {
	const tableRef = useRef<HTMLTableElement>(null);

	const { t } = useLaravelReactI18n();

	const { query } = useSearch();

	const stickyLeft = (idx: number) => {
		const widths = ["3rem"]; // checkbox column is always sticky
		for (let i = 0; i < idx; i++)
			if (columns[i].frozen) widths.push(columns[i].width ?? "180px");
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
	const showDividerOnCheckbox = lastFrozenIndex === -1;
	const StickyRightDivider = ({ z = 999 }: { z?: number }) => (
		<span
			className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gray-200 dark:bg-gray-700"
			style={{ zIndex: z }}
		/>
	);
	// 📌 State-Variablen
	const [loading, setLoading] = useState(false);
	const [totalRecords, setTotalRecords] = useState(0);
	const [records, setRecords] = useState<Row[]>([]);
	const [selectedRecords, setSelectedRecords] = useState<Row[]>([]);
	const [error, setError] = useState<null | string | any>(null);
	const [editingRecord, setEditingRecord] = useState<{ [key: string]: Row }>(
		{}
	);
	const [showFilterPanel, setShowFilterPanel] = useState(false);
	const [activeFilters, setActiveFilters] = useState<{ [field: string]: any }>(
		{}
	);
	const [searchState, setSearchState] = useState(() => {
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
			filters: Object.keys(filters).map((key) => {
				const value = filters[key];
				if (Array.isArray(value) && value.length > 0) {
					return { field: key, matchMode: "IN", value: value };
				}
				if (
					typeof value === "object" &&
					value !== null &&
					"matchMode" in value &&
					"value" in value
				) {
					return {
						field: key,
						matchMode: (value as any).matchMode,
						value: (value as any).value,
					};
				}
				return { field: key, matchMode: "=", value: value };
			}),
			multiSortMeta: initialSort,
			with: withRelations,
		};
	});

	useEffect(() => {
		setSearchState((prev) => {
			return { ...prev, search: query, first: 0, page: 1 };
		});
	}, [query]);

	const perPageList = [2, 10, 15, 20, 50, 100, 1000];
	if (perPageList.indexOf(perPage) === -1) {
		perPageList.push(perPage);
		perPageList.sort((a, b) => a - b);
	}

	useEffect(() => {
		loadLazyData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchState]);

	const loadLazyData = () => {
		setError(null);
		setSelectedRecords([]);
		setEditingRecord({});

		setLoading(true);

		axios
			.get(route("api.model.search", { model: routemodel }), {
				params: searchState,
			})
			.then((response) => {
				setLoading(false);
				setRecords(response.data.data);
				setTotalRecords(response.data.total);
			})
			.catch((error) => {
				console.log(error);
				setLoading(false);
				setError(error.response?.data || error.message || error.toString() || "Error");
			});
	};

	// 📌 Sortierung
	const handleSort = (field: string, event?: React.MouseEvent) => {
		setSearchState((prev) => {
			let ms = [ ...prev.multiSortMeta ];
			const isShiftClick = event?.shiftKey;
			
			const existingIndex = ms.findIndex(([f]) => f === field);
			if (isShiftClick) {
				if (existingIndex === -1) {
					ms.push([field, 1]);
				} else {
					ms[existingIndex][1] *= -1;
				}

			} else {
				if (existingIndex !== -1) {
					ms = [[field, -ms[existingIndex][1] ]];
				} else {
					ms = [[field, 1]];
				}
			}

			return {
				...prev,
				multiSortMeta: ms,
			};
		});
	};


	const getSortOrderText = (index: number) => {
		const suffixes = ["th", "st", "nd", "rd"];
		const v = index % 100;
		return index + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
	};

	const applyFilter = (field: string, value: any, matchMode?: string) => {
		const newFilters = { ...activeFilters };

		if (
			value === null ||
			value === undefined ||
			value === "" ||
			(Array.isArray(value) && value.length === 0)
		) {
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
				newFilters[field] = {
					value,
					matchMode: matchMode || "contains",
				};
			}
		}

		setActiveFilters(newFilters);

		setSearchState((prev) => ({
			...prev,
			first: 0,
			page: 1,
			filters: Object.entries(newFilters).map(([field, filter]) => ({
				field,
				matchMode: filter.matchMode,
				value: filter.value,
			})),
		}));
	};

	const clearFilter = (field: string) => {
		applyFilter(field, null);
	};

	const clearAllFilters = () => {
		setActiveFilters({});
		setSearchState((prev) => ({
			...prev,
			first: 0,
			page: 1,
			filters: prev.filters.filter((f) =>
				Object.keys(filters).includes(f.field)
			),
		}));
	};

	// 📌 Paginierung
	const onPageChange = (newPage: number) => {
		setSearchState((prev) => ({
			...prev,
			page: newPage,
			first: (newPage - 1) * prev.rows,
		}));
	};

	const focusEditor = (target: any, field: string) => {
		if (
			["select", "input", "textarea"].includes(target.tagName.toLowerCase())
		) {
			return;
		}
		const td = target.closest("td");
		setTimeout(() => {
			td?.querySelector("input,textarea,select")?.focus();
		}, 100);
	};

	const enableEditing = (row: Row) => {
		toggleRowSelection(row, true);
		const id = row[datakey];
		setEditingRecord((prev) => {
			if (prev[id]) return prev;
			return { ...prev, [id]: { ...row } }; // klonen, kein Ref-Sharing
		});
	};

	const disableEditing = (id: string) => {
		setEditingRecord((prev) => {
			const clone = { ...prev };
			delete clone[id];
			return clone;
		});
	};

	const saveRow = (editingRecordId: string, row_ofs: number) => {
		setRecords((prev) => {
			const newRecords = [...prev];
			newRecords[row_ofs] = editingRecord[editingRecordId];
			return newRecords;
		});

		setLoading(true);
		const updateOrCreateRoute = editingRecordId
			? route("api.model.update", {
					model: routemodel,
					[datakey]: editingRecordId,
					with: withRelations,
			  })
			: route("api.model.create", { model: routemodel, with: withRelations });

		axios
			.post(updateOrCreateRoute, editingRecord[editingRecordId])
			.then((response) => {
				setLoading(false);
				disableEditing(editingRecordId);
				toggleRowSelection(response.data, true);
				setRecords((prev) => {
					const newRecords = [...prev];
					newRecords[row_ofs] = response.data;
					return newRecords;
				});
			})
			.catch((error) => {
				setError(error);
				setLoading(false);
			});
	};

	const handleKeyDown = (e: any, field: string, row: Row, row_ofs: number) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();
			flushSync(() => {});
			saveRow(row[datakey], row_ofs);
		}
		if (e.key === "Escape") {
			if (row[datakey] === 0) {
				setRecords((prev) => prev.filter((r) => r !== row));
			}
			disableEditing(row[datakey]);
		}
	};

	const setRowValue = (id: string, field: string, value: any) => {
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
			setSelectedRecords((prev) =>
				prev.findIndex((r) => r[datakey] === row[datakey]) !== -1
					? prev.filter((r) => r[datakey] !== row[datakey])
					: [...prev, row]
			);
		} else if (state) {
			setSelectedRecords((prev) => [
				...prev.filter((r) => r[datakey] !== row[datakey]),
				row,
			]);
		} else {
			setSelectedRecords((prev) =>
				prev.filter((r) => r[datakey] !== row[datakey])
			);
		}
	};

	const toggleSelectAll = () => {
		setSelectedRecords(
			records.length === selectedRecords.length ? [] : [...records]
		);
	};

	const handleNewRecord = () => {
		if (newRecord === false) return;

		if (typeof newRecord === "string") {
			window.location.href = newRecord;
		} else if (typeof newRecord === "function") {
			newRecord();
		} else {
			const newRow = newRecord || { [datakey]: 0 };
			setRecords((prev) => [newRow, ...prev]);
			setEditingRecord((prev) => ({
				...prev,
				[newRow[datakey]]: newRow,
			}));
		}
	};

	const hasActiveFilters = Object.keys(activeFilters).length > 0;

	return (
		<div
			className={classNames("w-full h-full flex flex-col")}
			style={{
				...(height ? { height } : {}),
			}}
		>
			<div
				className="relative flex-grow overflow-auto w-full"
				{...(height ? { style: { height } } : {})}
			>
				
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

				{/* 📌 Tabelle */}
				<div className="bg-white dark:bg-gray-900  border border-gray-200 dark:border-gray-700 overflow-hidden w-full h-full flex-1">
					<div className="overflow-x-auto w-full h-full">
						<table
							ref={tableRef}
							className="w-full min-w-full table-fixed border-collapse"
						>
							{/* 📌 Tabellenkopf */}
							<thead
								className="bg-gray-50 dark:bg-gray-800 sticky top-0"
								style={{ zIndex: headerZIndex }}
							>
								<tr>
									<th
										className=" px-3 py-2 text-left text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider  border-gray-200 dark:border-gray-700 sticky left-0 z-20 bg-gray-50 dark:bg-gray-800"
										style={{ width: "3rem" }}
									>
										<Checkbox
											checked={
												records.length === selectedRecords.length &&
												records.length > 0
											}
											onChange={toggleSelectAll}
										/>
										{/* Always show right border for checkbox column */}
										<StickyRightDivider z={headerZIndex + 5} />
									</th>
									{columns.map((col, idx) => (
										<th
											key={col.field}
											style={{
												width: col.width || "auto",
												...(col.frozen
													? { left: stickyLeft(idx), zIndex: stickyZHead(idx) }
													: {}),
											}}
											className={classNames(
												"relative px-3 py-2 text-left text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0",
												col.frozen &&
													"border-r-0 sticky bg-gray-50 dark:bg-gray-800",
												col.sortable &&
													"cursor-pointer hover:bg-gray-100 dark:hover:bg-primary-800/10"
											)}
											onClick={
												!col.sortable
													? undefined
													: (e) => {
															if (
																(e.target as Element)?.closest(
																	".filter-dropdown"
																)
															) {
																return;
															}
															handleSort(col.field, e);
													  }
											}
										>
											<div className="flex items-center min-w-0">
												<span className="truncate">{col.label}</span>
												<div className="ml-2 flex items-center gap-1 flex-shrink-0">
													{col.sortable && (
													<div className="ml-2 flex items-center gap-1 flex-shrink-0">
														{searchState.multiSortMeta.findIndex(([field]) => field === col.field) !== -1 ? (
															<>
																<span className="text-[0.5rem] font-medium text-white bg-primary px-1 py-0.25 rounded-full">
																	{getSortOrderText(
																		Math.abs(
																			searchState.multiSortMeta.findIndex(([field]) => field === col.field) + 1
																		)
																	)}
																</span>
																<span className="text-primary text-sm">
																	{(searchState.multiSortMeta.find(([field]) => field === col.field) || [col.field,1])[1] > 0
																		? "↑"
																		: "↓"}
																</span>
															</>
														) : null}
													</div>
												)}
												</div>
											</div>

											{col.frozen && (
												<StickyRightDivider z={stickyZHead(idx) + 5} />
											)}
										</th>
									))}
								</tr>
							</thead>

							<tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
								{records.map((row, row_ofs) => {
									let firstEditor = true;
									const isSelected = selectedRecords.includes(row);

									return (
										<tr
											key={row[datakey]}
											className={classNames(
												"group hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150",
												isSelected && "bg-primary-50 dark:bg-primary-800/10",
												row_ofs % 2 === 0
													? "bg-white dark:bg-gray-900"
													: "bg-gray-50 dark:bg-gray-800"
											)}
										>
											{/* Sticky checkbox TD (solid backgrounds in dark mode) */}
											<td
												className={classNames(
													" px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100  border-gray-200 dark:border-gray-700 sticky left-0 z-10",
													isSelected
														? "bg-primary-50 dark:bg-primary-900 group-hover:bg-primary-100 dark:group-hover:bg-primary-900"
														: row_ofs % 2 === 0
														? "bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-700"
														: "bg-gray-50 dark:bg-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-gray-600"
												)}
											>
												<Checkbox
													checked={isSelected}
													onChange={() => toggleRowSelection(row)}
												/>

												<StickyRightDivider z={stickyZBody(0) + 5} />
											</td>

											{columns.map((col, idx) => {
												if (col.editor && firstEditor) {
													col.editor_properties = col.editor_properties || {};
													col.editor_properties.autoFocus = true;
													firstEditor = false;
												}

												const isFrozen = col.frozen;
												const isLastFrozen =
													isFrozen && idx === lastFrozenIndex;

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
															width: col.width || "auto",
															...stickyStyle,
														}}
														className={classNames(
															"relative whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0",
															{
																"px-3 py-2": !(
																	editingRecord[row[datakey]] && col.editor
																),
																// Sticky/frozen columns
																["sticky border-r-0"]: isFrozen,
																// Selected row
																["bg-primary-50 dark:bg-primary-900 group-hover:bg-primary-100 dark:group-hover:bg-primary-900"]:
																	isSelected,
																// Unselected, even row
																["bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-700"]:
																	!isSelected && row_ofs % 2 === 0,
																// Unselected, odd row
																["bg-gray-50 dark:bg-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-gray-600"]:
																	!isSelected && row_ofs % 2 !== 0,
																// Sticky/frozen column backgrounds
																["bg-gray-50 dark:bg-gray-800"]:
																	isFrozen && !isSelected,
															}
														)}
														onClick={
															Object.keys(editingRecord).length > 0
																? (event) => {
																		enableEditing(row);
																		focusEditor(event.target, col.field);
																  }
																: handleDoubleClick(
																		(event) => toggleRowSelection(row),
																		(event) => {
																			enableEditing(row);
																			focusEditor(event.target, col.field);
																		}
																  )
														}
													>
														{editingRecord[row[datakey]] && col.editor ? (
															<>
																{col.editor === "number" && (
																	<input
																		type="number"
																		defaultValue={row[col.field]}
																		onKeyDown={(e) =>
																			handleKeyDown(e, col.field, row, row_ofs)
																		}
																		className="text-sm w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary rounded-md"
																		{...col.editor_properties}
																		onChange={(e) =>
																			setRowValue(
																				row[datakey],
																				col.field,
																				e.target.value
																			)
																		}
																	/>
																)}

																{col.editor === "datetime" && (
																	<input
																		type="datetime-local"
																		defaultValue={
																			row[col.field]
																				? DateTime.fromISO(row[col.field], {
																						zone: "utc",
																				  })
																						.setZone("Europe/Vienna")
																						.toFormat("yyyy-MM-dd'T'HH:mm")
																				: ""
																		}
																		onKeyDown={(e) =>
																			handleKeyDown(e, col.field, row, row_ofs)
																		}
																		className="text-sm w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary rounded-md"
																		{...col.editor_properties}
																		onChange={(e) =>
																			setRowValue(
																				row[datakey],
																				col.field,
																				e.target.value
																			)
																		}
																	/>
																)}

																{col.editor === "select" && (
																	<select
																		defaultValue={row[col.field]}
																		onKeyDown={(e) =>
																			handleKeyDown(e, col.field, row, row_ofs)
																		}
																		className="text-sm w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary rounded-md"
																		{...col.editor_properties}
																		onChange={(e) =>
																			setRowValue(
																				row[datakey],
																				col.field,
																				e.target.value
																			)
																		}
																	>
																		<option value="">-- Select --</option>
																		{col.editor_properties?.options?.map(
																			(option: any, index: number) => (
																				<option
																					key={index}
																					value={option.value}
																				>
																					{option.label}
																				</option>
																			)
																		)}
																	</select>
																)}

																{!["select", "number", "datetime"].includes(
																	col.editor
																) && (
																	<input
																		type={col.editor}
																		defaultValue={row[col.field]}
																		onKeyDown={(e) =>
																			handleKeyDown(e, col.field, row, row_ofs)
																		}
																		onChange={(e) =>
																			setRowValue(
																				row[datakey],
																				col.field,
																				e.target.value
																			)
																		}
																		className="text-sm w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary rounded-md"
																		{...col.editor_properties}
																	/>
																)}
															</>
														) : (
															<div className="text-gray-900 dark:text-gray-100">
																{col.formatter
																	? col.formatter(row, col.field)
																	: DataTableFormatter.default(row, col.field)}
															</div>
														)}

														{isFrozen && (
															<StickyRightDivider z={stickyZBody(idx) + 5} />
														)}
													</td>
												);
											})}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* 📌 Paginierung */}
			<div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-4 py-2 dark:border-gray-700 text-xs">
				<div className="flex items-center gap-4">

					<div className="flex items-center gap-1">
						<span className="text-gray-600 dark:text-gray-400">
							Show:
						</span>
						<select
							defaultValue={searchState.rows}
							onChange={(e) =>
								setSearchState((prev) => ({
									...prev,
									rows: parseInt(e.target.value),
								}))
							}
							className="text-xs appearance-none rounded-lg bg-white dark:bg-gray-700 px-2 py-1 pr-5 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
						>
							{perPageList.map((lines) => (
								<option key={lines}>{lines}</option>
							))}
						</select>
					</div>

					<nav aria-label="Pagination" className="flex items-center gap-1">
						<SecondaryButton
							onClick={() => onPageChange(1)}
							disabled={searchState.page === 1}
							className="text-xs px-2 py-2"
						>
							<ChevronDoubleLeftIcon className="size-2" />
						</SecondaryButton>

						<SecondaryButton
							onClick={() => onPageChange(Math.max(searchState.page - 1, 1))}
							disabled={searchState.page === 1}
							className="text-xs px-2 py-2"
						>
							<ChevronLeftIcon className="size-2" />
						</SecondaryButton>

						{(() => {
							const totalPages = Math.ceil(totalRecords / searchState.rows);
							const currentPage = searchState.page;
							const pages = [];

							pages.push(1);

							let start = Math.max(2, currentPage - 1);
							let end = Math.min(totalPages - 1, currentPage + 1);

							// Adjust range for edge cases
							if (currentPage <= 3) {
								end = Math.min(totalPages - 1, 4);
							} else if (currentPage >= totalPages - 2) {
								start = Math.max(2, totalPages - 3);
							}

							if (start > 2) {
								pages.push("...");
							}

							for (let i = start; i <= end; i++) {
								if (i > 1 && i < totalPages) {
									pages.push(i);
								}
							}

							if (end < totalPages - 1) {
								pages.push("...");
							}

							if (totalPages > 1) {
								pages.push(totalPages);
							}

							return pages.map((page, index) => (
								<React.Fragment key={index}>
									{page === "..." ? (
										<span className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500">
											...
										</span>
									) : (
										<button
											onClick={() => onPageChange(page as number)}
											className={classNames(
												"px-2 py-1 text-xs rounded border transition-all duration-200",
												currentPage === page
													? "bg-primary text-white border-primary"
													: "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100"
											)}
										>
											{page}
										</button>
									)}
								</React.Fragment>
							));
						})()}

						<SecondaryButton
							onClick={() => onPageChange(searchState.page + 1)}
							disabled={
								searchState.page >= Math.ceil(totalRecords / searchState.rows)
							}
							className="text-xs px-2 py-2"
						>
							<ChevronRightIcon className="size-2" />
						</SecondaryButton>

						<SecondaryButton
							onClick={() =>
								onPageChange(Math.ceil(totalRecords / searchState.rows))
							}
							disabled={
								searchState.page >= Math.ceil(totalRecords / searchState.rows)
							}
							className="text-xs px-2 py-2"
						>
							<ChevronDoubleRightIcon className="size-2" />
						</SecondaryButton>
					</nav>

					<div className="flex items-center gap-4">
						{columns.length > 0 && (
							<SecondaryButton
								onClick={() => setShowFilterPanel(!showFilterPanel)}
								className={classNames(
									"inline-flex items-center justify-center text-xs px-3 py-2 min-w-[100px]",
									showFilterPanel
										? "bg-primary "
										: hasActiveFilters
										? "bg-primary-50 dark:bg-primary-900 text-primary border-primary"
										: "",
									"gap-2 relative"
								)}
							>
								<FunnelIcon aria-hidden="true" className="size-4 mr-1" />
								Filter
								{hasActiveFilters && (
									<span className="ml-2 bg-red-500 text-white text-[10px] rounded-full px-1.5 min-w-[16px] h-4 flex items-center justify-center">
										{Object.keys(activeFilters).length}
									</span>
								)}
							</SecondaryButton>
						)}

						<SecondaryButton
							onClick={() => loadLazyData()}
							className="flex items-center gap-2 text-xs px-2 py-2"
						>
							<ArrowPathIcon
								aria-hidden="true"
								className={classNames("size-2", { "animate-spin": loading })}
							/>
						</SecondaryButton>

						{!disableDelete &&
							selectedRecords.length > 0 &&
							Object.keys(editingRecord).length === 0 && (
								<DangerButton
									onClick={() => {
										if (
											!confirm(
												"Are you sure you want to delete the selected records?"
											)
										)
											return;
										// iterate through selected records and delete them
										const deletedRecordIndex: number[] = [];
										selectedRecords.forEach((record, idx) => {
											const index = records.findIndex(
												(r) => r[datakey] === record[datakey]
											);
											if (index !== -1) {
												axios
													.delete(
														route("api.model.delete", {
															model: routemodel,
															id: record[datakey],
														})
													)
													.then(() => {
														// on success, remove record from records
														setRecords((records) => {
															const index = records.findIndex(
																(r) => r[datakey] === record[datakey]
															);
															if (index !== -1) {
																records.splice(index, 1);
															}
															return [...records];
														});
														toggleRowSelection(record, false);
														setTotalRecords((prev) => prev - 1);
													})
													.catch((error) => {
														setError(error);
													});
											}
										});
									}}
									className="text-xs flex items-center gap-2 px-2 py-1 "
								>
									<TrashIcon aria-hidden="true" className="size-4" />
									<span>Delete</span>
								</DangerButton>
							)}

						{Object.keys(editingRecord).length > 0 && (
							<PrimaryButton
								onClick={() => {
									// iterate through rows, check if editing is enabled and save row
									Object.keys(editingRecord).forEach((id) => {
										const row_ofs = records.findIndex(
											(r) => r[datakey] === editingRecord[id][datakey]
										);
										if (row_ofs !== -1) saveRow(id, row_ofs);
									});
								}}
								className="flex items-center gap-2 text-xs px-2 py-1"
							>
								<CheckIcon aria-hidden="true" className="size-4" />
								<span>{t("Save")}</span>
							</PrimaryButton>
						)}

						{newRecord !== false && (
							<PrimaryButton
								onClick={handleNewRecord}
								className="text-xs flex items-center gap-2 px-2 py-1"
							>
								<PlusIcon aria-hidden="true" className="size-4" />
								<span>New</span>
							</PrimaryButton>
						)}

						{actions?.length > 0 && actions.map((action, idx) => {
							const isDisabled = (typeof action.disabled === "function" ? action.disabled(selectedRecords) : action.disabled) ?? selectedRecords.length === 0;
							const ButtonComponent =
								action.variant === "danger"
									? DangerButton
									: action.variant === "link"
									? "button"
									: action.variant === "secondary"
									? SecondaryButton
									: PrimaryButton;
							return (
								<ButtonComponent
									key={idx}
									onClick={() => action.onClick(selectedRecords)}
									disabled={isDisabled}
									className={classNames("text-xs flex items-center gap-2 px-2 py-1", isDisabled && 'opacity-50 cursor-not-allowed')}
								>
									{action.icon && <span aria-hidden="true"  className="size-4">{action.icon}</span>}
									{action.label}
								</ButtonComponent>
							);
						})}
					</div>
				</div>

				<div className=" text-gray-600 dark:text-gray-400">
					Displaying {1 + searchState.first} to{" "}
					{searchState.first + searchState.rows < totalRecords
						? searchState.first + searchState.rows
						: totalRecords}{" "}
					of {totalRecords} item{totalRecords !== 1 ? "s" : ""}
				</div>
			</div>
		</div>
	);
};



export default DataTable;
