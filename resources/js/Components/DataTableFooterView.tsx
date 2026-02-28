import React from "react";
import classNames from "classnames";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronDoubleLeftIcon,
	ChevronDoubleRightIcon,
	ArrowPathIcon,
	TrashIcon,
	CheckIcon,
	PlusIcon,
	FunnelIcon,
	EllipsisHorizontalIcon,
} from "@heroicons/react/20/solid";
import NeutralButton from "@/Components/NeutralButton";
import PrimaryButton from "@/Components/PrimaryButton";
import DangerButton from "@/Components/DangerButton";
import IconLibrary from "@/Components/IconLibrary";
import type { DataTableAction, Row } from "@/Components/DataTableTypes";

interface DataTableFooterViewProps {
	condensed: boolean;
	columnsLength: number;
	showFilterPanel: boolean;
	hasActiveFilters: boolean;
	activeFiltersCount: number;
	onToggleFilterPanel: () => void;
	onReload: () => void;
	loading: boolean;
	canCreate: boolean;
	onCreate: () => void;
	actionMenuOpen: boolean;
	onToggleActionMenu: () => void;
	actionMenuRef: React.RefObject<HTMLDivElement>;
	canDelete: boolean;
	onDeleteSelected: () => void;
	editingCount: number;
	onSaveEditing: () => void;
	actions: DataTableAction[];
	selectedRecords: Row[];
	onAction: (action: DataTableAction) => void;
	perPageList: number[];
	rows: number;
	onRowsChange: (rows: number) => void;
	useGlobalSearch: boolean;
	search: string;
	onSearchChange: (search: string) => void;
	page: number;
	totalPages: number;
	onPageChange: (newPage: number) => void;
	pageInput: string;
	onPageInputChange: (value: string) => void;
	onPageInputCommit: () => void;
	displayStart: number;
	displayEnd: number;
	totalRecords: number;
	tr: (key: string, fallback: string) => string;
	t: (key: string) => string;
}

const DataTableFooterView: React.FC<DataTableFooterViewProps> = ({
	condensed,
	columnsLength,
	showFilterPanel,
	hasActiveFilters,
	activeFiltersCount,
	onToggleFilterPanel,
	onReload,
	loading,
	canCreate,
	onCreate,
	actionMenuOpen,
	onToggleActionMenu,
	actionMenuRef,
	canDelete,
	onDeleteSelected,
	editingCount,
	onSaveEditing,
	actions,
	selectedRecords,
	onAction,
	perPageList,
	rows,
	onRowsChange,
	useGlobalSearch,
	search,
	onSearchChange,
	page,
	totalPages,
	onPageChange,
	pageInput,
	onPageInputChange,
	onPageInputCommit,
	displayStart,
	displayEnd,
	totalRecords,
	tr,
	t,
}) => {
	return (
		<div className="flex items-center justify-between bg-background-600 dark:bg-gray-800 px-4 py-2 dark:border-gray-700 text-xs">
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1">
					<span className="text-text-600 dark:text-gray-400">{tr("datatable.show", "Show:")}</span>
					<select
						value={rows}
						onChange={(e) => onRowsChange(parseInt(e.target.value, 10))}
						className="text-xs appearance-none rounded-lg bg-background dark:bg-gray-700 px-2 py-1 pr-5 text-text-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
					>
						{perPageList.map((lines) => (
							<option key={lines} value={lines}>
								{lines}
							</option>
						))}
					</select>
				</div>

				{!useGlobalSearch && (
					<input
						type="search"
						value={search}
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder={tr("datatable.search_placeholder", "Search...")}
						className="text-xs rounded-lg bg-background dark:bg-gray-700 px-2 py-1 text-text-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 min-w-[180px]"
					/>
				)}

				<nav aria-label="Pagination" className="flex items-center gap-1">
					<NeutralButton onClick={() => onPageChange(1)} disabled={page === 1} size="small" className="h-7 w-7 justify-center p-0 !border-0 shadow-sm">
						<ChevronDoubleLeftIcon className="h-3.5 w-3.5" />
					</NeutralButton>

					{condensed ? (
						<div className="flex items-center gap-1">
							<input
								type="number"
								min={1}
								max={totalPages}
								value={pageInput}
								onChange={(e) => onPageInputChange(e.target.value)}
								onBlur={onPageInputCommit}
								onKeyDown={(event) => {
									if (event.key === "Enter") onPageInputCommit();
								}}
								className="w-14 rounded border border-gray-300 bg-background px-2 py-1 text-xs text-text-700 focus:border-primary focus:ring-primary"
							/>
							<span className="text-xs text-text-400">/ {totalPages}</span>
						</div>
					) : (
						<>
							<NeutralButton
								onClick={() => onPageChange(Math.max(page - 1, 1))}
								disabled={page === 1}
								size="small"
								className="h-7 w-7 justify-center p-0 !border-0 shadow-sm"
							>
								<ChevronLeftIcon className="h-3.5 w-3.5" />
							</NeutralButton>

							{(() => {
								const currentPage = page;
								const pages: Array<number | string> = [1];
								let start = Math.max(2, currentPage - 1);
								let end = Math.min(totalPages - 1, currentPage + 1);

								if (currentPage <= 3) {
									end = Math.min(totalPages - 1, 4);
								} else if (currentPage >= totalPages - 2) {
									start = Math.max(2, totalPages - 3);
								}

								if (start > 2) pages.push("...");
								for (let i = start; i <= end; i++) {
									if (i > 1 && i < totalPages) pages.push(i);
								}
								if (end < totalPages - 1) pages.push("...");
								if (totalPages > 1) pages.push(totalPages);

								return pages.map((pageItem, index) => (
									<React.Fragment key={index}>
										{pageItem === "..." ? (
											<span className="px-2 py-1 text-xs text-text-400 dark:text-gray-500">...</span>
										) : (
											<button
												onClick={() => onPageChange(pageItem as number)}
												className={classNames(
													"px-2 py-1 text-xs rounded shadow-sm transition-all duration-200",
													currentPage === pageItem
														? "bg-primary text-white"
														: "bg-background dark:bg-gray-700 text-text-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-gray-600 hover:text-text-900 dark:hover:text-gray-100"
												)}
											>
												{pageItem}
											</button>
										)}
									</React.Fragment>
								));
							})()}

							<NeutralButton onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} size="small" className="h-7 w-7 justify-center p-0 !border-0 shadow-sm">
								<ChevronRightIcon className="h-3.5 w-3.5" />
							</NeutralButton>
						</>
					)}

					<NeutralButton onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} size="small" className="h-7 w-7 justify-center p-0 !border-0 shadow-sm">
						<ChevronDoubleRightIcon className="h-3.5 w-3.5" />
					</NeutralButton>
				</nav>

				<div className="flex items-center gap-2">
					{condensed ? (
						<>
							<NeutralButton onClick={onReload} size="small" className="h-7 w-7 justify-center p-0 !border-0 shadow-sm" title={tr("datatable.reload", "Reload")}>
								<ArrowPathIcon className={classNames("h-3.5 w-3.5", { "animate-spin": loading })} />
							</NeutralButton>

							{canCreate && (
								<PrimaryButton onClick={onCreate} size="small" className="h-7 px-2 py-0 text-xs">
									<PlusIcon className="mr-1 h-3.5 w-3.5" />
									{tr("datatable.new", "New")}
								</PrimaryButton>
							)}

							<div className="relative" ref={actionMenuRef}>
								<NeutralButton onClick={onToggleActionMenu} size="small" className="h-7 w-7 justify-center p-0 !border-0 shadow-sm">
									<EllipsisHorizontalIcon className="h-3.5 w-3.5" />
								</NeutralButton>
								{actionMenuOpen && (
									<div className="absolute bottom-0 right-0 z-20 mt-2 w-48 rounded-md border border-gray-200 bg-background py-1 text-xs text-text-700 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
										{columnsLength > 0 && (
											<button onClick={onToggleFilterPanel} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-primary-50 dark:hover:bg-gray-700 dark:text-gray-100">
												<FunnelIcon className="size-4" />
												<span>
													{tr("datatable.filter", "Filter")}
													{hasActiveFilters ? ` (${activeFiltersCount})` : ""}
												</span>
											</button>
										)}

										{canDelete && (
											<button onClick={onDeleteSelected} className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
												<TrashIcon className="size-4" />
												<span>{tr("datatable.delete", "Delete")}</span>
											</button>
										)}

										{editingCount > 0 && (
											<button onClick={onSaveEditing} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-primary-50 dark:hover:bg-gray-700 dark:text-gray-100">
												<CheckIcon className="size-4" />
												<span>{t("Save")}</span>
											</button>
										)}

										{actions.map((action, idx) => {
											const isDisabled = (typeof action.disabled === "function" ? action.disabled(selectedRecords) : action.disabled) ?? selectedRecords.length === 0;
											return (
												<button
													key={idx}
													onClick={() => {
														if (isDisabled) return;
														onAction(action);
													}}
													disabled={isDisabled}
													className={classNames(
														"flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-primary-50 dark:hover:bg-gray-700 dark:text-gray-100",
														isDisabled && "cursor-not-allowed opacity-50"
													)}
												>
													{action.icon && <span aria-hidden="true" className="size-4">{typeof action.icon === "string" ? <IconLibrary name={action.icon} /> : action.icon}</span>}
													<span>{action.label}</span>
												</button>
											);
										})}
									</div>
								)}
							</div>
						</>
					) : (
						<>
							{columnsLength > 0 && (
								<NeutralButton
									onClick={onToggleFilterPanel}
									size="small"
									className={classNames(
										"inline-flex items-center justify-center min-w-[72px] !border-0 shadow-sm",
										showFilterPanel
											? "bg-primary "
											: hasActiveFilters
											? "bg-primary-50 dark:bg-primary-900 text-primary"
											: "",
										"gap-1 relative"
									)}
								>
									<FunnelIcon aria-hidden="true" className="size-3.5" />
									{tr("datatable.filter", "Filter")}
									{hasActiveFilters && (
										<span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 min-w-[16px] h-4 flex items-center justify-center">
											{activeFiltersCount}
										</span>
									)}
								</NeutralButton>
							)}

							<NeutralButton onClick={onReload} className="flex items-center gap-1 text-xs px-2 py-2 !border-0 shadow-sm">
								<ArrowPathIcon aria-hidden="true" className={classNames("size-2", { "animate-spin": loading })} />
							</NeutralButton>

							{canDelete && (
								<DangerButton size="small" onClick={onDeleteSelected} className="text-xs flex items-center gap-2 px-2 py-1">
									<TrashIcon aria-hidden="true" className="size-4" />
									<span>{tr("datatable.delete", "Delete")}</span>
								</DangerButton>
							)}

							{editingCount > 0 && (
								<PrimaryButton onClick={onSaveEditing} size="small" className="flex items-center gap-1.5">
									<CheckIcon aria-hidden="true" className="size-3.5" />
									<span>{t("Save")}</span>
								</PrimaryButton>
							)}

							{canCreate && (
								<PrimaryButton onClick={onCreate} size="small" className="flex items-center gap-1.5">
									<PlusIcon aria-hidden="true" className="size-3.5" />
									<span>{tr("datatable.new", "New")}</span>
								</PrimaryButton>
							)}

							{actions.map((action, idx) => {
								const isDisabled = (typeof action.disabled === "function" ? action.disabled(selectedRecords) : action.disabled) ?? selectedRecords.length === 0;
								const ButtonComponent =
									action.variant === "danger"
										? DangerButton
										: action.variant === "link"
										? "button"
										: action.variant === "secondary"
										? NeutralButton
										: PrimaryButton;
								return (
									<ButtonComponent
										key={idx}
										onClick={() => onAction(action)}
										disabled={isDisabled}
										className={classNames("text-xs flex items-center gap-2 px-2 py-1", isDisabled && "opacity-50 cursor-not-allowed")}
									>
										{action.icon && <span aria-hidden="true" className="size-4">{typeof action.icon === "string" ? <IconLibrary name={action.icon} /> : action.icon}</span>}
										{action.label}
									</ButtonComponent>
								);
							})}
						</>
					)}
				</div>
			</div>

			{!condensed && (
				<div className=" text-text-600 dark:text-gray-400">
					{tr("datatable.displaying", "Displaying")} {displayStart} {tr("datatable.to", "to")} {displayEnd} {tr("datatable.of", "of")} {totalRecords} {totalRecords !== 1 ? tr("datatable.items", "items") : tr("datatable.item", "item")}
				</div>
			)}
		</div>
	);
};

export default DataTableFooterView;
