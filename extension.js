const vscode = require('vscode');

let enabled = true;
let timeout = undefined;

function activate(context) {
    const config = vscode.workspace.getConfiguration('bindingDataColorizer');
    const color = config.get('color') || 'red';
    const backgroundColor = config.get('backgroundColor') || 'transparent';
    const borderColor = config.get('borderColor') || 'rgba(255, 255, 255, 0.8)';
    const borderRadius = config.get('borderRadius') || '3px';
    const fontWeight = config.get('fontWeight') || 'bold';
    const debounceDuration = config.get('debounceDuration') || 500;

    let decorationType = vscode.window.createTextEditorDecorationType({
        color: color,
        backgroundColor: backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: borderRadius,
        fontWeight: fontWeight,
    });

    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'html') {
        updateDecorations(activeEditor, decorationType);
    }

    function debouncedUpdate() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            if (activeEditor && activeEditor.document.languageId === 'html') {
                updateDecorations(activeEditor, decorationType);
            }
        }, debounceDuration);
    }

    const toggleCommand = vscode.commands.registerCommand('bindingDataColorizer.toggle', () => {
        enabled = !enabled;
        if (enabled) {
            if (activeEditor && activeEditor.document.languageId === 'html') {
                updateDecorations(activeEditor, decorationType);
            }
        } else {
            if (activeEditor) {
                activeEditor.setDecorations(decorationType, []);
            }
        }
    });

    context.subscriptions.push(toggleCommand);

    vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
            activeEditor = editor;
            if (editor && editor.document.languageId === 'html') {
                updateDecorations(editor, decorationType);
            }
        },
        null,
        context.subscriptions,
    );

    // vscode.workspace.onDidChangeTextDocument(
    //     (event) => {
    //         if (activeEditor && event.document === activeEditor.document) {
    //             if (timeout) {
    //                 clearTimeout(timeout);
    //             }
    //             timeout = setTimeout(() => {
    //                 updateDecorations(activeEditor, decorationType);
    //             }, debounceDuration);
    //         }
    //     },
    //     null,
    //     context.subscriptions,
    // );

    vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
            activeEditor = editor;
            if (editor) {
                debouncedUpdate();
            }
        },
        null,
        context.subscriptions,
    );

    vscode.workspace.onDidSaveTextDocument(
        (document) => {
            if (activeEditor && document === activeEditor.document) {
                debouncedUpdate();
            }
        },
        null,
        context.subscriptions,
    );

    vscode.workspace.onDidChangeConfiguration(
        (event) => {
            if (
                event.affectsConfiguration('bindingDataColorizer.color') ||
                event.affectsConfiguration('bindingDataColorizer.backgroundColor') ||
                event.affectsConfiguration('bindingDataColorizer.borderColor') ||
                event.affectsConfiguration('bindingDataColorizer.borderRadius') ||
                event.affectsConfiguration('bindingDataColorizer.fontWeight')
            ) {
                const config = vscode.workspace.getConfiguration('bindingDataColorizer');
                const newColor = config.get('color') || 'red';
                const newBackgroundColor = config.get('backgroundColor') || 'transparent';
                const newBorderColor = config.get('borderColor') || '#000000';
                const newBorderRadius = config.get('borderRadius') || '3px';
                const newfontWeight = config.get('fontWeight') || 'bold';

                decorationType.dispose();
                decorationType = vscode.window.createTextEditorDecorationType({
                    color: newColor,
                    backgroundColor: newBackgroundColor,
                    border: `1px solid ${newBorderColor}`,
                    borderRadius: newBorderRadius,
                    fontWeight: newfontWeight,
                });
                if (activeEditor && activeEditor.document.languageId === 'html') {
                    updateDecorations(activeEditor, decorationType);
                }
            }
        },
        null,
        context.subscriptions,
    );
}

function updateDecorations(editor, decorationType) {
    if (!enabled || !editor || editor.document.languageId !== 'html') {
        return;
    }

    const doc = editor.document;
    const decorations = [];
    const regex = /<!--\s*\{[\s\S]*?\}\s*-->|\{[\s\S]*?\}/g;

    for (let line = 0; line < doc.lineCount; line++) {
        const lineText = doc.lineAt(line).text;
        let match;

        while ((match = regex.exec(lineText)) !== null) {
            const startPos = new vscode.Position(line, match.index);
            const endPos = new vscode.Position(line, match.index + match[0].length);
            const decoration = { range: new vscode.Range(startPos, endPos) };
            decorations.push(decoration);
        }
    }

    for (let line = 0; line < doc.lineCount; line++) {
        const lineText = doc.lineAt(line).text;
        let startIndex = -1;
        let bracketCount = 0;

        for (let i = 0; i < lineText.length; i++) {
            if (lineText[i] === '{') {
                bracketCount++;
                if (startIndex === -1) {
                    startIndex = i;
                }
            } else if (lineText[i] === '}') {
                bracketCount--;

                if (bracketCount === 0) {
                    const startPos = new vscode.Position(line, startIndex);
                    const endPos = new vscode.Position(line, i + 1);
                    const decoration = { range: new vscode.Range(startPos, endPos) };
                    decorations.push(decoration);
                    startIndex = -1;
                }
            }
        }
    }

    editor.setDecorations(decorationType, decorations);
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;
