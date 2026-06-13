import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, normalizeConfig } from "../src/config";

describe("config", () => {
	it("keeps valid manual config values", () => {
		const config = normalizeConfig({
			enabled: false,
			label: "zoomies/s",
			renderIntervalMs: 500,
			useProviderTokens: false,
			countStrategy: "direct",
		});

		expect(config.enabled).toBe(false);
		expect(config.label).toBe("zoomies/s");
		expect(config.renderIntervalMs).toBe(500);
		expect(config.useProviderTokens).toBe(false);
		expect(config.countStrategy).toBe("direct");
	});

	it("falls back to defaults for invalid manual config values", () => {
		const config = normalizeConfig({
			enabled: "yes",
			label: 123,
			renderIntervalMs: -1,
			countStrategy: "weird",
			minRuncatIntervalMs: 500,
			maxRuncatIntervalMs: 50,
		});

		expect(config.enabled).toBe(DEFAULT_CONFIG.enabled);
		expect(config.label).toBe(DEFAULT_CONFIG.label);
		expect(config.renderIntervalMs).toBe(DEFAULT_CONFIG.renderIntervalMs);
		expect(config.countStrategy).toBe(DEFAULT_CONFIG.countStrategy);
		expect(config.minRuncatIntervalMs).toBe(DEFAULT_CONFIG.minRuncatIntervalMs);
		expect(config.maxRuncatIntervalMs).toBe(DEFAULT_CONFIG.maxRuncatIntervalMs);
	});
});
