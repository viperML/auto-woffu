import { program } from "@commander-js/extra-typings";
import { CronJob } from "cron";
import * as Woffu from "./woffu.js";
import { assert } from "tsafe";
import { log } from "./log.js";
import fs from "node:fs/promises";
import { z } from "zod";

// const webhookUrl = process.env["DISCORD_WEBHOOK_URL"];
// assert(webhookUrl, "Missing DISCORD_WEBHOOK_URL env variable");

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

const ConfigFile = z
    .object({
        $schema: z.url().optional().meta({
            title: "Schema file for validation"
        }),
        company: z.string().min(1).meta({
            title: "Company name"
        }),
        email: z.email().meta({
            title: "User email"
        }),
        password: z.string().min(1).meta({
            title: "User password"
        }),
        schedule: z
            .array(
                z.object({
                    cron: z.string().meta({
                        title: "Cron expression"
                    }),
                    kind: z
                        .enum(["checkin-home", "checkin-office", "checkout"])
                        .meta({
                            title: "Check type"
                        })
                })
            )
            .optional()
            .meta({
                title: "Scheduled actions"
            }),
        discordWebhook: z.url().optional().meta({
            title: "Discord webhook URL"
        })
    })
    .meta({
        title: "Auto-Woffu configuration"
    });

interface CommonOptions {
    configFile?: string;
}

async function reconfigure(options: CommonOptions): Promise<[Woffu.Auth]> {
    if (options.configFile !== undefined) {
        const contents = await fs.readFile(options.configFile, {
            encoding: "utf-8"
        });

        const res = ConfigFile.safeParse(contents);
        if (!res.success) {
            throw new Error(`Invalid config file: ${res.error.message}`);
        }

        const config = res.data;

        const cred = new Woffu.Credentials(config.email, config.password);
        const auth = await Woffu.login(cred, config.company);
        return [auth];
    } else {
        const company = Woffu.companyFromEnv();
        const cred = Woffu.credentialsFromEnv();
        const auth = await Woffu.login(cred, company);
        return [auth];
    }
}

program
    .command("checkin-home")
    .option("-c, --config-file <PATH>", "path to the config file")
    .action(async (options: CommonOptions) => {
        const [auth] = await reconfigure(options);
        await Woffu.check(auth, Woffu.CheckInHome);
        log("Checked in at home");
    });

program
    .command("checkin-office")
    .option("-c, --config-file <PATH>", "path to the config file")
    .action(async (options: CommonOptions) => {
        const [auth] = await reconfigure(options);
        await Woffu.check(auth, Woffu.CheckInOffice);
        log("Checked in at office");
    });

program
    .command("checkout")
    .option("-c, --config-file <PATH>", "path to the config file")
    .action(async (options: CommonOptions) => {
        const [auth] = await reconfigure(options);
        await Woffu.check(auth, Woffu.CheckOut);
        log("Checked out");
    });

program
    .command("schema", {
        hidden: true
    })
    .action(() => {
        const schema = z.toJSONSchema(ConfigFile);
        console.log(JSON.stringify(schema, null, 2));
    });

// program.command("run").action(async () => {
//     // Everyday at 4:01PM
//     const jobOut = CronJob.from({
//         cronTime: "0 01 16 * * *",
//         onTick: async () => {
//             const auth = await Woffu.login(cred, company);
//             const isDayOff = await Woffu.isDayOff(auth);
//             if (!isDayOff) {
//                 await Woffu.check(auth, Woffu.CheckOut);
//                 log("Checked out");
//                 postToDiscord(webhookUrl, "⏳ Checked out");
//             }
//         },
//         timeZone: "Europe/Madrid"
//     });

//     // Every weekday at 8:30AM
//     const jobIn = CronJob.from({
//         cronTime: "0 30 8 * * *",
//         onTick: async () => {
//             const auth = await Woffu.login(cred, company);
//             const isDayOff = await Woffu.isDayOff(auth);
//             if (isDayOff) {
//                 log("Day off, not checking in");
//                 return;
//             } else {
//                 const weekDay = new Date().getDay();
//                 const kind =
//                     weekDay === 1 || weekDay === 3 || weekDay === 5
//                         ? Woffu.CheckInOffice
//                         : Woffu.CheckInHome;
//                 await Woffu.check(auth, kind);
//                 log(
//                     `Checked in at ${kind === Woffu.CheckInHome ? "home" : "office"}`
//                 );
//                 postToDiscord(
//                     webhookUrl,
//                     `✅ Checked in at ${kind === Woffu.CheckInHome ? "home" : "office"}`
//                 );
//             }
//         },
//         timeZone: "Europe/Madrid"
//     });

//     jobIn.start();
//     jobOut.start();

//     log("Auto woffu started");
//     log("Next run for jobIn:", jobIn.nextDate());
//     log("Next run for jobOut:", jobOut.nextDate());
// });

program.helpCommand(false);
program.parse();
