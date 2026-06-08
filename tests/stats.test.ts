import { describe, expect, it } from "vitest";
import { emptyStats, type RecentStat, recordStat, summarizeStats } from "../src/stats";

function stat(overrides: Partial<RecentStat> = {}): RecentStat {
	return {
		endedAt: 1,
		model: "gpt-test",
		provider: "openai",
		api: "responses",
		outputTokens: 100,
		durationMs: 2000,
		medianTokS: 50,
		avgTokS: 50,
		stopReason: "stop",
		...overrides,
	};
}

describe("stats", () => {
	it("records speed-eligible stats", () => {
		const stats = emptyStats();
		recordStat(stats, stat());

		expect(stats.totals.messages).toBe(1);
		expect(stats.totals.avgTokS).toBe(50);
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
});
