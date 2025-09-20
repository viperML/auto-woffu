import { assert } from "tsafe";
import z from "zod";

// type-safe company
export class Company {
  constructor(public name: string) {}
}

export function companyFromEnv(): Company {
  const company = process.env["WOFFU_COMPANY"];
  assert(company, "WOFFU_COMPANY is not set");
  return new Company(company);
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

export async function login(
  cred: Credentials,
  company: Company
): Promise<Auth> {
  const params = new URLSearchParams({
    grant_type: "password",
    username: cred.email,
    password: cred.password,
  });

  const response = await fetch(`https://${company.name}.woffu.com/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token: ${response.statusText}`);
  }

  const data = await response.json();
  const token = data.access_token;
  assert(typeof token === "string", "access_token is not a string");
  return {
    token,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export interface Auth {
  token: string;
  headers: Record<string, string>;
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
  IsPresence: z.boolean(),
});

async function fetchWoffuRequests(auth: Auth, company: Company) {
  const response = await fetch(
    `https://${company.name}.woffu.com/api/users/requests/list?pageIndex=0&pageSize=10&statusType=null`,
    {
      method: "GET",
      headers: {
        ...auth.headers,
      },
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
  Name: z.string(),
});

export async function fetchWoffuHolidays(auth: Auth, company: Company) {
    const response = await fetch(
        `https://${company.name}.woffu.com/api/users/calendar-events/next`,
        {
            method: "GET",
            headers: {
                ...auth.headers,
            },
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

function _isDayOff(date: Date, holidays: (typeof HolidaysResponse)[], requests: (typeof HolidaysResponse)[]): boolean {
    // Check if date is saturday or sunday
    const day = date.getDay();
    if (day === 0 || day === 6) {
        return true;
    }



    return false;
}
