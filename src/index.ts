import { assert } from "tsafe";

interface Credentials {
  company: string;
  email: string;
  password: string;
}

function get_auth(): Credentials {
  const password = process.env["WOFFU_PASSWORD"];
  assert(password, "WOFFU_PASSWORD is not set");

  const email = process.env["WOFFU_EMAIL"];
  assert(email, "WOFFU_EMAIL is not set");

  const company = process.env["WOFFU_COMPANY"];
  assert(company, "WOFFU_COMPANY is not set");

  return { company, email, password };
}

async function login(auth: Credentials): Promise<Auth> {
  const params = new URLSearchParams({
    grant_type: "password",
    username: auth.email,
    password: auth.password,
  });

  const response = await fetch(`https://${auth.company}.woffu.com/token`, {
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

interface Auth {
  token: string;
  headers: Record<string, string>;
}

const cred = get_auth();
const auth = await login(cred);
console.log(auth.token);

const req = await fetch(
  `https://${cred.company}.woffu.com/api/users/requests/list?pageIndex=0&pageSize=10&statusType=null`,
  {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...auth.headers,
    },
  }
);

console.log(req.status, await req.json());
