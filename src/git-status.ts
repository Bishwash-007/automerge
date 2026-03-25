import * as vscode from 'vscode';

export async function showGitGraphOrPrompt() {
	const gitGraphExt = vscode.extensions.getExtension('mhutchie.git-graph');
	if (gitGraphExt) {
		await vscode.commands.executeCommand('git-graph.view');
	} else {
		const install = 'Install Git Graph';
		const choice = await vscode.window.showInformationMessage(
			'Git Graph extension is not installed. Would you like to install it?',
			install,
			'Cancel',
		);
		if (choice === install) {
			await vscode.commands.executeCommand(
				'workbench.extensions.installExtension',
				'mhutchie.git-graph',
			);
		}
	}
}

export async function showGitStatus() {
	await vscode.commands.executeCommand('git.showQuickStatus');
}
