import { DateTime } from "luxon";
import { parse } from "path";

export function parseDateTime(dateTimeString: string): DateTime {
    return DateTime.fromISO(dateTimeString, { zone: "utc" }).setZone("Europe/Vienna");
}

const DateTimeHelper = {
    parseDateTime,
    isPast: function(ref:string) {
        if (!ref) return false;
        
        return parseDateTime(ref).toUnixInteger() < (Date.now() / 1000);
    }
}

export default  DateTimeHelper;