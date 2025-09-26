import { program } from "@commander-js/extra-typings";
import { CronJob } from "cron";
import * as Woffu from "./woffu.js";
import fs from "node:fs";
import { assert } from "tsafe";
import { log } from "./log.js";

const envFile = process.env["AUTOWOFFU_ENV_FILE"];
if (envFile) {
    // Read and parse line-by-line
    const fileContent = await fs.promises.readFile(envFile, "utf-8");
    const lines = fileContent.split("\n");
    for (const line of lines) {
        // Skip if line doesnt contain =
        if (!line.includes("=")) continue;
        const [key, value] = line.split("=");
        assert(key, "Missing key");
        assert(value, "Missing value");
        process.env[key] = value;
    }
} else {
    log("No .env file specified, using environment variables");
}

const company = Woffu.companyFromEnv();
const cred = Woffu.credentialsFromEnv();
const webhookUrl = process.env["DISCORD_WEBHOOK_URL"];
assert(webhookUrl, "Missing DISCORD_WEBHOOK_URL env variable");

async function postToDiscord(url: string, message: string) {
    // Simple post message to discord webhook
    await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: message })
    });
}

program.command("checkin-home").action(async () => {
    const auth = await Woffu.login(cred, company);
    await Woffu.check(auth, Woffu.CheckInHome);
    log("Checked in at home");
});

program.command("checkin-office").action(async () => {
    const auth = await Woffu.login(cred, company);
    await Woffu.check(auth, Woffu.CheckInOffice);
    log("Checked in at office");
});

program.command("checkout").action(async () => {
    const auth = await Woffu.login(cred, company);
    await Woffu.check(auth, Woffu.CheckOut);
    log("Checked out");
});

program.command("run").action(async () => {
    // Everyday at 4:01PM
    const jobOut = CronJob.from({
        cronTime: "0 01 16 * * *",
        onTick: async () => {
            const auth = await Woffu.login(cred, company);
            const isDayOff = await Woffu.isDayOff(auth);
            if (!isDayOff) {
                await Woffu.check(auth, Woffu.CheckOut);
                log("Checked out");
                postToDiscord(webhookUrl, "⏳ Checked out");
            }
        },
        timeZone: "Europe/Madrid"
    });

    // Every weekday at 8:30AM
    const jobIn = CronJob.from({
        cronTime: "0 30 8 * * *",
        onTick: async () => {
            const auth = await Woffu.login(cred, company);
            const isDayOff = await Woffu.isDayOff(auth);
            if (isDayOff) {
                log("Day off, not checking in");
                return;
            } else {
                const weekDay = new Date().getDay();
                const kind =
                    weekDay === 1 || weekDay === 3 || weekDay === 5
                        ? Woffu.CheckInOffice
                        : Woffu.CheckInHome;
                await Woffu.check(auth, kind);
                log(
                    `Checked in at ${kind === Woffu.CheckInHome ? "home" : "office"}`
                );
                postToDiscord(
                    webhookUrl,
                    `✅ Checked in at ${kind === Woffu.CheckInHome ? "home" : "office"}`
                );
            }
        },
        timeZone: "Europe/Madrid"
    });

    jobIn.start();
    jobOut.start();

    log("Auto woffu started");
    log("Next run for jobIn:", jobIn.nextDate());
    log("Next run for jobOut:", jobOut.nextDate());
});

program.parse();
