import {
	CodeLensProvider,
	TextDocument,
	CancellationToken,
	CodeLens,
	Range,
	Command,
	Event,
	EventEmitter,
} from 'vscode';

export class ConflictCodeLensProvider implements CodeLensProvider {
	private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
	public readonly onDidChangeCodeLenses: Event<void> =
		this._onDidChangeCodeLenses.event;

	// Triggers a refresh of the CodeLenses
	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}

	provideCodeLenses(
		document: TextDocument,
		token: CancellationToken,
	): CodeLens[] {
		const codeLenses: CodeLens[] = [];
		const conflictRanges = this.getConflictRanges(document);
		for (const range of conflictRanges) {
			const codeLens = new CodeLens(range, {
				title: '$(sparkle) Resolve conflict (AI)',
				command: 'automerge.resolveConflict',
				arguments: [document.uri, range],
			});
			codeLenses.push(codeLens);
		}
		return codeLenses;
	}

	// Returns an array of Ranges for each conflict in the document
	private getConflictRanges(document: TextDocument): Range[] {
		const text = document.getText();
		const regex = /<<<<<<<[\s\S]*?>>>>>>>/g;
		const ranges: Range[] = [];
		let match: RegExpExecArray | null;
		while ((match = regex.exec(text)) !== null) {
			const start = match.index;
			const end = start + match[0].length;
			const startPos = document.positionAt(start);
			const endPos = document.positionAt(end);
			ranges.push(new Range(startPos, endPos));
		}
		return ranges;
	}
}
