import DataTableLink from "@/Components/DataTableLink";
import { DataTableFormatter } from "@/Components/DataTableFormatter";

interface Row {
	[key: string]: any;
}

interface LinkOptions {
	format?: (row: Row, field: string) => any;
}

const DataTableDynamicFormatter = {
	link: (linkroute: string | ((row: Row) => string), options?: LinkOptions) => {
		return (row: Row, field: string) => {
			const href =
				typeof linkroute === "function"
					? linkroute(row)
					: route(linkroute as any, [row]);
			const display = options?.format
				? options.format(row, field)
				: DataTableFormatter.default(row, field);
			const title = typeof display === "string" ? display : DataTableFormatter.default(row, field);

			return <DataTableLink href={href} title={title}>{display || "View"}</DataTableLink>;
		};
	},
	model: (item:string) => {
		return (row: Row, field: string) => {
			return DataTableFormatter.default(row, item);
		};
	}
};

export { DataTableDynamicFormatter };
