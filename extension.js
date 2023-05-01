const vscode = require('vscode');

let enabled = true; // 기본적으로 중괄호 강조 활성화
let timeout = undefined; // 디바운스에 사용될 타임아웃 값


function activate(context) {
    // 설정에서 color와 backgroundColor 값을 가져온다
    const config = vscode.workspace.getConfiguration('bindingDataColorizer');
    let color = config.get('color') || 'red';
    let backgroundColor = config.get('backgroundColor') || 'transparent';
	let debounceDuration = config.get('debounceDuration') || 500;

    let decorationType = vscode.window.createTextEditorDecorationType({
        color: color,
        backgroundColor: backgroundColor,
    });

    // 중괄호 강조에 사용할 장식 타입을 생성한다
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

    // 현재 활성화된 텍스트 에디터가 HTML 파일이면, 해당 에디터에 대한 강조를 업데이트한다
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

    context.subscriptions.push(toggleCommand); // 등록된 명령을 컨텍스트에 추가한다

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
                event.affectsConfiguration('bindingDataColorizer.backgroundColor')
            ) {
                const config = vscode.workspace.getConfiguration('bindingDataColorizer');
                const newColor = config.get('color') || 'red';
                const newBackgroundColor = config.get('backgroundColor') || 'transparent';
                decorationType.dispose();
                decorationType = vscode.window.createTextEditorDecorationType({
                    color: newColor,
                    backgroundColor: newBackgroundColor,
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
