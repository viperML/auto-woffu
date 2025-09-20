import * as Woffu from "./woffu.js";

console.log("Hello!");

const company = Woffu.companyFromEnv();
const cred = Woffu.credentialsFromEnv();
const auth = await Woffu.login(cred, company);

// const requests = await Woffu.fetchWoffuRequests(auth, company);

// console.log(requests)

const holidays = await Woffu.fetchWoffuHolidays(auth, company);
console.log(holidays);
