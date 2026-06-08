import type { AssistantMessageEvent } from "@earendil-works/pi-ai";

export type TokenSample = { time: number; tokens: number };

export function estimateTokensFromChars(chars: number) {
	return Math.max(0, Math.round(chars / 4));
}

export function tokensForUpdate(event: { message: { role?: string; usage?: { output?: number } } }, streamedChars: number) {
	const usageOutput = event.message.role === "assistant" ? (event.message.usage?.output ?? 0) : 0;
	if (usageOutput > 0) return usageOutput;
	return estimateTokensFromChars(streamedChars);
}

export function median(values: number[]) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function medianTokS(samples: TokenSample[]) {
	const speeds: number[] = [];
	for (let i = 1; i < samples.length; i++) {
		const dt = (samples[i].time - samples[i - 1].time) / 1000;
		const dTokens = samples[i].tokens - samples[i - 1].tokens;
		if (dt > 0 && dTokens > 0) speeds.push(dTokens / dt);
	}
	return median(speeds);
}

export function rescaleSamplesToFinalTokens(samples: TokenSample[], finalTokens: number, endedAt: number, correction: boolean) {
	if (!correction || finalTokens <= 0) return samples;
	const withFinal = [...samples];
	const last = withFinal[withFinal.length - 1];
	if (!last) return [{ time: endedAt, tokens: finalTokens }];
	if (last.time !== endedAt || last.tokens !== finalTokens) withFinal.push({ time: endedAt, tokens: last.tokens });

	const maxSampleTokens = Math.max(...withFinal.map((sample) => sample.tokens));
	if (maxSampleTokens <= 0) return withFinal.map((sample) => ({ ...sample, tokens: 0 }));

	let previous = 0;
	return withFinal.map((sample) => {
		const scaled = Math.min(finalTokens, (sample.tokens / maxSampleTokens) * finalTokens);
		previous = Math.max(previous, scaled);
		return { time: sample.time, tokens: previous };
	});
}

export function deltaChars(event: AssistantMessageEvent) {
	if (event.type === "text_delta" || event.type === "thinking_delta" || event.type === "toolcall_delta") return event.delta.length;
	return 0;
}
