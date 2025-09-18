import { DateTime } from "luxon";

interface Row {
	[key: string]: any;
}

const DataTableFormatter = {
    default: (row: Row, field: string) => {
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

    color: (row: Row, field: string) => {
        if (!row[field]) return "";
        return <>
            <span className="inline-block align-middle w-3 h-3 border border-gray-300 dark:border-gray-700 rounded mr-2" style={{ backgroundColor: row[field] }}></span> {row[field]}
        </>;
        
    },

    datetime: (row: Row, field: string) => {
        if (!row[field]) return "";
        const date = DateTime.fromISO(row[field], { zone: "utc" }).setZone(
            "Europe/Vienna"
        );

        return date.isValid
            ? date.toLocaleString(DateTime.DATETIME_MED)
            : JSON.stringify(row[field]);
    },

};


export { DataTableFormatter };