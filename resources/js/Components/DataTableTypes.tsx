import type React from "react";
import type { DataTableCustomEditorProps, EditorConfig } from "@/Components/DataTableEditor";

export interface DataTableFilterConfig {
	type: "text" | "select" | "number" | "date" | "boolean" | "model";
	options?: Array<{ label: string; value: any }>;
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

export interface Column {
	label?: string;
	field: string;
	editor?:
		| string
		| EditorConfig
		| ((props: DataTableCustomEditorProps) => React.ReactNode)
		| undefined;
	/** @deprecated Nicht mehr verwenden. */
	editor_properties?: Record<string, any>;
	sortable?: boolean | string;
	filter?: boolean | DataTableFilterConfig;
	frozen?: boolean;
	width?: string;
	align?: string;
	headerAlign?: string;
	formatter?: (row: Row, field: string) => JSX.Element | string | Element;
}

export interface Row {
	[key: string]: any;
}

export interface DataTableAction {
	label: string;
	icon?: React.ReactNode | string;
	onClick: (selectedRecords: Row[], reload: () => void) => void;
	variant?: "primary" | "secondary" | "danger" | "link";
	disabled?: boolean | ((selectedRecords: Row[]) => boolean);
}

export interface SearchState {
	first: number;
	rows: number;
	page: number;
	search?: string;
	init?: string;
	filters: Array<{ field: string; matchMode: string; value: any }>;
	multiSortMeta: Array<[string, number]>;
	with: string[];
}
