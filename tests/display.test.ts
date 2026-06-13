import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG, OFF_VALUE } from "../src/config";
import { renderFooterTokS, renderStyledFooterTokS, renderStyledWorkingTokS, updateStatus } from "../src/display";

describe("display", () => {
	it("omits footer prefix when set to off", () => {
		expect(renderFooterTokS({ ...DEFAULT_CONFIG, footerPrefix: OFF_VALUE }, { label: "tok/s", workingPrefix: null }, 12.3)).toBe(
			"12.3 tok/s",
		);
	});

	it("renders styled working text with colored prefix, icon, value, and label", () => {
		const theme = { fg: (color: string, text: string) => `<${color}>${text}</${color}>` } as unknown as Parameters<
			typeof renderStyledWorkingTokS
		>[0];

		expect(renderStyledWorkingTokS(theme, DEFAULT_CONFIG, { label: "tok/s", workingPrefix: "Working..." }, 80)).toBe(
			"<muted>Working...</muted>  <accent>✦</accent> <accent>80.0</accent> <dim>tok/s</dim>",
		);
	});

	it("renders styled footer text with the same value and label treatment", () => {
		const theme = { fg: (color: string, text: string) => `<${color}>${text}</${color}>` } as unknown as Parameters<
			typeof renderStyledFooterTokS
		>[0];

		expect(renderStyledFooterTokS(theme, DEFAULT_CONFIG, { label: "tok/s", workingPrefix: null }, 80)).toBe(
			"<dim>session avg</dim> <accent>80.0</accent> <dim>tok/s</dim>",
		);
		expect(
			renderStyledFooterTokS(theme, { ...DEFAULT_CONFIG, footerPrefix: OFF_VALUE }, { label: "tok/s", workingPrefix: null }, null),
		).toBe("<dim>--</dim> <dim>tok/s</dim>");
	});

	it("does not dim-wrap pre-styled status text", () => {
		const setStatus = vi.fn();
		const ctx = { hasUI: true, ui: { setStatus } } as never;

		updateStatus(ctx, DEFAULT_CONFIG, "<accent>80.0</accent> <dim>tok/s</dim>");

		expect(setStatus).toHaveBeenCalledWith("pi-speeed", "<accent>80.0</accent> <dim>tok/s</dim>");
	});
});
