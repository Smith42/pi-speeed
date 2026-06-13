import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/config";
import { applyRunCatIndicator, type RunCatState, runcatInterval } from "../src/runcat";

function ctx() {
	const context = {
		hasUI: true,
		ui: {
			theme: { fg: (_color: string, text: string) => text },
			setWorkingIndicator: vi.fn(),
		},
	};
	return context;
}

describe("runcat", () => {
	it("maps higher token speed to faster frame intervals", () => {
		expect(runcatInterval(DEFAULT_CONFIG, null)).toBe(DEFAULT_CONFIG.defaultRuncatIntervalMs);
		expect(runcatInterval(DEFAULT_CONFIG, 30)).toBe(200);
		expect(runcatInterval(DEFAULT_CONFIG, 120)).toBe(50);
	});

	it("reapplies the working indicator as soon as speed changes the interval", () => {
		const context = ctx();
		const state: RunCatState = { intervalMs: 0 };

		applyRunCatIndicator(context as never, DEFAULT_CONFIG, state, 30);
		applyRunCatIndicator(context as never, DEFAULT_CONFIG, state, 120);

		expect(context.ui.setWorkingIndicator).toHaveBeenCalledTimes(2);
		expect(context.ui.setWorkingIndicator).toHaveBeenLastCalledWith(expect.objectContaining({ intervalMs: 50 }));
		expect(state.intervalMs).toBe(50);
	});

	it("does not reapply for tiny interval changes", () => {
		const context = ctx();
		const state: RunCatState = { intervalMs: 200 };

		applyRunCatIndicator(context as never, DEFAULT_CONFIG, state, 31);

		expect(context.ui.setWorkingIndicator).not.toHaveBeenCalled();
	});
});
