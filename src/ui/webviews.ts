import type { ResolutionResult } from './apiService';

export const getDeveloperGuideContent = () => {
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>AutoMerge</title>
		<style>
			body {
				font-family: var(--vscode-font-family);
				padding: 20px;
				line-height: 1.6;
			}
			h1 {
				border-bottom: 1px solid var(--vscode-panel-border);
				padding-bottom: 10px;
			}
			h2 {
				margin-top: 20px;
			}
			code {
				background: var(--vscode-textCodeBlock-background);
				padding: 2px 6px;
				border-radius: 3px;
			}
			pre {
				background: var(--vscode-textCodeBlock-background);
				padding: 12px;
				border-radius: 5px;
				overflow-x: auto;
			}
		</style>
	</head>
	<body>
		<h1>AutoMerge - Developer's Guide</h1>

		<h2>Overview</h2>
		<p>AutoMerge uses AI (Ollama with Qwen 3.5 || Hugging Face 'ankit-ml11/automerge-codet5') and RAG (Retrieval-Augmented Generation) to automatically resolve git merge conflicts.</p>

		<h2>How It Works</h2>
		<ol>
			<li>When you encounter a merge conflict, click the <code>$(sparkle) Resolve conflict (AI)</code> CodeLens above the conflict</li>
			<li>The extension sends the conflict to the local API server</li>
			<li>The server uses RAG to find similar patterns in your codebase</li>
			<li>Qwen 3.5 or the Hugging Face model generates an intelligent resolution with an explanation</li>
			<li>Review the resolution and summary in the Quick Stats panel</li>
		</ol>

		<h2>Setup</h2>
		<ol>
			<li>Ensure Ollama is running: <code>ollama serve</code></li>
			<li>Pull the Qwen 3.5 model: <code>ollama pull qwen3.5</code></li>
			<li>Pull the Hugging Face model: <code>ollama pull ankit-ml11/automerge-codet5</code></li>
			<li>Start the API server: <code>cd automerge_server && uvicorn main:app --reload</code></li>
			<li>Build the RAG index (optional): <code>python scripts/build_index.py --git-history</code></li>
		</ol>

		<h2>Configuration</h2>
		<p>In VS Code settings, configure:</p>
		<pre><code>"automerge.apiBaseUrl": "http://localhost:8000/predictor/"</code></pre>

		<h2>Commands</h2>
		<ul>
			<li><strong>User Guide</strong> - Open this guide</li>
			<li><strong>Quick Stats</strong> - View resolution summaries</li>
			<li><strong>Resolve Conflict</strong> - AI-resolve conflict under cursor</li>
		</ul>
	</body>
</html>
`;
};

export const getQuickStatsContent = (results: ResolutionResult[] = []) => {
	if (!results || results.length === 0) {
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Merge Conflict Summary</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            padding: 20px;
            line-height: 1.5;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="empty-state">
        <h2>No Recent Resolutions</h2>
        <p>Resolve a merge conflict to see the summary here.</p>
    </div>
</body>
</html>`;
	}

	const resultsHtml = results
		.map(
			(result, index) => `
        <div class="conflict-item">
            <div class="conflict-header">
                <span class="conflict-number">Conflict ${index + 1} of ${results.length}</span>
                <span class="confidence ${getConfidenceClass(result.confidence)}">
                    Confidence: ${(result.confidence * 100).toFixed(0)}%
                </span>
            </div>

            <div class="section">
                <div class="section-title">Summary</div>
                <div class="summary-text">${escapeHtml(result.summary)}</div>
            </div>

            <div class="section">
                <div class="section-title">Resolved Code</div>
                <pre class="code-block"><code>${escapeHtml(result.result)}</code></pre>
            </div>
        </div>
    `,
		)
		.join('');

	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Merge Conflict Summary</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            line-height: 1.5;
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1 {
            font-size: 18px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .conflict-item {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .conflict-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background: var(--vscode-badge-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .conflict-number {
            font-weight: bold;
        }
        .confidence {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .confidence.high {
            background: var(--vscode-testing-icon-passed);
            color: var(--vscode-editor-background);
        }
        .confidence.medium {
            background: var(--vscode-charts-yellow);
            color: var(--vscode-editor-background);
        }
        .confidence.low {
            background: var(--vscode-errorForeground);
            color: var(--vscode-editor-background);
        }
        .section {
            padding: 15px;
        }
        .section-title {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .summary-text {
            background: var(--vscode-textBlockQuote-background);
            padding: 12px;
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 0 4px 4px 0;
            white-space: pre-wrap;
        }
        .code-block {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        code {
            font-family: var(--vscode-editor-font-family);
        }
    </style>
</head>
<body>
    <h1>Merge Conflict Summary</h1>

    ${resultsHtml}
</body>
</html>`;
};

function getConfidenceClass(confidence: number): string {
	if (confidence >= 0.7) {
		return 'high';
	}
	if (confidence >= 0.4) {
		return 'medium';
	}
	return 'low';
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
