import { test, expect } from "vitest";
import { RequestsResponse } from "./woffu.js";

test("requests", () => {
  const samples = [
    [
      {
        StartDate: "2025-09-15T00:00:00.000",
        EndDate: "2025-09-15T00:00:00.000",
        IsFullDay: true,
        IsPresence: true,
      },
      {
        StartDate: new Date("2025-09-15"),
        EndDate: new Date("2025-09-15"),
        IsFullDay: true,
        IsPresence: true,
      },
    ],
    [
      {
        StartDate: "2025-09-16T00:00:00.000",
        EndDate: "2025-09-16T00:00:00.000",
        IsFullDay: true,
        IsPresence: true,
      },
      {
        StartDate: new Date("2025-09-16"),
        EndDate: new Date("2025-09-16"),
        IsFullDay: true,
        IsPresence: true,
      },
    ],
  ];

  for (const [input, expected] of samples) {
    const parsed = RequestsResponse.safeParse(input);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual(expected);
  }
});
