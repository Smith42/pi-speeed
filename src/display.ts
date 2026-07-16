import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type Config, OFF_OPTION, OFF_VALUE, RANDOM_OPTION, RANDOM_VALUE, STATUS_ID } from "./config";
import { LABEL_PRESETS, randomPreset, WORKING_PREFIX_PRESETS } from "./presets";

type Theme = ExtensionContext["ui"]["theme"];

export function resolvePreset(value: string, presets: string[]) {
	return value === RANDOM_VALUE ? randomPreset(presets) : value;
}

export function displayPreset(value: string) {
	if (value === RANDOM_VALUE) return RANDOM_OPTION;
	if (value === OFF_VALUE) return OFF_OPTION;
	return value;
}

export type OccurrenceText = {
	label: string | null;
	workingPrefix: string | null;
};

// ponytail: flash cadence ~2Hz (500ms per state); phase 0 keeps the default muted tone
// so tests and non-TUI callers stay deterministic when no `now` is supplied.
const FLASH_PERIOD_MS = 500;
const FLASH_TONES = ["muted", "accent"] as const;

export function formatElapsedMs(ms: number) {
	if (!Number.isFinite(ms) || ms < 0) ms = 0;
	const totalSeconds = Math.floor(ms / 1000);
	if (totalSeconds < 60) return `${totalSeconds}s`;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
}

function flashTone(config: Config, now = 0) {
	if (!config.flashWorking) return "muted" as const;
	const phase = Math.floor(now / FLASH_PERIOD_MS) % FLASH_TONES.length;
	return FLASH_TONES[phase] ?? "muted";
}

export function chooseOccurrenceText(config: Config): OccurrenceText {
	return {
		label: resolvePreset(config.label, LABEL_PRESETS),
		workingPrefix: resolvePreset(config.workingPrefix, WORKING_PREFIX_PRESETS),
	};
}

export function formatSpeed(config: Config, occurrence: OccurrenceText, speed: number | null) {
	const label = occurrence.label ?? resolvePreset(config.label, LABEL_PRESETS);
	return speed === null ? `-- ${label}` : `${speed.toFixed(1)} ${label}`;
}

export function renderFooterTokS(config: Config, occurrence: OccurrenceText, speed: number | null) {
	const speedText = formatSpeed(config, occurrence, speed);
	return config.footerPrefix === OFF_VALUE ? speedText : `${config.footerPrefix} ${speedText}`;
}

function speedBadge(config: Config, occurrence: OccurrenceText, speed: number | null) {
	if (config.icon === "none" || config.icon.trim() === "") return formatSpeed(config, occurrence, speed);
	if (config.icon.length === 2 && config.icon.startsWith("")) return `${formatSpeed(config, occurrence, speed)}`;
	if (config.icon.length === 2 && config.icon.startsWith("")) return `${formatSpeed(config, occurrence, speed)}`;
	return `${config.icon} ${formatSpeed(config, occurrence, speed)}`;
}

export function renderWorkingTokS(config: Config, occurrence: OccurrenceText, speed: number | null, elapsedMs = 0) {
	const left = occurrence.workingPrefix ?? resolvePreset(config.workingPrefix, WORKING_PREFIX_PRESETS);
	const badge = speedBadge(config, occurrence, speed);
	return config.workingTimer && elapsedMs > 0 ? `${left}  ${badge} (thinking for ${formatElapsedMs(elapsedMs)})` : `${left}  ${badge}`;
}

function styledSpeedText(theme: Theme, config: Config, occurrence: OccurrenceText, speed: number | null) {
	const label = occurrence.label ?? resolvePreset(config.label, LABEL_PRESETS);
	const value = speed === null ? "--" : speed.toFixed(1);
	const valueTone = speed === null ? "dim" : "accent";
	return `${theme.fg(valueTone, value)} ${theme.fg("dim", label)}`;
}

function styledSpeedBadge(theme: Theme, config: Config, occurrence: OccurrenceText, speed: number | null) {
	const speedText = styledSpeedText(theme, config, occurrence, speed);
	const icon = config.icon.trim();
	if (icon === "none" || icon === "") return speedText;
	if (icon.length === 2 && icon.startsWith("")) return `${theme.fg("accent", "")}${speedText}${theme.fg("accent", "")}`;
	if (icon.length === 2 && icon.startsWith("")) return `${theme.fg("accent", "")}${speedText}${theme.fg("accent", "")}`;
	return `${theme.fg("accent", icon)} ${speedText}`;
}

export function renderStyledFooterTokS(theme: Theme, config: Config, occurrence: OccurrenceText, speed: number | null) {
	const speedText = styledSpeedText(theme, config, occurrence, speed);
	if (config.footerPrefix === OFF_VALUE) return speedText;
	return `${theme.fg("dim", config.footerPrefix)} ${speedText}`;
}

export function renderStyledWorkingTokS(
	theme: Theme,
	config: Config,
	occurrence: OccurrenceText,
	speed: number | null,
	elapsedMs = 0,
	now = 0,
) {
	const left = occurrence.workingPrefix ?? resolvePreset(config.workingPrefix, WORKING_PREFIX_PRESETS);
	const badge = styledSpeedBadge(theme, config, occurrence, speed);
	const body = `${theme.fg(flashTone(config, now), left)}  ${badge}`;
	if (!config.workingTimer || elapsedMs <= 0) return body;
	return `${body} ${theme.fg("dim", `(thinking for ${formatElapsedMs(elapsedMs)})`)}`;
}

export function updateStatus(ctx: ExtensionContext, config: Config, text: string) {
	if (!ctx.hasUI) return;
	if (!config.enabled || !config.footer) {
		ctx.ui.setStatus(STATUS_ID, undefined);
		return;
	}
	ctx.ui.setStatus(STATUS_ID, text);
}

export function clearUi(ctx: ExtensionContext) {
	if (!ctx.hasUI) return;
	ctx.ui.setStatus(STATUS_ID, undefined);
	ctx.ui.setWorkingMessage();
	if (ctx.ui.setWorkingIndicator) ctx.ui.setWorkingIndicator();
}
