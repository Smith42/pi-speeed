import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/config";
import { recordCompletedMessageSpeed } from "../src/history";
import { emptyStats } from "../src/stats";

describe("history", () => {
	it("records aggregate stats and appends schema v3 session entries", () => {
		const appendEntry = vi.fn();
		const saveStats = vi.fn();
		const stats = emptyStats();

		recordCompletedMessageSpeed(
			{ appendEntry } as never,
			{ ...DEFAULT_CONFIG, persistStats: true },
			stats,
			{ outputTokens: 100, durationMs: 2000, tokS: 50 },
			{ endedAt: 3000, model: "model", provider: "provider", api: "api", responseId: "res", stopReason: "stop" },
			saveStats,
		);

		expect(saveStats).toHaveBeenCalledWith(stats);
		expect(stats.totals.messages).toBe(1);
		expect(stats.recent[0].tokS).toBe(50);
		expect(appendEntry).toHaveBeenCalledWith(
			"pi-speeed-stats",
			expect.objectContaining({ schemaVersion: 3, startedAt: 1000, endedAt: 3000, tokS: 50 }),
		);
	});

	it("skips session entries when persistence is off", () => {
		const appendEntry = vi.fn();
		const saveStats = vi.fn();
		recordCompletedMessageSpeed(
			{ appendEntry } as never,
			{ ...DEFAULT_CONFIG, persistStats: false },
			emptyStats(),
			{ outputTokens: 100, durationMs: 2000, tokS: 50 },
			{ endedAt: 3000, model: "model", provider: "provider", api: "api", stopReason: "stop" },
			saveStats,
		);

		expect(saveStats).toHaveBeenCalledOnce();
		expect(appendEntry).not.toHaveBeenCalled();
	});
});
