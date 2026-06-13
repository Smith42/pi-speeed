import { describe, expect, it } from "vitest";
import { emptyStats, median, normalizeStats, type RecentStat, recordStat, summarizeStats } from "../src/stats";

function stat(overrides: Partial<RecentStat> = {}): RecentStat {
	return {
		endedAt: 1,
		model: "gpt-test",
		provider: "openai",
		api: "responses",
		outputTokens: 100,
		durationMs: 2000,
		tokS: 50,
		stopReason: "stop",
		...overrides,
	};
}

describe("stats", () => {
	it("calculates median values", () => {
		expect(median([])).toBeNull();
		expect(median([3, 1, 2])).toBe(2);
		expect(median([4, 1, 2, 3])).toBe(2.5);
	});

	it("records speed-eligible stats", () => {
		const stats = emptyStats();
		recordStat(stats, stat());

		expect(stats.schemaVersion).toBe(2);
		expect(stats.totals.messages).toBe(1);
		expect(stats.totals.avgTokS).toBe(50);
		expect(stats.totals.medianTokS).toBe(50);
		expect(stats.byModel["openai/gpt-test"].messages).toBe(1);
		expect(summarizeStats(stats)).toContain("messages: 1");
	});

	it("excludes error and aborted messages from speed totals but keeps recent entries", () => {
		const stats = emptyStats();
		recordStat(stats, stat({ stopReason: "error" }));
		recordStat(stats, stat({ stopReason: "aborted" }));

		expect(stats.totals.messages).toBe(0);
		expect(stats.recent).toHaveLength(2);
		expect(stats.stopReasons).toEqual({ error: 1, aborted: 1 });
	});

	it("migrates legacy medianTokS stats into tokS stats", () => {
		const migrated = normalizeStats({
			schemaVersion: 1,
			totals: {
				messages: 1,
				outputTokens: 100,
				durationMs: 2000,
				medianTokSValues: [50],
				maxMedianTokS: 50,
				minMedianTokS: 50,
				avgTokS: 50,
				medianOfMediansTokS: 50,
			},
			byModel: {},
			stopReasons: { stop: 1 },
			recent: [
				{ endedAt: 1, model: "m", provider: "p", api: "a", outputTokens: 100, durationMs: 2000, medianTokS: 50, stopReason: "stop" },
			],
		});

		expect(migrated.schemaVersion).toBe(2);
		expect(migrated.totals.tokSValues).toEqual([50]);
		expect(migrated.totals.medianTokS).toBe(50);
		expect(migrated.recent[0].tokS).toBe(50);
	});
});
