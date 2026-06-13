import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type Config, loadConfig, saveConfig } from "./config";
import {
	chooseOccurrenceText,
	clearUi,
	type OccurrenceText,
	renderFooterTokS,
	renderStyledFooterTokS,
	renderStyledWorkingTokS,
	updateStatus,
} from "./display";
import { recordCompletedMessageSpeed } from "./history";
import { applyRunCatIndicator, type RunCatState } from "./runcat";
import { openSettings } from "./settings";
import { SpeedTracker } from "./speed-tracker";
import { loadStats, summarizeStats } from "./stats";
import { showReadOnlyPanel } from "./ui";

export default function (pi: ExtensionAPI) {
	let config: Config = loadConfig();
	let lastRenderedAt = 0;
	let occurrence: OccurrenceText = { label: null, workingPrefix: null };
	let aggregateStats = loadStats();
	const runcatState: RunCatState = { intervalMs: 0 };
	const speedTracker = new SpeedTracker(config);

	function renderFooterStatus(ctx: ExtensionContext) {
		const speed = speedTracker.sessionAvgTokS();
		return ctx.hasUI ? renderStyledFooterTokS(ctx.ui.theme, config, occurrence, speed) : renderFooterTokS(config, occurrence, speed);
	}

	function renderWorking(ctx: ExtensionContext, speed = speedTracker.liveTokS()) {
		if (!config.enabled || !ctx.hasUI) return;
		ctx.ui.setWorkingMessage(renderStyledWorkingTokS(ctx.ui.theme, config, occurrence, speed));
	}

	function refreshRunCat(ctx: ExtensionContext, speed = speedTracker.lastTokS, force = true) {
		if (!config.enabled) return;
		applyRunCatIndicator(ctx, config, runcatState, speed, force);
	}

	function applyConfig(ctx: ExtensionContext) {
		saveConfig(config);
		speedTracker.updateConfig(config);
		if (!config.enabled) {
			clearUi(ctx);
			return;
		}
		refreshRunCat(ctx);
		updateStatus(ctx, config, renderFooterStatus(ctx));
	}

	function ensureOccurrence() {
		if (occurrence.label === null || occurrence.workingPrefix === null) occurrence = chooseOccurrenceText(config);
	}

	function resetWorkingUi(ctx: ExtensionContext) {
		ensureOccurrence();
		refreshRunCat(ctx, null);
		renderWorking(ctx, speedTracker.lastTokS);
	}

	pi.on("session_start", async (_event, ctx) => {
		config = loadConfig();
		speedTracker.updateConfig(config);
		speedTracker.resetSession();
		refreshRunCat(ctx);
		if (config.enabled && ctx.hasUI) updateStatus(ctx, config, renderFooterStatus(ctx));
	});

	pi.on("agent_start", async (_event, ctx) => {
		if (!config.enabled) return;
		occurrence = chooseOccurrenceText(config);
		resetWorkingUi(ctx);
	});

	pi.on("turn_start", async (_event, ctx) => {
		if (!config.enabled) return;
		resetWorkingUi(ctx);
	});

	pi.on("message_start", async (event) => {
		if (!config.enabled || event.message?.role !== "assistant") return;
		speedTracker.startMessage();
		lastRenderedAt = 0;
	});

	pi.on("message_update", async (event, ctx) => {
		if (!config.enabled || event.message.role !== "assistant" || !speedTracker.isStreaming) return;

		const ev = event.assistantMessageEvent;
		if (ev.type === "text_delta" || ev.type === "thinking_delta") {
			speedTracker.recordDelta(ev.delta, ev.partial?.usage?.output);
		}

		ensureOccurrence();
		if (ev.type === "start") resetWorkingUi(ctx);

		const now = Date.now();
		if (now - lastRenderedAt < config.renderIntervalMs && ev.type !== "done") return;
		lastRenderedAt = now;

		const speed = speedTracker.liveTokS();
		applyRunCatIndicator(ctx, config, runcatState, speed);
		renderWorking(ctx, speed);
	});

	pi.on("message_end", async (event, ctx) => {
		if (!config.enabled || event.message.role !== "assistant" || !speedTracker.isStreaming) return;

		const completed = speedTracker.finishMessage(event.message.usage?.output ?? 0, event.message.stopReason);
		if (!completed) return;

		recordCompletedMessageSpeed(pi, config, aggregateStats, completed, {
			endedAt: Date.now(),
			model: event.message.model,
			provider: event.message.provider,
			api: event.message.api,
			responseId: event.message.responseId,
			stopReason: event.message.stopReason,
		});
		updateStatus(ctx, config, renderFooterStatus(ctx));
		refreshRunCat(ctx);
	});

	pi.on("turn_end", async () => speedTracker.stopMessage());

	pi.on("agent_end", async (_event, ctx) => {
		speedTracker.stopMessage();
		refreshRunCat(ctx);
		if (ctx.hasUI) ctx.ui.setWorkingMessage();
		if (!config.enabled && ctx.hasUI) clearUi(ctx);
		occurrence = { label: null, workingPrefix: null };
	});

	pi.on("session_shutdown", async (_event, ctx) => clearUi(ctx));

	async function handleConfigCommand(args: string, ctx: ExtensionCommandContext) {
		const [cmd] = args.trim().split(/\s+/).filter(Boolean);
		if (!cmd || cmd === "settings") {
			await openSettings(
				ctx,
				() => config,
				(next) => (config = next),
				() => applyConfig(ctx),
			);
			return;
		}
		if (cmd === "stats") {
			aggregateStats = loadStats();
			await showReadOnlyPanel(ctx, "pi-speeed stats", summarizeStats(aggregateStats));
			return;
		}
		ctx.ui.notify("Use /pi-speeed for settings or /pi-speeed stats for aggregate stats.", "error");
	}

	pi.registerCommand("pi-speeed", {
		description: "Open pi-speeed settings; use /pi-speeed stats for aggregate speed stats",
		handler: handleConfigCommand,
	});
}
