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
		vscode.commands.registerCommand(
			'automerge.resolveConflict',
			async () => {
				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					vscode.window.showWarningMessage(
						'No active editor for AI merge.',
					);
					return;
				}
				const doc = editor.document;
				const text = doc.getText();
				const language = doc.languageId;
				const filePath = doc.uri.fsPath;

				// Health check before merge
				const healthy = await healthCheck();
				if (!healthy) {
					vscode.window.showErrorMessage(
						'AI Merge API is not available.',
					);
					return;
				}

				// Detect all conflicts in the file
				const conflictRegex = /<<<<<<<[\s\S]*?>>>>>>>/g;
				const conflicts = text.match(conflictRegex);
				if (!conflicts || conflicts.length === 0) {
					vscode.window.showInformationMessage(
						'No merge conflicts found in this file.',
					);
					return;
				}

				// Clear previous results
				clearResolutionResults();

				if (conflicts.length === 1) {
					// Single conflict resolution
					const result = await resolveSingle(
						conflicts[0],
						language,
						filePath,
					);
					if (result) {
						const edit = new vscode.WorkspaceEdit();
						const start = text.indexOf(conflicts[0]);
						const end = start + conflicts[0].length;
						const range = new vscode.Range(
							doc.positionAt(start),
							doc.positionAt(end),
						);
						edit.replace(doc.uri, range, result.result);
						await vscode.workspace.applyEdit(edit);

						// Show summary notification
						vscode.window.showInformationMessage(
							`AI Merge completed. ${result.summary.substring(0, 100)}${result.summary.length > 100 ? '...' : ''}`,
						);

						// Show Quick Stats webview with resolution details
						const panel = vscode.window.createWebviewPanel(
							'automergeQuickStats',
							'Automerge Quick Stats',
							vscode.ViewColumn.One,
							{},
						);
						panel.webview.html = getQuickStatsContent([result]);
					}
				} else {
					// Batch mode: resolve all conflicts at once
					const languages = conflicts.map(() => language);
					const filePaths = conflicts.map(() => filePath);

					const results = await resolveBatch(
						conflicts,
						languages,
						filePaths,
					);

					if (results) {
						let updatedText = text;
						for (let i = 0; i < conflicts.length; i++) {
							if (results[i]) {
								const start = updatedText.indexOf(conflicts[i]);
								const end = start + conflicts[i].length;
								updatedText =
									updatedText.slice(0, start) +
									results[i].result +
									updatedText.slice(end);
							}
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

						// Show summary
						const totalResolved = results.filter(
							(r) => r.confidence > 0,
						).length;
						vscode.window.showInformationMessage(
							`Batch AI Merge completed. ${totalResolved}/${conflicts.length} conflicts resolved.`,
						);

						// Show Quick Stats webview with all results
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
		),

		vscode.commands.registerCommand('automerge.showGitGraph', async () => {
			await showGitGraphOrPrompt();
		}),
	);
}

export function deactivate() {
	console.log('Extension deactivated');
}
