import { program } from "@commander-js/extra-typings";
import { CronJob } from "cron";
import * as Woffu from "./woffu.js";

const company = Woffu.companyFromEnv();
const cred = Woffu.credentialsFromEnv();

function log(...message: unknown[]) {
    console.log(`[${new Date().toISOString()}]`, ...message);
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
    // Everyday at 4:40PM
    const jobOut = new CronJob("0 40 16 * * *", async () => {
        const auth = await Woffu.login(cred, company);
        await Woffu.check(auth, Woffu.CheckOut);
        log("Checked out");
    });

    // Every weekday at 8:30AM
    const jobIn = new CronJob("0 30 8 * * *", async () => {
        const auth = await Woffu.login(cred, company);
        const isDayOff = await Woffu.isDayOff(auth);
        if (isDayOff) {
            log("Day off, not checking in");
            return;
        } else {
            const weekDay = new Date().getDay();
            const kind =
                weekDay === 1 || weekDay === 3 || weekDay === 5
                    ? Woffu.CheckInHome
                    : Woffu.CheckInOffice;
            await Woffu.check(auth, kind);
            log(
                `Checked in at ${kind === Woffu.CheckInHome ? "home" : "office"}`
            );
        }
    });

    jobIn.start();
    jobOut.start();
});

program.parse();
