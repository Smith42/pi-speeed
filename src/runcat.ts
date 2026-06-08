import type { ExtensionContext, WorkingIndicatorOptions } from "@earendil-works/pi-coding-agent";
import type { Config } from "./config";

export const RUNCAT_FRAMES = [" ", " ", " ", " ", " "];

export type RunCatState = {
	appliedAt: number;
	intervalMs: number;
};

export function runcatInterval(config: Config, speed: number | null) {
	if (speed === null || !Number.isFinite(speed) || speed <= 0) return config.defaultRuncatIntervalMs;
	return Math.max(config.minRuncatIntervalMs, Math.min(config.maxRuncatIntervalMs, Math.round(config.runcatScale / speed)));
}

export function applyRunCatIndicator(
	ctx: ExtensionContext,
	config: Config,
	state: RunCatState,
	speed: number | null = null,
	force = false,
) {
	if (!ctx.hasUI || !ctx.ui.setWorkingIndicator) return;
	if (!config.runcat) {
		ctx.ui.setWorkingIndicator();
		return;
	}
	const nextInterval = runcatInterval(config, speed);
	const now = Date.now();
	const currentInterval = state.intervalMs || config.defaultRuncatIntervalMs;
	const cycleMs = RUNCAT_FRAMES.length * currentInterval;
	const phaseMs = state.appliedAt === 0 ? 0 : (now - state.appliedAt) % cycleMs;
	const atFirstFrame = phaseMs < Math.max(32, currentInterval * 0.2);
	const intervalChanged = Math.abs(nextInterval - state.intervalMs) >= 10;
	if (!force && (!intervalChanged || !atFirstFrame)) return;

	const indicator: WorkingIndicatorOptions = { frames: RUNCAT_FRAMES, intervalMs: nextInterval };
	ctx.ui.setWorkingIndicator(indicator);
	state.appliedAt = now;
	state.intervalMs = nextInterval;
}
