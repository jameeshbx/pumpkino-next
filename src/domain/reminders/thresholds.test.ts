import { describe, it, expect } from "vitest";
import { hoursAgo, daysAgo } from "./thresholds";

describe("hoursAgo / daysAgo", () => {
  it("hoursAgo(0) is (approximately) now", () => {
    expect(Date.now() - hoursAgo(0).getTime()).toBeLessThan(50);
  });

  it("hoursAgo(24) is one day in the past", () => {
    const expected = Date.now() - 24 * 60 * 60 * 1000;
    expect(Math.abs(hoursAgo(24).getTime() - expected)).toBeLessThan(50);
  });

  it("daysAgo(1) matches hoursAgo(24)", () => {
    expect(Math.abs(daysAgo(1).getTime() - hoursAgo(24).getTime())).toBeLessThan(5);
  });

  it("daysAgo(5) is five days in the past", () => {
    const expected = Date.now() - 5 * 24 * 60 * 60 * 1000;
    expect(Math.abs(daysAgo(5).getTime() - expected)).toBeLessThan(50);
  });

  it("a lte comparison against hoursAgo(N) correctly includes items exactly N hours old", () => {
    // This is the exact pattern reminder-service.ts uses: updatedAt <= hoursAgo(48)
    const itemUpdatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000 - 1000); // 48h + 1s old
    expect(itemUpdatedAt.getTime() <= hoursAgo(48).getTime()).toBe(true);

    const freshItem = new Date(Date.now() - 1000); // 1s old
    expect(freshItem.getTime() <= hoursAgo(48).getTime()).toBe(false);
  });
});
