import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { XMarkIcon as XMarkIconSmall, PlusIcon } from "@heroicons/react/20/solid";
import { useLaravelReactI18n } from "laravel-react-i18n";
import modelAPI from "@/api/modelAPI";

import PrimaryButton from "@/Components/PrimaryButton";
import NeutralButton from "@/Components/NeutralButton";
import DangerButton from "@/Components/DangerButton";
import InputText from "@/Components/InputText";
import Checkbox from "@/Components/Checkbox";

type FilterType = "text" | "select" | "number" | "date" | "boolean" | "model";

interface FilterOption {
	label: string;
	value: any;
}

interface FilterConfig {
	type: FilterType;
	options?: FilterOption[];
	multiple?: boolean;
	placeholder?: string;
	model?: string;
	labelField?: string;
	valueField?: string;
	with?: string[];
	filter?: Record<string, any> | (() => Record<string, any>);
	min?: string | number;
	max?: string | number;
	step?: string | number;
}

interface Column {
	label?: string;
	field: string;
	editor?: "text" | "number" | "select" | any;
	editor_properties?: Record<string, any>;
	filter?: boolean | FilterType | FilterConfig;
}

interface DataTableFilterProps {
	columns: Column[];
	records: any[];
	activeFilters: { [field: string]: any };
	onApplyFilter: (field: string, value: any, matchMode?: string) => void;
	onClearFilter: (field: string) => void;
	onClearAllFilters: () => void;
	isVisible: boolean;
	onToggle: () => void;
}

const FILTER_TYPES: FilterType[] = ["text", "select", "number", "date", "boolean", "model"];

const formatDate = (dateString?: string): string => {
	if (!dateString) return "";
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return String(dateString);
	return date
		.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		})
		.replace(/\//g, "-");
};

const normalizeFilterConfig = (column: Column): FilterConfig | null => {
	const filter = column.filter;
	if (filter === false || filter === null || filter === undefined) return null;
	const editorCfg = typeof column.editor === "object" && column.editor ? (column.editor as Record<string, any>) : null;
	const editorLegacyCfg = column.editor_properties ?? {};

	if (typeof filter === "object" && filter.type && FILTER_TYPES.includes(filter.type)) {
		const cfg = filter as FilterConfig;
		return {
			...cfg,
			multiple:
				cfg.type === "select" || cfg.type === "model" ? cfg.multiple !== false : cfg.multiple,
		};
	}

	if (typeof filter === "string" && FILTER_TYPES.includes(filter as FilterType)) {
		return {
			type: filter as FilterType,
			multiple: filter === "select" || filter === "model",
		};
	}

	// Auto-map model editors to model filter for legacy `filter: true`.
	if (filter === true && editorCfg?.type === "model" && typeof editorCfg.model === "string") {
		return {
			type: "model",
			model: editorCfg.model,
			labelField: editorCfg.labelField ?? "name",
			valueField: editorCfg.valueField ?? "id",
			with: editorCfg.with ?? [],
			multiple: true,
		};
	}
	if (filter === true && column.editor === "model" && typeof editorLegacyCfg.model === "string") {
		return {
			type: "model",
			model: editorLegacyCfg.model,
			labelField: editorLegacyCfg.labelField ?? "name",
			valueField: editorLegacyCfg.valueField ?? "id",
			with: editorLegacyCfg.with ?? [],
			multiple: true,
		};
	}

	// Backward compatibility for legacy `filter: true`.
	return { type: "text" };
};

const getSelectOptions = (column: Column, config: FilterConfig, records: any[]): FilterOption[] => {
	if (Array.isArray(config.options) && config.options.length > 0) {
		return config.options;
	}

	const editorOptions = column.editor_properties?.options;
	if (Array.isArray(editorOptions) && editorOptions.length > 0) {
		return editorOptions.map((opt: any) => ({
			label: String(opt?.label ?? opt?.value ?? ""),
			value: opt?.value ?? opt,
		}));
	}

	const uniqueValues = new Set<any>();
	records.forEach((row) => {
		if (row?.[column.field] !== null && row?.[column.field] !== undefined && row?.[column.field] !== "") {
			uniqueValues.add(row[column.field]);
		}
	});

	return Array.from(uniqueValues).map((value) => ({
		label: String(value),
		value,
	}));
};

const DataTableFilter: React.FC<DataTableFilterProps> = ({
	columns,
	records,
	activeFilters,
	onApplyFilter,
	onClearFilter,
	onClearAllFilters,
	isVisible,
	onToggle,
}) => {
	const { t } = useLaravelReactI18n();
	const tr = (key: string, fallback: string) => {
		const translated = t(key);
		return translated === key ? fallback : translated;
	};

	const [showFieldSelector, setShowFieldSelector] = useState(false);
	const [selectedField, setSelectedField] = useState<string | null>(null);

	const [textValue, setTextValue] = useState("");
	const [selectValues, setSelectValues] = useState<any[]>([]);
	const [rangeMode, setRangeMode] = useState<"exact" | "range">("exact");
	const [exactValue, setExactValue] = useState("");
	const [rangeStart, setRangeStart] = useState("");
	const [rangeEnd, setRangeEnd] = useState("");
	const [modelQuery, setModelQuery] = useState("");
	const [modelValues, setModelValues] = useState<any[]>([]);
	const [modelOptions, setModelOptions] = useState<any[]>([]);
	const [modelLoading, setModelLoading] = useState(false);

	const filterableColumns = useMemo(
		() => columns.filter((col) => normalizeFilterConfig(col) !== null),
		[columns]
	);
	const hasActiveFilters = Object.keys(activeFilters).length > 0;
	const availableFields = filterableColumns.filter((col) => !activeFilters[col.field]);

	const selectedColumn = selectedField
		? filterableColumns.find((col) => col.field === selectedField) ?? null
		: null;
	const selectedConfig = selectedColumn ? normalizeFilterConfig(selectedColumn) : null;

	const selectedOptions =
		selectedColumn && selectedConfig?.type === "select"
			? getSelectOptions(selectedColumn, selectedConfig, records)
			: [];
	const selectedModelConfig = selectedConfig?.type === "model" ? selectedConfig : null;
	const selectedModelName = selectedModelConfig?.model ?? null;
	const selectedModelLabelField = selectedModelConfig?.labelField ?? "name";
	const selectedModelValueField = selectedModelConfig?.valueField ?? "id";
	const selectedModelWith = selectedModelConfig?.with ?? [];
	const selectedModelWithKey = selectedModelWith.join(",");
	const selectedModelFilter = selectedModelConfig?.filter;
	const selectedOptionValueMap = useMemo(
		() => new Map(selectedOptions.map((option) => [String(option.value), option.value])),
		[selectedOptions]
	);
	const selectedModelValueSet = useMemo(
		() => new Set(modelValues.map((value) => String(value))),
		[modelValues]
	);

	useEffect(() => {
		if (!selectedField || !selectedModelName) {
			setModelOptions([]);
			setModelLoading(false);
			return;
		}

		let resolvedFilter: Record<string, any> = {};
		if (typeof selectedModelFilter === "function") {
			try {
				resolvedFilter = selectedModelFilter() ?? {};
			} catch {
				resolvedFilter = {};
			}
		} else if (selectedModelFilter) {
			resolvedFilter = selectedModelFilter;
		}
		let aborted = false;

		setModelLoading(true);
		modelAPI(selectedModelName as any)
			.search({
				search: modelQuery,
				order: [[selectedModelLabelField, 1]],
				filter: resolvedFilter,
				with: selectedModelWith,
				limit: 50,
			})
			.then((res) => {
				if (!aborted) {
					setModelOptions(res.data ?? []);
				}
			})
			.catch(() => {
				if (!aborted) {
					setModelOptions([]);
				}
			})
			.finally(() => {
				if (!aborted) {
					setModelLoading(false);
				}
			});

		return () => {
			aborted = true;
		};
	}, [
		selectedField,
		selectedModelName,
		selectedModelLabelField,
		selectedModelFilter,
		selectedModelWithKey,
		modelQuery,
	]);

	const resetDraftState = () => {
		setTextValue("");
		setSelectValues([]);
		setRangeMode("exact");
		setExactValue("");
		setRangeStart("");
		setRangeEnd("");
		setModelQuery("");
		setModelValues([]);
		setModelOptions([]);
		setModelLoading(false);
	};

	const clearSelectedField = () => {
		setSelectedField(null);
		resetDraftState();
	};

	const startEditingFilter = (field: string) => {
		const column = filterableColumns.find((col) => col.field === field);
		if (!column) return;
		const config = normalizeFilterConfig(column);
		if (!config) return;

		const existing = activeFilters[field];
		const existingValue = existing?.value;
		const existingMode = String(existing?.matchMode ?? "");

		setSelectedField(field);
		setShowFieldSelector(false);
		resetDraftState();

		if (!existing) return;

		if (config.type === "text") {
			setTextValue(existingValue?.toString?.() ?? "");
			return;
		}

		if (config.type === "select") {
			if (Array.isArray(existingValue)) {
				setSelectValues(existingValue);
			} else if (existingValue !== null && existingValue !== undefined && existingValue !== "") {
				setSelectValues([existingValue]);
			}
			return;
		}

		if (config.type === "model") {
			if (Array.isArray(existingValue)) {
				setModelValues(existingValue);
			} else if (existingValue !== null && existingValue !== undefined && existingValue !== "") {
				setModelValues([existingValue]);
			}
			return;
		}

		if (config.type === "number" || config.type === "date") {
			if (existingMode === "BETWEEN" && Array.isArray(existingValue)) {
				setRangeMode("range");
				setRangeStart(existingValue[0]?.toString?.() ?? "");
				setRangeEnd(existingValue[1]?.toString?.() ?? "");
				return;
			}
			if (existingMode === ">=") {
				setRangeMode("range");
				setRangeStart(existingValue?.toString?.() ?? "");
				return;
			}
			if (existingMode === "<=") {
				setRangeMode("range");
				setRangeEnd(existingValue?.toString?.() ?? "");
				return;
			}
			setRangeMode("exact");
			setExactValue(existingValue?.toString?.() ?? "");
		}
	};

	const handleFieldSelect = (field: string) => {
		setSelectedField(field);
		setShowFieldSelector(false);
		resetDraftState();
	};

	const applyCurrentFilter = () => {
		if (!selectedField || !selectedConfig) return;

		if (selectedConfig.type === "boolean") {
			return;
		}

		if (selectedConfig.type === "text") {
			if (!textValue.trim()) return;
			onApplyFilter(selectedField, textValue, "CONTAINS");
			clearSelectedField();
			return;
		}

		if (selectedConfig.type === "select") {
			if (selectValues.length === 0) return;
			const multiple = selectedConfig.multiple !== false;
			if (multiple) {
				onApplyFilter(selectedField, selectValues, "IN");
			} else {
				onApplyFilter(selectedField, selectValues[0], "=");
			}
			clearSelectedField();
			return;
		}

		if (selectedConfig.type === "model") {
			if (modelValues.length === 0) return;
			const multiple = selectedConfig.multiple !== false;
			if (multiple) {
				onApplyFilter(selectedField, modelValues, "IN");
			} else {
				onApplyFilter(selectedField, modelValues[0], "=");
			}
			clearSelectedField();
			return;
		}

		if (selectedConfig.type === "number" || selectedConfig.type === "date") {
			if (rangeMode === "exact") {
				if (!exactValue) return;
				onApplyFilter(selectedField, exactValue, "=");
				clearSelectedField();
				return;
			}

			if (rangeStart && rangeEnd) {
				onApplyFilter(selectedField, [rangeStart, rangeEnd], "BETWEEN");
				clearSelectedField();
				return;
			}
			if (rangeStart) {
				onApplyFilter(selectedField, rangeStart, ">=");
				clearSelectedField();
				return;
			}
			if (rangeEnd) {
				onApplyFilter(selectedField, rangeEnd, "<=");
				clearSelectedField();
			}
		}
	};

	const isApplyDisabled = (() => {
		if (!selectedConfig) return true;
		if (selectedConfig.type === "boolean") return true;
		if (selectedConfig.type === "text") return !textValue.trim();
		if (selectedConfig.type === "select") return selectValues.length === 0;
		if (selectedConfig.type === "model") return modelValues.length === 0;
		if (rangeMode === "exact") return !exactValue;
		return !rangeStart && !rangeEnd;
	})();

	if (!isVisible) return null;

	return (
		<div className="bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-2">
			<div className="flex items-center gap-2 flex-wrap">
				{Object.entries(activeFilters).map(([field, filter]) => {
					const column = filterableColumns.find((col) => col.field === field);
					const label = column?.label || field;
					const filterType = column ? normalizeFilterConfig(column)?.type : undefined;
					const value = filter?.value;
					const mode = String(filter?.matchMode ?? "");

					let displayValue = "";
					if (Array.isArray(value)) {
						if (mode === "BETWEEN" && value.length === 2) {
							displayValue =
								filterType === "date"
									? `${formatDate(value[0])} ${tr("datatable.to", "to")} ${formatDate(value[1])}`
									: `${value[0]} ${tr("datatable.to", "to")} ${value[1]}`;
						} else {
							displayValue = `${value.length} ${tr("datatable.selected", "selected")}`;
						}
					} else if (mode === ">=" || mode === "<=") {
						displayValue = `${mode} ${value}`;
					} else {
						displayValue = value?.toString() ?? "";
					}

						return (
							<div
								key={field}
								onClick={() => startEditingFilter(field)}
								className="inline-flex items-center gap-1 px-1.5 py-1 bg-background-600 dark:bg-gray-800 text-text-700 dark:text-gray-300 text-xs rounded-md border border-gray-200 dark:border-gray-600 shadow-sm cursor-pointer hover:bg-background-600 dark:hover:bg-gray-700"
							>
								<span className="font-medium text-[0.65rem] uppercase tracking-wide text-text-600 dark:text-gray-400 mr-1">
									{label}
								</span>
								<span className="font-normal text-[0.7rem]">{displayValue}</span>
								<NeutralButton
									onClick={(event) => {
										event.stopPropagation();
										onClearFilter(field);
									}}
									className="!p-0 !bg-transparent hover:!bg-background-700 dark:hover:!bg-gray-700 ml-1"
								>
									<XMarkIconSmall className="h-3 w-3" />
								</NeutralButton>
						</div>
					);
				})}

				{!selectedField && !showFieldSelector && (
					<NeutralButton
						onClick={() => setShowFieldSelector(true)}
						disabled={availableFields.length === 0}
						size="small"
						className={classNames(
							"inline-flex items-center gap-1 h-7 px-2",
							availableFields.length === 0
								? "opacity-50 cursor-not-allowed"
								: "hover:bg-background-600 dark:hover:bg-gray-700"
						)}
					>
						<PlusIcon aria-hidden="true" className="size-3.5" />
						<span>{tr("datatable.add_filter", "Add Filter")}</span>
					</NeutralButton>
				)}

				{!selectedField && showFieldSelector && (
					<div className="inline-flex items-center gap-1">
						<select
							onChange={(e: ChangeEvent<HTMLSelectElement>) => {
								if (e.target.value) handleFieldSelect(e.target.value);
							}}
							className="text-xs px-2 py-1 min-w-[120px] border-gray-300 rounded-md"
							autoFocus
						>
							<option value="">{tr("datatable.choose_field", "Choose field...")}</option>
							{availableFields.map((column) => (
								<option key={column.field} value={column.field}>
									{column.label || column.field}
								</option>
							))}
						</select>
						<NeutralButton onClick={() => setShowFieldSelector(false)} className="!px-1.5 !py-1 text-xs">
							{tr("datatable.cancel", "Cancel")}
						</NeutralButton>
					</div>
				)}

				{selectedField && selectedColumn && selectedConfig && (
					<div className="inline-flex items-center gap-1">
						<span className="text-xs font-medium text-text-700 dark:text-gray-300 mr-1">
							{selectedColumn.label || selectedColumn.field}:
						</span>

						{selectedConfig.type === "boolean" && (
							<>
								<PrimaryButton
									onClick={() => {
										onApplyFilter(selectedField, true, "=");
										clearSelectedField();
									}}
									className="!px-2 !py-1 text-xs !bg-green-500 hover:!bg-green-600"
								>
									{tr("datatable.yes", "Yes")}
								</PrimaryButton>
								<DangerButton
									onClick={() => {
										onApplyFilter(selectedField, false, "=");
										clearSelectedField();
									}}
									className="!px-2 !py-1 text-xs"
								>
									{tr("datatable.no", "No")}
								</DangerButton>
							</>
						)}

						{selectedConfig.type === "text" && (
							<>
								<InputText
									type="text"
									value={textValue}
									onChange={(e: ChangeEvent<HTMLInputElement>) => setTextValue(e.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											applyCurrentFilter();
										}
									}}
									placeholder={selectedConfig.placeholder ?? `${selectedColumn.label || selectedColumn.field}...`}
									className="!px-2 !py-1 text-xs min-w-[180px]"
									autoFocus
								/>
								<PrimaryButton
									onClick={applyCurrentFilter}
									className="!px-2 !py-1 text-xs"
									disabled={isApplyDisabled}
								>
									{tr("datatable.apply", "Apply")}
								</PrimaryButton>
							</>
						)}

						{selectedConfig.type === "select" && (
							<>
								<select
									multiple={selectedConfig.multiple !== false}
									value={selectValues.map(String)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											applyCurrentFilter();
										}
									}}
									onChange={(e: ChangeEvent<HTMLSelectElement>) => {
										const values = Array.from(e.target.selectedOptions).map(
											(opt) => selectedOptionValueMap.get(opt.value) ?? opt.value
										);
										if (selectedConfig.multiple === false) {
											setSelectValues(values.slice(0, 1));
										} else {
											setSelectValues(values);
										}
									}}
									className="text-xs px-2 py-1 min-w-[180px] border-gray-300 rounded-md"
									size={Math.min(Math.max(selectedOptions.length, 3), 8)}
								>
									{selectedOptions.map((option, idx) => (
										<option key={idx} value={String(option.value)}>
											{option.label}
										</option>
									))}
								</select>
								<PrimaryButton
									onClick={applyCurrentFilter}
									className="!px-2 !py-1 text-xs"
									disabled={isApplyDisabled}
								>
									{tr("datatable.apply", "Apply")}
								</PrimaryButton>
							</>
						)}

						{selectedConfig.type === "model" && (
							<div className="inline-flex items-center gap-2">
								<InputText
									type="text"
									value={modelQuery}
									onChange={(e: ChangeEvent<HTMLInputElement>) => setModelQuery(e.target.value)}
									placeholder={tr("datatable.search_placeholder", "Search...")}
									className="!px-2 !py-1 text-xs min-w-[160px]"
									autoFocus
								/>

								<div className="max-h-32 min-w-[240px] overflow-auto rounded-md border border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-800 px-2 py-1">
									{modelLoading ? (
										<div className="text-xs text-text-500 py-1">{tr("datatable.loading", "Loading...")}</div>
									) : modelOptions.length === 0 ? (
										<div className="text-xs text-text-500 py-1">{tr("datatable.no_results", "No results")}</div>
									) : (
										modelOptions.map((option, idx) => {
											const optionValue = option?.[selectedModelValueField] ?? option?.id ?? option;
											const optionLabel = String(
												option?.[selectedModelLabelField] ?? option?.name ?? optionValue
											);
											const isChecked = selectedModelValueSet.has(String(optionValue));
											return (
												<label
													key={`${String(optionValue)}-${idx}`}
													className="flex items-center gap-2 py-0.5 text-xs text-text-700 dark:text-gray-200 cursor-pointer"
												>
													<Checkbox
														checked={isChecked}
														onChange={(e: ChangeEvent<HTMLInputElement>) => {
															const checked = e.target.checked;
															setModelValues((prev) => {
																const exists = prev.some((val) => String(val) === String(optionValue));
																if (selectedConfig.multiple === false) {
																	return checked ? [optionValue] : [];
																}
																if (checked && !exists) return [...prev, optionValue];
																if (!checked && exists) {
																	return prev.filter((val) => String(val) !== String(optionValue));
																}
																return prev;
															});
														}}
													/>
													<span className="truncate">{optionLabel}</span>
												</label>
											);
										})
									)}
								</div>

								<PrimaryButton
									onClick={applyCurrentFilter}
									className="!px-2 !py-1 text-xs"
									disabled={isApplyDisabled}
								>
									{tr("datatable.apply", "Apply")}
								</PrimaryButton>
							</div>
						)}

						{(selectedConfig.type === "number" || selectedConfig.type === "date") && (
							<>
								<select
									value={rangeMode}
									onChange={(e: ChangeEvent<HTMLSelectElement>) =>
										setRangeMode(e.target.value as "exact" | "range")
									}
									className="text-xs px-2 py-1 border-gray-300 rounded-md"
								>
									<option value="exact">{tr("datatable.exact", "Exact")}</option>
									<option value="range">{tr("datatable.range", "Range")}</option>
								</select>

								{rangeMode === "exact" ? (
									<InputText
										type={selectedConfig.type === "date" ? "date" : "number"}
										value={exactValue}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setExactValue(e.target.value)}
										onKeyDown={(event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												applyCurrentFilter();
											}
										}}
										min={selectedConfig.min as any}
										max={selectedConfig.max as any}
										step={selectedConfig.step as any}
										className="!px-2 !py-1 text-xs min-w-[120px]"
										autoFocus
									/>
								) : (
									<div className="flex items-center gap-1">
										<InputText
											type={selectedConfig.type === "date" ? "date" : "number"}
											value={rangeStart}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setRangeStart(e.target.value)}
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													event.preventDefault();
													applyCurrentFilter();
												}
											}}
											min={selectedConfig.min as any}
											max={selectedConfig.max as any}
											step={selectedConfig.step as any}
											placeholder={tr("datatable.from", "From")}
											className="!px-2 !py-1 text-xs min-w-[120px]"
											autoFocus
										/>
										<span className="text-xs text-text-500">{tr("datatable.to", "to")}</span>
										<InputText
											type={selectedConfig.type === "date" ? "date" : "number"}
											value={rangeEnd}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setRangeEnd(e.target.value)}
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													event.preventDefault();
													applyCurrentFilter();
												}
											}}
											min={selectedConfig.min as any}
											max={selectedConfig.max as any}
											step={selectedConfig.step as any}
											placeholder={tr("datatable.to", "to")}
											className="!px-2 !py-1 text-xs min-w-[120px]"
										/>
									</div>
								)}

								<PrimaryButton
									onClick={applyCurrentFilter}
									className="!px-2 !py-1 text-xs"
									disabled={isApplyDisabled}
								>
									{tr("datatable.apply", "Apply")}
								</PrimaryButton>
							</>
						)}

						<NeutralButton onClick={clearSelectedField} className="!px-2 !py-1 text-xs">
							{tr("datatable.cancel", "Cancel")}
						</NeutralButton>
					</div>
				)}

				<div className="ml-auto flex items-center gap-1">
					{hasActiveFilters && (
						<NeutralButton
							onClick={onClearAllFilters}
							className="!px-1.5 !py-1 !text-[11px] !leading-none text-red-500 dark:text-red-400 border-red-500 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
						>
							{tr("datatable.clear_all", "Clear All")}
						</NeutralButton>
					)}
					<NeutralButton
						onClick={onToggle}
						className="!p-1 !bg-transparent hover:!bg-background-600 dark:hover:!bg-gray-700"
					>
						<XMarkIconSmall className="h-3 w-3" />
					</NeutralButton>
				</div>
			</div>
		</div>
	);
};

export default DataTableFilter;
