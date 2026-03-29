import * as vscode from 'vscode';

// Configuration
const BASE_URL = 'http://localhost:8080/predictor/';

// Store resolution results for display in Quick Stats
export interface ResolutionResult {
	result: string;
	summary: string;
	confidence: number;
}

let lastResolutionResults: ResolutionResult[] = [];

export function getLastResolutionResults(): ResolutionResult[] {
	return lastResolutionResults;
}

export function clearResolutionResults(): void {
	lastResolutionResults = [];
}

export async function healthCheck(): Promise<boolean> {
	try {
		const res = await fetch(`${BASE_URL}health/`);
		return res.ok;
	} catch (e) {
		return false;
	}
}

export async function resolveSingle(
	conflict_text: string,
	language: string,
	file_path?: string,
): Promise<ResolutionResult | null> {
	try {
		const res = await fetch(`${BASE_URL}resolve/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ conflict_text, language, file_path }),
		});
		const data: unknown = await res.json();
		if (
			typeof data === 'object' &&
			data !== null &&
			'result' in data &&
			'summary' in data
		) {
			const result = {
				result: (data as Record<string, unknown>).result as string,
				summary: (data as Record<string, unknown>).summary as string,
				confidence:
					typeof (data as Record<string, unknown>).confidence === 'number'
						? ((data as Record<string, unknown>).confidence as number)
						: 0.0,
			};
			// Store for Quick Stats
			lastResolutionResults = [result];
			return result;
		}
		vscode.window.showErrorMessage('Unexpected API response format.');
		return null;
	} catch (e: any) {
		vscode.window.showErrorMessage(`Merge failed: ${e.message || e}`);
		return null;
	}
}

export async function resolveBatch(
	conflicts: string[],
	languages: string[],
	file_paths?: (string | null)[],
): Promise<ResolutionResult[] | null> {
	try {
		const payload = conflicts.map((conflict, i) => ({
			conflict_text: conflict,
			language: languages[i] || 'unknown',
			file_path: file_paths?.[i] || null,
		}));

		const res = await fetch(`${BASE_URL}resolve/batch/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ conflicts: payload }),
		});
		const data: unknown = await res.json();
		if (
			typeof data === 'object' &&
			data !== null &&
			'results' in data &&
			Array.isArray((data as Record<string, unknown>).results)
		) {
			const results = (
				(data as Record<string, unknown>).results as Array<
					Record<string, unknown>
				>
			).map((r) => ({
				result: r.result as string,
				summary: r.summary as string,
				confidence: typeof r.confidence === 'number' ? r.confidence : 0.0,
			}));

			lastResolutionResults = results;
			return results;
		}
		vscode.window.showErrorMessage('Unexpected API response format.');
		return null;
	} catch (e: any) {
		vscode.window.showErrorMessage(`Batch Merge failed: ${e.message || e}`);
		return null;
	}
}
