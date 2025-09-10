import React, { useState, ChangeEvent, KeyboardEvent } from "react";
import classNames from "classnames";
import {
	XMarkIcon as XMarkIconSmall,
	PlusIcon,
} from "@heroicons/react/20/solid";

import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";
import DangerButton from "./DangerButton";
import InputText from "./InputText";

const formatDate = (dateString?: string): string => {
	if (!dateString) return "";

	const date = new Date(dateString);
	return date
		.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		})
		.replace(/\//g, "-");
};

const formatDateRange = (value: any): string => {
	if (!value || typeof value !== "object") return "";

	const { start, end } = value;

	if (start && end) {
		return `${formatDate(start)} to ${formatDate(end)}`;
	}

	return start ? formatDate(start) : formatDate(end);
};

interface FilterOption {
	label: string;
	value: any;
	matchMode?: string;
}

interface FilterConfig {
	type:
		| "text"
		| "select"
		| "multiselect"
		| "number"
		| "date"
		| "boolean"
		| "dateRange";
	options?: FilterOption[];
	placeholder?: string;
	matchModes?: string[];
	defaultMatchMode?: string;
}

interface Column {
	label?: string;
	field: string;
	editor?: "text" | "number" | "select" | any;
	editor_properties?: Record<string, any>;
	filter?: boolean | string | FilterConfig;
}

interface DateRangeFilter {
	start?: string;
	end?: string;
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

class FilterConfigService {
	static getFilterConfig(column: Column): FilterConfig | null {
		if (!column.filter) return null;

		if (typeof column.filter === "object") {
			return column.filter as FilterConfig;
		}

		const fieldName = column.field.toLowerCase();
		const editorType = column.editor;

		const isDateField =
			editorType === "datetime" ||
			editorType === "date" ||
			fieldName.includes("_at") ||
			fieldName.includes("_date") ||
			fieldName.endsWith("date");

		if (
			!isDateField &&
			[
				"name",
				"email",
				"mail",
				"title",
				"description",
				"content",
				"text",
				"search",
			].some((type) => fieldName.includes(type) && !fieldName.includes("_at"))
		) {
			return null;
		}

		if (
			[
				"datetime",
				"date",
				"_at",
				"_date",
				"created",
				"updated",
				"deleted",
				"verified_at",
				"published_at",
				"activated_at",
			].some(
				(type) =>
					editorType === type ||
					fieldName.includes(type) ||
					fieldName.endsWith("date")
			)
		) {
			return { type: "date", defaultMatchMode: "=" };
		}

		if (
			[
				"checkbox",
				"is_",
				"has_",
				"can_",
				"verified",
				"active",
				"enabled",
				"published",
			].some(
				(type) =>
					editorType === type ||
					(fieldName.includes(type) &&
						!fieldName.includes("_at") &&
						!fieldName.includes("_date"))
			)
		) {
			return { type: "boolean", defaultMatchMode: "=" };
		}

		if (
			[
				"number",
				"_id",
				"count",
				"amount",
				"price",
				"total",
				"quantity",
				"age",
				"weight",
				"height",
			].some((type) => editorType === type || fieldName.includes(type))
		) {
			return { type: "number", defaultMatchMode: "=" };
		}

		if (editorType === "select" && column.editor_properties?.options) {
			return {
				type: "select",
				options: column.editor_properties.options,
				defaultMatchMode: "=",
			};
		}

		return { type: "text", defaultMatchMode: "contains" };
	}

	static getInputType(column: Column, config: FilterConfig | null): string {
		if (!config) return "text";

		const fieldName = column.field.toLowerCase();

		switch (config.type) {
			case "number":
				return "number";
			case "date":
				return fieldName.includes("_at") || column.editor === "datetime"
					? "datetime-local"
					: "date";
			case "boolean":
				return "text";
			default:
				if (fieldName.includes("email") || fieldName.includes("mail"))
					return "email";
				if (
					fieldName.includes("url") ||
					fieldName.includes("website") ||
					fieldName.includes("link")
				)
					return "url";
				if (fieldName.includes("phone") || fieldName.includes("tel"))
					return "tel";
				if (fieldName.includes("password")) return "password";
				return "text";
		}
	}

	static getPlaceholder(column: Column): string {
		const fieldName = column.field.toLowerCase();
		const label = column.label || column.field;

		if (fieldName.includes("email") || fieldName.includes("mail"))
			return `Search ${label}...`;
		if (fieldName.includes("name"))
			return `Search by ${label.toLowerCase()}...`;
		if (fieldName.includes("_id") || fieldName.includes("id"))
			return `Enter ${label}...`;
		if (
			fieldName.includes("amount") ||
			fieldName.includes("price") ||
			fieldName.includes("cost")
		) {
			return `Enter ${label.toLowerCase()}...`;
		}

		return `Filter ${label.toLowerCase()}...`;
	}

	static getDefaultMatchMode(
		column: Column,
		config: FilterConfig | null
	): string {
		if (!config) return "contains";
		if (config.defaultMatchMode) return config.defaultMatchMode;

		const fieldName = column.field.toLowerCase();

		if (
			fieldName.includes("_id") ||
			fieldName.includes("code") ||
			fieldName.includes("number") ||
			fieldName.includes("status") ||
			fieldName.includes("type") ||
			fieldName.includes("category")
		) {
			return "=";
		}

		return config.type === "text" ? "contains" : "=";
	}
}

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
	const [showFieldSelector, setShowFieldSelector] = useState(false);
	const [selectedField, setSelectedField] = useState<string | null>(null);
	const [inputValue, setInputValue] = useState<string>("");
	const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({});
	const [tempDateRangeFilter, setTempDateRangeFilter] =
		useState<DateRangeFilter>({});

	const filterableColumns = columns.filter(
		(col) => col.filter && FilterConfigService.getFilterConfig(col) !== null
	);
	const hasActiveFilters = Object.keys(activeFilters).length > 0;

	const availableFields = filterableColumns.filter(
		(col) => !activeFilters[col.field]
	);

	const handleFieldSelect = (field: string) => {
		setSelectedField(field);
		setShowFieldSelector(false);
		setInputValue("");
		setTempDateRangeFilter({});
	};

	const handleFilterApply = (value: any, matchMode?: string) => {
		if (selectedField) {
			onApplyFilter(selectedField, value, matchMode);
			setSelectedField(null);
		}
	};

	const handleDateRangeFilter = () => {
		if (
			selectedField &&
			(tempDateRangeFilter.start || tempDateRangeFilter.end)
		) {
			const filterValue: DateRangeFilter = {};
			if (tempDateRangeFilter.start)
				filterValue.start = tempDateRangeFilter.start;
			if (tempDateRangeFilter.end) filterValue.end = tempDateRangeFilter.end;

			onApplyFilter(selectedField, filterValue, "dateRange");
			setSelectedField(null);
			setDateRangeFilter(filterValue);
			setTempDateRangeFilter({});
		}
	};

	const handleCancelDateRangeFilter = () => {
		setSelectedField(null);
		setTempDateRangeFilter({});
	};

	const handleDateRangeChange = (type: "start" | "end", value: string) => {
		const newFilter = { ...tempDateRangeFilter };

		if (
			type === "end" &&
			newFilter.start &&
			new Date(value) < new Date(newFilter.start)
		) {
			newFilter.start = value;
			newFilter.end = undefined;
		} else if (
			type === "start" &&
			newFilter.end &&
			new Date(value) > new Date(newFilter.end)
		) {
			newFilter.end = value;
		}

		newFilter[type] = value;
		setTempDateRangeFilter(newFilter);
	};

	if (!isVisible) return null;

	return (
		<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-2">
			<div className="flex items-center gap-2 flex-wrap">
				{Object.entries(activeFilters).map(([field, filter]) => {
					const column = filterableColumns.find((col) => col.field === field);

					if (
						filter.matchMode === "dateRange" ||
						(filter.matchMode === "BETWEEN" && Array.isArray(filter.value))
					) {
						const displayValue =
							filter.matchMode === "dateRange"
								? formatDateRange(filter.value)
								: `${formatDate(filter.value[0])} to ${formatDate(
										filter.value[1]
								  )}`;

						return (
							<div
								key={field}
								className="inline-flex items-center gap-1 px-1.5 py-1 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-md border border-gray-200 dark:border-gray-600 shadow-sm"
							>
								<span className="font-medium text-[0.65rem] uppercase tracking-wide text-gray-600 dark:text-gray-400 mr-1">
									{column?.label || field}
								</span>
								<span className="font-normal text-[0.7rem]">
									{displayValue}
								</span>
								<SecondaryButton
									onClick={() => onClearFilter(field)}
									className="!p-0 !bg-transparent hover:!bg-gray-200 dark:hover:!bg-gray-700 ml-1"
								>
									<XMarkIconSmall className="h-3 w-3" />
								</SecondaryButton>
							</div>
						);
					}

					const displayValue = Array.isArray(filter.value)
						? `${filter.value.length} selected`
						: filter.value?.toString();

					return (
						<div
							key={field}
							className="inline-flex items-center gap-1 px-1.5 py-1 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-md border border-gray-200 dark:border-gray-600 shadow-sm"
						>
							<span className="font-medium text-[0.65rem] uppercase tracking-wide text-gray-600 dark:text-gray-400 mr-1">
								{column?.label || field}
							</span>
							<span className="font-normal text-[0.7rem]">{displayValue}</span>
							<SecondaryButton
								onClick={() => onClearFilter(field)}
								className="!p-0 !bg-transparent hover:!bg-gray-200 dark:hover:!bg-gray-700 ml-1"
							>
								<XMarkIconSmall className="h-3 w-3" />
							</SecondaryButton>
						</div>
					);
				})}

				{!selectedField && !showFieldSelector && (
					<SecondaryButton
						onClick={() => setShowFieldSelector(true)}
						disabled={availableFields.length === 0}
						className={classNames(
							"flex items-center justify-center gap-2 text-xs px-3 py-2 min-w-[100px] relative",
							availableFields.length === 0
								? "opacity-50 cursor-not-allowed"
								: "hover:bg-gray-50 dark:hover:bg-gray-700"
						)}
					>
						<PlusIcon aria-hidden="true" className="size-4 absolute left-3" />
						<span className="ml-5">Add Filter</span>
					</SecondaryButton>
				)}

				{!selectedField && showFieldSelector && (
					<div className="inline-flex items-center gap-1">
						<select
							onChange={(e: ChangeEvent<HTMLSelectElement>) => {
								if (e.target.value) {
									handleFieldSelect(e.target.value);
								}
							}}
							className="text-xs px-2 py-1 min-w-[120px] border-gray-300 rounded-md"
							autoFocus
						>
							<option value="">Choose field...</option>
							{availableFields.map((column) => (
								<option key={column.field} value={column.field}>
									{column.label || column.field}
								</option>
							))}
						</select>
						<SecondaryButton
							onClick={() => setShowFieldSelector(false)}
							className="!px-1.5 !py-1 text-xs"
						>
							Cancel
						</SecondaryButton>
					</div>
				)}

				{selectedField && (
					<div className="inline-flex items-center gap-1">
						{(() => {
							const column = filterableColumns.find(
								(col) => col.field === selectedField
							);
							if (!column) return null;

							const config = FilterConfigService.getFilterConfig(column);
							if (!config) return null;

							switch (config.type) {
								case "boolean":
									return (
										<>
											<span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-1">
												{column.label || column.field}:
											</span>
											<PrimaryButton
												onClick={() => handleFilterApply(true, "=")}
												className="!px-2 !py-1 text-xs !bg-green-500 hover:!bg-green-600"
											>
												Yes
											</PrimaryButton>
											<DangerButton
												onClick={() => handleFilterApply(false, "=")}
												className="!px-2 !py-1 text-xs"
											>
												No
											</DangerButton>
										</>
									);

								case "select":
									if (config.options) {
										return (
											<>
												<span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-1">
													{column.label || column.field}:
												</span>
												{config.options.map((option, idx) => (
													<PrimaryButton
														key={idx}
														onClick={() => handleFilterApply(option.value, "=")}
														className="!px-2 !py-1 text-xs"
													>
														{option.label}
													</PrimaryButton>
												))}
											</>
										);
									}
									break;

								case "date":
								case "dateRange":
									return (
										<>
											<span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-1">
												{column.label || column.field}:
											</span>
											<div className="flex items-center gap-1">
												<InputText
													type="date"
													value={tempDateRangeFilter.start || ""}
													onChange={(e: ChangeEvent<HTMLInputElement>) =>
														handleDateRangeChange("start", e.target.value)
													}
													placeholder="Start date"
													className="!px-2 !py-1 text-xs min-w-[100px]"
												/>
												<span className="text-xs text-gray-500">to</span>
												<InputText
													type="date"
													value={tempDateRangeFilter.end || ""}
													onChange={(e: ChangeEvent<HTMLInputElement>) =>
														handleDateRangeChange("end", e.target.value)
													}
													placeholder="End date"
													className="!px-2 !py-1 text-xs min-w-[100px]"
												/>
												<PrimaryButton
													onClick={handleDateRangeFilter}
													className="!px-2 !py-1 text-xs"
													disabled={
														!tempDateRangeFilter.start &&
														!tempDateRangeFilter.end
													}
												>
													Apply
												</PrimaryButton>
												<SecondaryButton
													onClick={handleCancelDateRangeFilter}
													className="!px-2 !py-1 text-xs"
												>
													Cancel
												</SecondaryButton>
											</div>
										</>
									);

								default:
									return (
										<>
											<span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-1">
												{column.label || column.field}:
											</span>
											<div className="flex items-center gap-1">
												<InputText
													type={FilterConfigService.getInputType(
														column,
														config
													)}
													placeholder={FilterConfigService.getPlaceholder(
														column
													)}
													value={inputValue}
													onChange={(e: ChangeEvent<HTMLInputElement>) =>
														setInputValue(e.target.value)
													}
													onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
														if (e.key === "Escape") {
															setSelectedField(null);
															setInputValue("");
														}
													}}
													className="!px-2 !py-1 text-xs min-w-[120px]"
													autoFocus
												/>
												<PrimaryButton
													onClick={() => {
														if (inputValue.trim()) {
															handleFilterApply(
																inputValue,
																FilterConfigService.getDefaultMatchMode(
																	column,
																	config
																)
															);
														}
													}}
													className="!px-2 !py-1 text-xs"
													disabled={!inputValue.trim()}
												>
													Apply
												</PrimaryButton>
												<SecondaryButton
													onClick={() => {
														setSelectedField(null);
														setInputValue("");
													}}
													className="!px-2 !py-1 text-xs"
												>
													Cancel
												</SecondaryButton>
											</div>
										</>
									);
							}
						})()}
					</div>
				)}

				<div className="ml-auto flex items-center gap-1">
					{hasActiveFilters && (
						<SecondaryButton
							onClick={onClearAllFilters}
							className="!px-1.5 !py-1 text-[0.6rem] text-red-500 dark:text-red-400 border-red-500 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
						>
							Clear All
						</SecondaryButton>
					)}
					<SecondaryButton
						onClick={onToggle}
						className="!p-1 !bg-transparent hover:!bg-gray-100 dark:hover:!bg-gray-700"
					>
						<XMarkIconSmall className="h-3 w-3" />
					</SecondaryButton>
				</div>
			</div>
		</div>
	);
};

export default DataTableFilter;
