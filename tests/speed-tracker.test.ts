import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/config";
import { SpeedTracker } from "../src/speed-tracker";

const CONFIG = {
	...DEFAULT_CONFIG,
	minReliableDurationMs: 1000,
	maxDisplayTokS: 500,
	useProviderTokens: false,
};

describe("SpeedTracker", () => {
	it("records reliable completed messages into the session average", () => {
		vi.useFakeTimers();
		const tracker = new SpeedTracker(CONFIG);
		tracker.startMessage();

		vi.advanceTimersByTime(1000);
		tracker.recordDelta("hello world");
		const completed = tracker.finishMessage(20, "stop");

		expect(completed?.outputTokens).toBe(20);
		expect(completed?.tokS).toBe(20);
		expect(tracker.lastTokS).toBe(20);
		expect(tracker.sessionAvgTokS()).toBe(20);
		vi.useRealTimers();
	});

	it("keeps unreliable or aborted messages out of the session average", () => {
		vi.useFakeTimers();
		const tracker = new SpeedTracker(CONFIG);

		tracker.startMessage();
		vi.advanceTimersByTime(1000);
		tracker.recordDelta("hello world");
		tracker.finishMessage(20, "aborted");

		expect(tracker.lastTokS).toBe(20);
		expect(tracker.sessionAvgTokS()).toBeNull();
		vi.useRealTimers();
	});
});
