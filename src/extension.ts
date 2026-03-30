import * as vscode from 'vscode';
import { getDeveloperGuideContent, getQuickStatsContent } from './ui/webviews';
import { ConflictCodeLensProvider } from './ui/codeLensProvider';
import {
	healthCheck,
	resolveSingle,
	resolveBatch,
	getLastResolutionResults,
	clearResolutionResults,
	type ResolutionResult,
} from './ui/apiService';
import { showGitGraphOrPrompt } from './git-status';

export function activate(context: vscode.ExtensionContext) {
	// Register the ConflictCodeLensProvider for all file types
	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			{ scheme: 'file' },
			new ConflictCodeLensProvider(),
		),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('automerge.onboarding', () => {
			const panel = vscode.window.createWebviewPanel(
				'automergeOnboarding',
				'Automerge Onboarding',
				vscode.ViewColumn.One,
				{},
			);
			panel.webview.html = getDeveloperGuideContent();
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('automerge.quickStats', () => {
			const panel = vscode.window.createWebviewPanel(
				'automergeQuickStats',
				'Automerge Quick Stats',
				vscode.ViewColumn.One,
				{},
			);
			const results = getLastResolutionResults();
			panel.webview.html = getQuickStatsContent(results);
		}),
	);

	// Register AI Merge command
	context.subscriptions.push(
		vscode.commands.registerCommand('automerge.resolveConflict', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage('No active editor for AI merge.');
				return;
			}

			const doc = editor.document;
			const text = doc.getText();
			const language = doc.languageId;
			const filePath = doc.uri.fsPath;

			// Health check before merge
			const healthy = await healthCheck();
			console.log('API health check:', healthy);
			if (!healthy) {
				vscode.window.showErrorMessage('AI Merge API is not available.');
				return;
			}

			// Detect all conflicts — consume full >>>>>>> line including branch name
			const conflictRegex = /<<<<<<<[\s\S]*?>>>>>>>.*(\r?\n)?/g;
			const conflictMatches: { text: string; index: number }[] = [];
			let match;
			while ((match = conflictRegex.exec(text)) !== null) {
				conflictMatches.push({ text: match[0], index: match.index });
			}

			if (conflictMatches.length === 0) {
				vscode.window.showInformationMessage(
					'No merge conflicts found in this file.',
				);
				return;
			}

			// Clear previous results
			clearResolutionResults();

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title:
						'Resolving... This may take a moment depending on the number and size of conflicts.',
					cancellable: false,
				},
				async () => {
					if (conflictMatches.length === 1) {
						//  Single conflict
						const { text: conflictText, index: start } = conflictMatches[0];
						const result = await resolveSingle(
							conflictText,
							language,
							filePath,
						);

						if (result) {
							const end = start + conflictText.length;
							const edit = new vscode.WorkspaceEdit();
							const range = new vscode.Range(
								doc.positionAt(start),
								doc.positionAt(end),
							);

							let resultText = result.result;
							if (!resultText.endsWith('\n')) {
								resultText += '\n';
							}

							edit.replace(doc.uri, range, resultText);
							await vscode.workspace.applyEdit(edit);

							vscode.window.showInformationMessage(
								`AI Merge completed. ${result.summary.substring(0, 100)}${result.summary.length > 100 ? '...' : ''}`,
							);

							const panel = vscode.window.createWebviewPanel(
								'automergeQuickStats',
								'Automerge Quick Stats',
								vscode.ViewColumn.One,
								{},
							);
							panel.webview.html = getQuickStatsContent([result]);
						}
					} else {
						//  Batch mode
						const conflictTexts = conflictMatches.map((m) => m.text);
						const languages = conflictMatches.map(() => language);
						const filePaths = conflictMatches.map(() => filePath);

						const results = await resolveBatch(
							conflictTexts,
							languages,
							filePaths,
						);

						if (results) {
							// Work backwards so earlier indices stay valid
							let updatedText = text;

							for (let i = conflictMatches.length - 1; i >= 0; i--) {
								if (!results[i]) {
									continue;
								}

								const original = conflictMatches[i].text;

								// Use lastIndexOf when going in reverse — avoids duplicate-content collisions
								const start = updatedText.lastIndexOf(original);
								if (start === -1) {
									continue;
								}

								const end = start + original.length;

								let resultText = results[i].result;
								if (!resultText.endsWith('\n')) {
									resultText += '\n';
								}

								updatedText =
									updatedText.slice(0, start) +
									resultText +
									updatedText.slice(end);
							}

							const edit = new vscode.WorkspaceEdit();
							edit.replace(
								doc.uri,
								new vscode.Range(
									doc.positionAt(0),
									doc.positionAt(text.length),
								),
								updatedText,
							);
							await vscode.workspace.applyEdit(edit);

							const totalResolved = results.filter(
								(r) => r && r.confidence > 0,
							).length;
							vscode.window.showInformationMessage(
								`Batch AI Merge completed. ${totalResolved}/${conflictMatches.length} conflicts resolved.`,
							);

							const panel = vscode.window.createWebviewPanel(
								'automergeQuickStats',
								'Automerge Quick Stats',
								vscode.ViewColumn.One,
								{},
							);
							panel.webview.html = getQuickStatsContent(results);
						}
					}
				},
			);

			if (conflictMatches.length === 1) {
				//  Single conflict
				const { text: conflictText, index: start } = conflictMatches[0];
				const result = await resolveSingle(conflictText, language, filePath);

				if (result) {
					const end = start + conflictText.length;
					const edit = new vscode.WorkspaceEdit();
					const range = new vscode.Range(
						doc.positionAt(start),
						doc.positionAt(end),
					);

					let resultText = result.result;
					if (!resultText.endsWith('\n')) {
						resultText += '\n';
					}

					edit.replace(doc.uri, range, resultText);
					await vscode.workspace.applyEdit(edit);

					vscode.window.showInformationMessage(
						`AI Merge completed. ${result.summary.substring(0, 100)}${result.summary.length > 100 ? '...' : ''}`,
					);

					const panel = vscode.window.createWebviewPanel(
						'automergeQuickStats',
						'Automerge Quick Stats',
						vscode.ViewColumn.One,
						{},
					);
					panel.webview.html = getQuickStatsContent([result]);
				}
			} else {
				//  Batch mode
				const conflictTexts = conflictMatches.map((m) => m.text);
				const languages = conflictMatches.map(() => language);
				const filePaths = conflictMatches.map(() => filePath);

				const results = await resolveBatch(conflictTexts, languages, filePaths);

				if (results) {
					// Work backwards so earlier indices stay valid
					let updatedText = text;

					for (let i = conflictMatches.length - 1; i >= 0; i--) {
						if (!results[i]) {
							continue;
						}

						const original = conflictMatches[i].text;

						// Use lastIndexOf when going in reverse — avoids duplicate-content collisions
						const start = updatedText.lastIndexOf(original);
						if (start === -1) {
							continue;
						}

						const end = start + original.length;

						let resultText = results[i].result;
						if (!resultText.endsWith('\n')) {
							resultText += '\n';
						}

						updatedText =
							updatedText.slice(0, start) + resultText + updatedText.slice(end);
					}

					const edit = new vscode.WorkspaceEdit();
					edit.replace(
						doc.uri,
						new vscode.Range(doc.positionAt(0), doc.positionAt(text.length)),
						updatedText,
					);
					await vscode.workspace.applyEdit(edit);

					const totalResolved = results.filter(
						(r) => r && r.confidence > 0,
					).length;
					vscode.window.showInformationMessage(
						`Batch AI Merge completed. ${totalResolved}/${conflictMatches.length} conflicts resolved.`,
					);

					const panel = vscode.window.createWebviewPanel(
						'automergeQuickStats',
						'Automerge Quick Stats',
						vscode.ViewColumn.One,
						{},
					);
					panel.webview.html = getQuickStatsContent(results);
				}
			}
		}),
		vscode.commands.registerCommand('automerge.showGitGraph', async () => {
			await showGitGraphOrPrompt();
		}),
	);
}

export function deactivate() {
	console.log('Extension deactivated');
}
