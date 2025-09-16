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


export { DataTableFormatter };