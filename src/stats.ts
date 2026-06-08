import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { median } from "./metrics";

export const STATS_PATH = join(process.env.HOME ?? "", ".pi/agent/pi-speeed-stats.json");

export type RecentStat = {
	endedAt: number;
	model: string;
	provider: string;
	api: string;
	outputTokens: number;
	durationMs: number;
	medianTokS: number | null;
	avgTokS: number | null;
	stopReason: string;
};

export type StatsBucket = {
	messages: number;
	outputTokens: number;
	durationMs: number;
	medianTokSValues: number[];
	maxMedianTokS: number | null;
	minMedianTokS: number | null;
	avgTokS: number | null;
	medianOfMediansTokS: number | null;
};

export type AggregateStats = {
	schemaVersion: 1;
	totals: StatsBucket;
	byModel: Record<string, StatsBucket>;
	stopReasons: Record<string, number>;
	recent: RecentStat[];
};

const MAX_RECENT = 200;

function emptyBucket(): StatsBucket {
	return {
		messages: 0,
		outputTokens: 0,
		durationMs: 0,
		medianTokSValues: [],
		maxMedianTokS: null,
		minMedianTokS: null,
		avgTokS: null,
		medianOfMediansTokS: null,
	};
}

export function emptyStats(): AggregateStats {
	return {
		schemaVersion: 1,
		totals: emptyBucket(),
		byModel: {},
		stopReasons: {},
		recent: [],
	};
}

function normalizeBucket(bucket: Partial<StatsBucket> | undefined): StatsBucket {
	return { ...emptyBucket(), ...(bucket ?? {}) };
}

function normalizeByModel(byModel: Record<string, Partial<StatsBucket>> | undefined) {
	return Object.fromEntries(Object.entries(byModel ?? {}).map(([model, bucket]) => [model, normalizeBucket(bucket)]));
}

export function loadStats(): AggregateStats {
	try {
		if (!existsSync(STATS_PATH)) return emptyStats();
		const parsed = JSON.parse(readFileSync(STATS_PATH, "utf8"));
		return {
			...emptyStats(),
			...parsed,
			totals: normalizeBucket(parsed.totals),
			byModel: normalizeByModel(parsed.byModel),
			stopReasons: parsed.stopReasons ?? {},
			recent: parsed.recent ?? [],
		};
	} catch {
		return emptyStats();
	}
}

export function saveStats(stats: AggregateStats) {
	writeFileSync(STATS_PATH, `${JSON.stringify(stats, null, 2)}\n`);
}

function addToBucket(bucket: StatsBucket, stat: RecentStat) {
	bucket.messages += 1;
	bucket.outputTokens += stat.outputTokens;
	bucket.durationMs += stat.durationMs;
	if (stat.medianTokS !== null && Number.isFinite(stat.medianTokS)) {
		bucket.medianTokSValues.push(stat.medianTokS);
		bucket.maxMedianTokS = bucket.maxMedianTokS === null ? stat.medianTokS : Math.max(bucket.maxMedianTokS, stat.medianTokS);
		bucket.minMedianTokS = bucket.minMedianTokS === null ? stat.medianTokS : Math.min(bucket.minMedianTokS, stat.medianTokS);
	}
	bucket.avgTokS = bucket.durationMs > 0 ? bucket.outputTokens / (bucket.durationMs / 1000) : null;
	bucket.medianOfMediansTokS = median(bucket.medianTokSValues);
}

function isSpeedEligible(stat: RecentStat) {
	return stat.stopReason !== "error" && stat.stopReason !== "aborted";
}

export function recordStat(stats: AggregateStats, stat: RecentStat) {
	if (isSpeedEligible(stat)) {
		addToBucket(stats.totals, stat);
		const modelKey = `${stat.provider}/${stat.model}`;
		stats.byModel[modelKey] ??= emptyBucket();
		addToBucket(stats.byModel[modelKey], stat);
	}
	stats.stopReasons[stat.stopReason] = (stats.stopReasons[stat.stopReason] ?? 0) + 1;
	stats.recent.push(stat);
	if (stats.recent.length > MAX_RECENT) stats.recent = stats.recent.slice(-MAX_RECENT);
}

function formatTokS(value: number | null) {
	return value === null ? "--" : value.toFixed(1);
}

export function summarizeStats(stats: AggregateStats) {
	const bestModel = Object.entries(stats.byModel)
		.filter(([, bucket]) => bucket.medianOfMediansTokS !== null)
		.sort((a, b) => (b[1].medianOfMediansTokS ?? 0) - (a[1].medianOfMediansTokS ?? 0))[0];
	const last = stats.recent[stats.recent.length - 1];
	return [
		`messages: ${stats.totals.messages}`,
		`output tokens: ${Math.round(stats.totals.outputTokens)}`,
		`avg: ${formatTokS(stats.totals.avgTokS)} tok/s`,
		`median: ${formatTokS(stats.totals.medianOfMediansTokS)} tok/s`,
		`fastest: ${formatTokS(stats.totals.maxMedianTokS)} tok/s`,
		`slowest: ${formatTokS(stats.totals.minMedianTokS)} tok/s`,
		`best model: ${bestModel ? `${bestModel[0]} (${formatTokS(bestModel[1].medianOfMediansTokS)} tok/s)` : "--"}`,
		`last: ${last ? `${formatTokS(last.medianTokS)} tok/s, ${last.outputTokens} tok, ${(last.durationMs / 1000).toFixed(1)}s` : "--"}`,
	].join("\n");
}
