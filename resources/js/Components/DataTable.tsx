import React, { useEffect, useState, useRef, JSX } from "react";
import axios from "axios";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ArrowPathIcon,
} from "@heroicons/react/20/solid";
import { handleDoubleClick } from "@hubjutsu/Helper/doubleClick";
import classNames from "classnames";
import Checkbox from "./Checkbox";
import { DateTime } from "luxon";

import { Transition } from "@headlessui/react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/20/solid";

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

interface DataTableProps {
	routemodel?: string;
	columns: Column[];
	filters?: Record<string, any>;
	height?: string | null;
	datakey?: string;
	with?: string[];
	perPage?: number;
	newRecord?: false | Record<string, any> | string | (() => void) | null;
}

const DataTable: React.FC<DataTableProps> = ({
	routemodel,
	columns,
	filters = {},
	datakey = "id",
	height = null,
	perPage = 10,
	newRecord = null,
	with: withRelations = [],
}) => {
	const tableRef = useRef<HTMLTableElement>(null);

	const stickyLeft = (idx: number) => {
		const widths = ["2em"];
		for (let i = 0; i < idx; i++)
			if (columns[i].frozen) widths.push(columns[i].width ?? "150px");
		return `calc(${widths.join(" + ")})`;
	};

	const stickyZBody = () => 10;
	const stickyZHead = () => 20;

	// 📌 State-Variablen
	const [loading, setLoading] = useState(false);
	const [totalRecords, setTotalRecords] = useState(0);
	const [records, setRecords] = useState<Row[]>([]);
	const [selectedRecords, setSelectedRecords] = useState<Row[]>([]);
	const [error, setError] = useState<null | string | any>(null);
	const [editingRecord, setEditingRecord] = useState<{ [key: string]: Row }>(
		{}
	);
	const [searchState, setSearchState] = useState({
		first: 0,
		rows: perPage,
		page: 1,
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
		multiSortMeta: { [datakey]: 1 } as Record<string, 1 | -1>,
		with: withRelations,
	});

	const perPageList = [2, 10, 50, 100, 1000];
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
				setLoading(false);
				setError(error);
			});
	};

	// 📌 Sortierung
	const handleSort = (field: string) => {
		setSearchState((prev) => {
			let ms = prev.multiSortMeta;
			if (!ms[field]) {
				ms = { [field]: 1 };
			} else if (ms[field] === 1) {
				ms = { [field]: -1 };
			} else {
				const { [field]: _, ...rest } = ms;
				ms = rest as any;
			}
			return {
				...prev,
				multiSortMeta: ms,
			};
		});
	};

	// 📌 Paginierung
	const onPageChange = (newPage: number) => {
		setSearchState((prev) => ({
			...prev,
			page: newPage,
			first: (newPage - 1) * prev.rows,
		}));
	};

	// 📌 Inline-Editing aktivieren
	const enableEditing = (row: Row) => {
		toggleRowSelection(row, true);
		setEditingRecord((prev) => ({ ...prev, [row[datakey]]: row }));
	};

	const disableEditing = (id: string) => {
		setEditingRecord((prev) => {
			const clone = { ...prev };
			delete clone[id];
			return clone;
		});
	};

	// 📌 Inline-Editing speichern / abbrechen
	const handleKeyDown = (e: any, field: string, row: Row, row_ofs: number) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();

			setRecords((prev) => {
				const newRecords = [...prev];
				newRecords[row_ofs] = editingRecord[row[datakey]];
				return newRecords;
			});

			setLoading(true);
			const updateOrCreateRoute = row[datakey]
				? route("api.model.update", {
						model: routemodel,
						id: row[datakey],
						with: withRelations,
				  })
				: route("api.model.create", { model: routemodel, with: withRelations });

			axios
				.post(updateOrCreateRoute, editingRecord[row[datakey]])
				.then((response) => {
					setLoading(false);
					disableEditing(row[datakey]);
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
		}
		if (e.key === "Escape") disableEditing(row[datakey]);
	};

	const setRowValue = (id: string, field: string, value: any) => {
		setEditingRecord((prev) => {
			const row = prev[id];
			return { ...prev, [id]: { ...row, [field]: value } };
		});
	};

	// 📌 Zeile auswählen
	const toggleRowSelection = (row: Row, state?: boolean) => {
		if (editingRecord[row[datakey]]) state = true;

		if (state === undefined) {
			setSelectedRecords((prev) =>
				prev.includes(row) ? prev.filter((r) => r !== row) : [...prev, row]
			);
		} else if (state) {
			setSelectedRecords((prev) => [...prev, row]);
		} else {
			setSelectedRecords((prev) => prev.filter((r) => r !== row));
		}
	};

	// 📌 Alle Zeilen auswählen
	const toggleSelectAll = () => {
		setSelectedRecords(
			records.length === selectedRecords.length ? [] : [...records]
		);
	};

	// 📌 Neue Zeile hinzufügen oder Aktion ausführen
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

	return (
		<div
			className={classNames(
				"w-full flex flex-col",
				{ "h-full": !height },
				"bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
			)}
		>
			<div
				className="relative flex-grow overflow-auto"
				{...(height ? { style: { height } } : {})}
			>
				<Transition show={!!error}>
					<div className="absolute right-2 top-2 z-50 pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 transition">
						<div className="p-4">
							<div className="flex items-start">
								<div className="shrink-0">
									<ExclamationCircleIcon
										aria-hidden="true"
										className="size-6 text-red-400"
									/>
								</div>
								<div className="ml-3 w-0 flex-1 pt-0.5">
									<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
										Fehler beim Laden!
									</p>
									<p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
										{typeof error === "string"
											? error
											: error
											? error.message
											: ""}
									</p>
								</div>
								<div className="ml-4 flex shrink-0">
									<button
										type="button"
										onClick={() => setError(null)}
										className="inline-flex rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
									>
										<span className="sr-only">Close</span>
										<XMarkIcon aria-hidden="true" className="size-5" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</Transition>

				{/* 📌 Tabelle */}
				<table
					ref={tableRef}
					className="table-fixed border-separate border-spacing-0 min-w-full w-min"
				>
					{/* 📌 Tabellenkopf */}
					<thead className="bg-gray-200 dark:bg-gray-800 sticky top-0 z-20">
						<tr>
							<th
								className="border dark:border-gray-700 px-2 py-1 sticky left-0 bg-white dark:bg-gray-900 z-30"
								style={{ width: "2em" }}
							>
								<Checkbox
									checked={
										records.length === selectedRecords.length &&
										records.length > 0
									}
									onChange={toggleSelectAll}
								/>
							</th>
							{columns.map((col, idx) => (
								<th
									key={col.field}
									style={{
										width: col.width || "150px",
										...(col.frozen
											? { left: stickyLeft(idx), zIndex: stickyZHead() }
											: {}),
									}}
									className={classNames(
										"border dark:border-gray-700 text-center px-4 py-2 cursor-pointer",
										col.frozen && "sticky bg-white dark:bg-gray-900"
									)}
									onClick={( !col.sortable ? undefined : () => handleSort(col.field) )}
								>
									{col.label} {col.sortable ? <span>⬍</span> : null}
								</th>
							))}
						</tr>
					</thead>

					<tbody>
						{records.map((row, row_ofs) => {
							let firstEditor = true;
							return (
								<tr
									key={row[datakey]}
									className="hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									<td className="border dark:border-gray-700 text-center px-2 py-1 sticky left-0 bg-white dark:bg-gray-900 z-10">
										<Checkbox
											checked={selectedRecords.includes(row)}
											onChange={() => toggleRowSelection(row)}
										/>
									</td>
									{columns.map((col, idx) => {
										if (col.editor && firstEditor) {
											col.editor_properties = col.editor_properties || {};
											col.editor_properties.autoFocus = true;
											firstEditor = false;
										}
										return (
											<td
												key={col.field}
												style={{
													width: col.width || "150px",
													...(col.frozen
														? {
																left: stickyLeft(idx),
																zIndex: stickyZBody(),
														  }
														: {}),
												}}
												className={classNames(
													"border dark:border-gray-700",
													{
														"px-2 py-1": !(
															editingRecord[row[datakey]] && col.editor
														),
													},
													col.frozen && "sticky bg-white dark:bg-gray-900"
												)}
												onClick={handleDoubleClick(
													() => toggleRowSelection(row),
													() => enableEditing(row)
												)}
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
																className="w-full px-2 py-1 border rounded dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
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
																className="w-full px-2 py-1 border rounded dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
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
																className="w-full px-2 py-1 border rounded dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
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
																		<option key={index} value={option.value}>
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
																className="w-full px-2 py-1 border rounded dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
																{...col.editor_properties}
															/>
														)}
													</>
												) : (
													<div className="whitespace-nowrap overflow-hidden overflow-ellipsis w-full block">
														{col.formatter
															? col.formatter(row, col.field)
															: DataTableFormatter.default(row, col.field)}
													</div>
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

			{/* 📌 Paginierung */}
			<div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 sm:px-6">
				<div className="flex flex-1 justify-between sm:hidden">
					<button
						onClick={() => onPageChange(Math.max(searchState.page - 1, 1))}
						disabled={searchState.page === 1}
						className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
					>
						Previous
					</button>
					<button
						onClick={() => onPageChange(searchState.page + 1)}
						disabled={
							searchState.page >= Math.ceil(totalRecords / searchState.rows)
						}
						className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
					>
						Next
					</button>
				</div>
				<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
					<div className="flex flex-row items-center gap-4">
						<p className="text-sm text-gray-700 dark:text-gray-200">
							Showing{" "}
							<span className="font-medium">{1 + searchState.first}</span> to{" "}
							<span className="font-medium">
								{searchState.first + searchState.rows < totalRecords
									? searchState.first + searchState.rows
									: totalRecords}
							</span>{" "}
							of <span className="font-medium">{totalRecords}</span> results
						</p>

						<nav
							aria-label="Pagination"
							className="isolate inline-flex -space-x-px rounded-md shadow-sm"
						>
							<button
								onClick={() => onPageChange(Math.max(searchState.page - 1, 1))}
								className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0"
							>
								<span className="sr-only">Previous</span>
								<ChevronLeftIcon aria-hidden="true" className="size-5" />
							</button>
							{(() => {
								const totalPages = Math.ceil(totalRecords / searchState.rows);
								const maxVisiblePages = 7;
								const pages: (number | "...")[] = [];

								if (totalPages <= maxVisiblePages) {
									for (let i = 1; i <= totalPages; i++) pages.push(i);
								} else {
									pages.push(1);
									if (searchState.page <= 4) {
										for (let i = 2; i <= Math.min(5, totalPages); i++)
											pages.push(i);
										pages.push("...");
										pages.push(totalPages);
									} else if (searchState.page >= totalPages - 4) {
										pages.push("...");
										for (let i = totalPages - 4; i <= totalPages; i++)
											pages.push(i);
									} else {
										pages.push("...");
										pages.push(searchState.page - 1);
										pages.push(searchState.page);
										pages.push(searchState.page + 1);
										pages.push("...");
										pages.push(totalPages);
									}
								}

								return pages.map((page, index) => {
									if (page === "...") {
										return (
											<span
												key={`ellipsis-${index}`}
												className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:outline-offset-0"
											>
												...
											</span>
										);
									}

									const isCurrent = page === searchState.page;
									return (
										<button
											key={page}
											onClick={() =>
												typeof page === "number" && onPageChange(page)
											}
											className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
												isCurrent
													? "z-10 bg-primary text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
													: "text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-offset-0"
											} focus:z-20 focus:outline-offset-0`}
										>
											{page}
										</button>
									);
								});
							})()}
							<button
								onClick={() => onPageChange(searchState.page + 1)}
								disabled={
									searchState.page >= Math.ceil(totalRecords / searchState.rows)
								}
								className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0"
							>
								<span className="sr-only">Next</span>
								<ChevronRightIcon aria-hidden="true" className="size-5" />
							</button>
						</nav>

						<select
							defaultValue={searchState.rows}
							onChange={(e) =>
								setSearchState((prev) => ({
									...prev,
									rows: parseInt(e.target.value),
								}))
							}
							className="appearance-none rounded-md bg-white dark:bg-gray-900 px-auto py-1 text-base text-gray-900 dark:text-gray-100 outline outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
						>
							{perPageList.map((lines) => (
								<option key={lines}>{lines}</option>
							))}
						</select>

						<button
							onClick={() => loadLazyData()}
							className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0"
						>
							<span className="sr-only">Reload</span>
							<ArrowPathIcon
								aria-hidden="true"
								className={classNames("size-5 ", { "animate-spin": loading })}
							/>
						</button>

						{newRecord !== false && (
							<button
								onClick={handleNewRecord}
								className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
							>
								New
							</button>
						)}
					</div>
					<div></div>
				</div>
			</div>
		</div>
	);
};

const DataTableFormatter = {
	default(row: Row, field: string) {
		if (field.includes(".")) {
			const parts = field.split(".");
			return (
				parts.reduce(
					(acc, part) => (acc && acc[part] ? acc[part] : undefined),
					row
				) ?? ""
			);
		}
		if (row[field] === undefined || row[field] === null) return "";
		if (typeof row[field] === "object") return JSON.stringify(row[field]);
		return row[field] || "";
	},

	datetime: (row: Row, field: string) => {
		if (!row[field]) return "";
		const date = DateTime.fromISO(row[field], { zone: "utc" }).setZone(
			"Europe/Vienna"
		);
		return date.isValid
			? date.toLocaleString(DateTime.DATETIME_MED)
			: row[field];
	},
};

export default DataTable;
export { DataTableFormatter };
