import { assert } from "tsafe";
import { z } from "zod";
import { log } from "./log.js";

export function companyFromEnv(): string {
    const company = process.env["WOFFU_COMPANY"];
    assert(company, "WOFFU_COMPANY is not set");
    return company;
}

export class Credentials {
    constructor(
        public email: string,
        public password: string
    ) {}
}

export function credentialsFromEnv(): Credentials {
    const email = process.env["WOFFU_EMAIL"];
    assert(email, "WOFFU_EMAIL is not set");

    const password = process.env["WOFFU_PASSWORD"];
    assert(password, "WOFFU_PASSWORD is not set");

    return new Credentials(email, password);
}

const UA = {
    "User-Agent": navigator.userAgent
};

export async function login(cred: Credentials, company: string): Promise<Auth> {
    const params = new URLSearchParams({
        grant_type: "password",
        username: cred.email,
        password: cred.password
    });

    const response = await fetch(`https://${company}.woffu.com/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...UA
        },
        body: params
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.access_token;
    assert(typeof token === "string", "access_token is not a string");
    return {
        token,
        company,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
}

export interface Auth {
    token: string;
    headers: Record<string, string>;
    company: string;
}

function parseWoffuDate(dateString: string): Date {
    const stripped = dateString.split("T")[0];
    assert(stripped);
    return new Date(stripped);
}

export const RequestsResponse = z.object({
    // Format for dates: 2025-09-15T00:00:00.000
    // String the hours as I don't want to deal with local time
    StartDate: z.iso.datetime({ local: true }).transform(parseWoffuDate),
    EndDate: z.iso.datetime({ local: true }).transform(parseWoffuDate),

    IsFullDay: z.boolean(),
    IsPresence: z.boolean()
});

async function fetchWoffuRequests(auth: Auth) {
    const response = await fetch(
        `https://${auth.company}.woffu.com/api/users/requests/list?pageIndex=0&pageSize=10&statusType=null`,
        {
            method: "GET",
            headers: {
                ...auth.headers,
                ...UA
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = z.array(RequestsResponse).safeParse(data);
    if (parsed.error) {
        const pretty = z.prettifyError(parsed.error);
        console.error("Response:", data);
        console.error("Failed to parse response:", pretty);
        throw new Error("Invalid response format");
    }

    return parsed.data;
}

const HolidaysResponse = z.object({
    Date: z.iso.datetime({ local: true }).transform(parseWoffuDate),
    Name: z.string()
});

export async function fetchWoffuHolidays(auth: Auth) {
    const response = await fetch(
        `https://${auth.company}.woffu.com/api/users/calendar-events/next`,
        {
            method: "GET",
            headers: {
                ...auth.headers,
                ...UA
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = z.array(HolidaysResponse).safeParse(data);
    if (parsed.error) {
        const pretty = z.prettifyError(parsed.error);
        console.error("Response:", data);
        console.error("Failed to parse response:", pretty);
        throw new Error("Invalid response format");
    }

    return parsed.data;
}

export function _isDayOff(
    date: Date,
    holidays: z.infer<typeof HolidaysResponse>[],
    requests: z.infer<typeof RequestsResponse>[]
): boolean {
    // Weekend check
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) {
        return true;
    }

    // Holiday check - use some() for early return
    if (holidays.some((holiday) => isSameDay(date, holiday.Date))) {
        return true;
    }

    // Absence request check - use some() for early return
    return requests.some(
        (request) =>
            !request.IsPresence &&
            date >= request.StartDate &&
            date <= request.EndDate
    );
}

export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

export async function isDayOff(auth: Auth) {
    const now = new Date();

    const [holidays, requests] = await Promise.all([
        fetchWoffuHolidays(auth),
        fetchWoffuRequests(auth)
    ]);

    return _isDayOff(now, holidays, requests);
}

const WoffuSign = z.object({
    SignId: z.number(),
    SignIn: z.boolean()
    // AgreementEventId: z.union([z.boolean(), z.null()])
});

export async function isSigned(auth: Auth): Promise<boolean> {
    const response = await fetch(
        `https://${auth.company}.woffu.com/api/signs`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...auth.headers,
                ...UA
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch signs: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = z.array(WoffuSign).safeParse(data);

    if (parsed.error) {
        const pretty = z.prettifyError(parsed.error);
        console.error("Response:", data);
        console.error("Failed to parse response:", pretty);
        throw new Error("Invalid response format");
    }

    // Check last array elem
    const signs = parsed.data;
    if (signs.length === 0) {
        return false;
    }

    const lastSign = signs.at(-1);
    assert(lastSign !== undefined);
    return lastSign.SignIn;
}

export const CheckInHome = 839447;
export const CheckOut = null;
export const CheckInOffice = 913100;

export type CheckKind =
    | typeof CheckInHome
    | typeof CheckOut
    | typeof CheckInOffice;

export async function check(auth: Auth, kind: CheckKind) {
    const _isSigned = await isSigned(auth);

    if (kind === CheckOut && !_isSigned) {
        log("Already signed out, skipping");
        return;
    }

    if (kind !== CheckOut && _isSigned) {
        log("Already signed in, skipping");
        return;
    }

    const response = await fetch(
        `https://${auth.company}.woffu.com/api/svc/signs/signs`,
        {
            method: "POST",
            body: JSON.stringify({
                agreementEventId: kind,
                requestId: null,
                deviceId: "WebApp",
                latitude: null,
                longitude: null,
                timezoneOffset: new Date().getTimezoneOffset()
            }),
            headers: {
                "Content-Type": "application/json",
                ...auth.headers,
                ...UA
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to check in: ${response.statusText}`);
    }
}
