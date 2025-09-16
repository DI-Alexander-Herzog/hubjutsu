import DataTableLink from "@/Components/DataTableLink";

interface Row {
	[key: string]: any;
}

const DataTableDynamicFormatter = {
	link: (linkroute: string | ((row: Row) => string)) => {
		return (row: Row, field: string) => {
			const href =
				typeof linkroute === "function"
					? linkroute(row)
					: route(linkroute as any, [row]);
			return <DataTableLink href={href}>{row[field] || "View"}</DataTableLink>;
		};
	},
};

export { DataTableDynamicFormatter };