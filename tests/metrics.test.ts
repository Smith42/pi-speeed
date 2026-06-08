import { describe, expect, it } from "vitest";
import { median, medianTokS, rescaleSamplesToFinalTokens } from "../src/metrics";

describe("metrics", () => {
	it("calculates median values", () => {
		expect(median([])).toBeNull();
		expect(median([3, 1, 2])).toBe(2);
		expect(median([4, 1, 2, 3])).toBe(2.5);
	});

	it("calculates median token speed from positive token deltas", () => {
		expect(
			medianTokS([
				{ time: 0, tokens: 0 },
				{ time: 1000, tokens: 10 },
				{ time: 2000, tokens: 10 },
				{ time: 3000, tokens: 40 },
			]),
		).toBe(20);
	});

	it("rescales sampled tokens to final usage while staying monotonic", () => {
		const samples = rescaleSamplesToFinalTokens(
			[
				{ time: 0, tokens: 5 },
				{ time: 1000, tokens: 10 },
			],
			20,
			2000,
			true,
		);

		expect(samples.map((sample) => sample.tokens)).toEqual([10, 20, 20]);
	});
});
