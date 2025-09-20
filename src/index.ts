import * as Woffu from "./woffu.js";

console.log("Hello!");

const company = Woffu.companyFromEnv();
const cred = Woffu.credentialsFromEnv();
const auth = await Woffu.login(cred, company);

const dayOff = await Woffu.isDayOff(auth);
console.log(dayOff);
