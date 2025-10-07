import { DateTime } from "luxon";
import { useRef, useState } from "react";

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

    boolean: (row: Row, field: string) => {
        if (row[field] === undefined || row[field] === null) return "";

        const checked = row[field];
        return <label className={"inline-flex items-center cursor-pointer align-middle"}>
            <input type="checkbox" value="1" className="sr-only peer" checked={checked} />
            <div className={
                " relative w-9 h-5 bg-gray-200 " +
                "rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white " + 
                "after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full " +
                "after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 dark:peer-checked:bg-primary-600 "
            }></div>
        </label>;
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

    base64image: (row: Row, field: string) => {
        if (!row[field]) return "";

        return <img
            onClick={e => {
                if (e.currentTarget.classList.contains('w-4')) {
                    e.currentTarget.classList.remove('w-4', 'h-4');
                    e.currentTarget.classList.add('w-24', 'h-24');
                } else {
                    e.currentTarget.classList.add('w-4', 'h-4');
                    e.currentTarget.classList.remove('w-24', 'h-24');
                }
            }}
            src={`data:image/png;base64,${row[field]}`}
            alt=""
            className="object-contain w-4 h-4 cursor-pointer"
        />
    },

};


export { DataTableFormatter };