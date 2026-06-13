import { describe, expect, it, vi } from "vitest";
import { estimateTokensFromDelta, TokenSpeedEngine } from "../src/engine";

const ENGINE_CONFIG = {
	slidingWindowMs: 1000,
	minReliableDurationMs: 1000,
	maxDisplayTokS: 500,
	useProviderTokens: false,
	countStrategy: "estimate" as const,
};

describe("estimateTokensFromDelta", () => {
	it("counts one token per delta in direct mode", () => {
		expect(estimateTokensFromDelta("hello world", "direct")).toBe(1);
	});

	it("estimates tokens from words and punctuation", () => {
		expect(estimateTokensFromDelta("hello, world!", "estimate")).toBe(4);
	});
});

describe("TokenSpeedEngine", () => {
	it("suppresses display speed before the reliable-duration warmup", () => {
		vi.useFakeTimers();
		const engine = new TokenSpeedEngine(ENGINE_CONFIG);
		engine.start();

		vi.advanceTimersByTime(500);
		engine.recordTokens(50);

		expect(engine.rawTokS).toBe(100);
		expect(engine.tokS).toBe(0);
		vi.useRealTimers();
	});

	it("uses a sliding window after warmup", () => {
		vi.useFakeTimers();
		const engine = new TokenSpeedEngine(ENGINE_CONFIG);
		engine.start();

		vi.advanceTimersByTime(1000);
		engine.recordTokens(10);
		vi.advanceTimersByTime(500);
		engine.recordTokens(5);

		expect(engine.tokS).toBe(30);
		vi.useRealTimers();
	});

	it("records incremental provider usage when enabled", () => {
		const engine = new TokenSpeedEngine({ ...ENGINE_CONFIG, useProviderTokens: true });
		engine.start();
		engine.recordDelta("ignored", 5);
		engine.recordDelta("ignored", 12);

		expect(engine.tokenCount).toBe(12);
	});

	it("reconciles to authoritative usage at message end", () => {
		vi.useFakeTimers();
		const engine = new TokenSpeedEngine(ENGINE_CONFIG);
		engine.start();
		vi.advanceTimersByTime(1000);
		engine.recordTokens(10);
		engine.reconcileTotal(42);
		const avgTokS = engine.avgTokS;
		engine.stop();

		expect(engine.tokenCount).toBe(42);
		expect(avgTokS).toBeGreaterThan(0);
		vi.useRealTimers();
	});

	it("avoids burst spikes from large single deltas", () => {
		vi.useFakeTimers();
		const engine = new TokenSpeedEngine({ ...ENGINE_CONFIG, countStrategy: "estimate" });
		engine.start();

		vi.advanceTimersByTime(1000);
		engine.recordDelta("word ".repeat(2000));
		vi.advanceTimersByTime(10);

		expect(engine.rawTokS).toBe(200000);
		expect(engine.tokS).toBe(0);
		vi.useRealTimers();
	});
});
