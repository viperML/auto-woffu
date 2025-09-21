import { test, expect } from "vitest";
import { RequestsResponse, _isDayOff } from "./woffu.js";

test("requests", () => {
    const samples = [
        [
            {
                StartDate: "2025-09-15T00:00:00.000",
                EndDate: "2025-09-15T00:00:00.000",
                IsFullDay: true,
                IsPresence: true
            },
            {
                StartDate: new Date("2025-09-15"),
                EndDate: new Date("2025-09-15"),
                IsFullDay: true,
                IsPresence: true
            }
        ],
        [
            {
                StartDate: "2025-09-16T00:00:00.000",
                EndDate: "2025-09-16T00:00:00.000",
                IsFullDay: true,
                IsPresence: true
            },
            {
                StartDate: new Date("2025-09-16"),
                EndDate: new Date("2025-09-16"),
                IsFullDay: true,
                IsPresence: true
            }
        ]
    ];

    for (const [input, expected] of samples) {
        const parsed = RequestsResponse.safeParse(input);
        expect(parsed.success).toBe(true);
        expect(parsed.data).toEqual(expected);
    }
});

test("_isDayOff", () => {
    // Test data: [date, expected result]
    // Using a fixed set of holidays and requests for consistent testing
    const holidays = [
        { Date: new Date("2025-12-25"), Name: "Christmas" },
        { Date: new Date("2025-01-01"), Name: "New Year" }
    ];

    const requests = [
        {
            StartDate: new Date("2025-09-20"),
            EndDate: new Date("2025-09-22"),
            IsFullDay: true,
            IsPresence: false // Absence request
        },
        {
            StartDate: new Date("2025-10-01"),
            EndDate: new Date("2025-10-01"),
            IsFullDay: true,
            IsPresence: true // Presence request (should not count as day off)
        }
    ];

    const testCases: [Date, boolean][] = [
        // Weekend tests (Sunday = 0, Saturday = 6)
        [new Date("2025-09-21"), true], // Sunday
        [new Date("2025-09-27"), true], // Saturday
        [new Date("2025-09-22"), true], // Monday (but in absence request)
        [new Date("2025-09-23"), false], // Tuesday (regular work day)

        // Holiday tests
        [new Date("2025-12-25"), true], // Christmas
        [new Date("2025-01-01"), true], // New Year
        [new Date("2025-12-24"), false], // Day before Christmas (not a holiday)

        // Absence request tests
        [new Date("2025-09-20"), true], // Start of absence request
        [new Date("2025-09-21"), true], // Middle of absence request (also Sunday)
        [new Date("2025-09-22"), true], // End of absence request
        [new Date("2025-09-19"), false], // Day before absence request
        [new Date("2025-09-23"), false], // Day after absence request

        // Presence request test (should not count as day off)
        [new Date("2025-10-01"), false], // Presence request day

        // Regular work days
        [new Date("2025-09-24"), false], // Wednesday
        [new Date("2025-09-25"), false], // Thursday
        [new Date("2025-09-26"), false] // Friday
    ];

    for (const [date, expected] of testCases) {
        const result = _isDayOff(date, holidays, requests);
        expect(result).toBe(expected);
    }
});
