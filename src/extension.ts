import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | undefined;

    const openPanel = () => {
        if (panel) {
            try {
                panel.reveal();
                return;
            } catch (err) {
                console.log("[Buttonhole] Panel reveal failed, resetting...");
                panel = undefined;
            }
        }

        panel = vscode.window.createWebviewPanel(
            "buttonhole",
            "Buttonhole",
            vscode.ViewColumn.Beside,
            { 
                enableScripts: true,
                retainContextWhenHidden: true, // Keep the webview state
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'media')),
                    vscode.Uri.file(context.extensionPath)
                ]
            }
        );

        // Get the path to prompts.json
        const promptsPath = path.join(context.extensionPath, "prompts.json");
        console.log("[Buttonhole] Loading prompts from:", promptsPath);

        let prompts;
        try {
            const raw = fs.readFileSync(promptsPath, "utf8");
            console.log("[Buttonhole] Successfully loaded prompts.json");
            prompts = JSON.parse(raw);
            console.log("[Buttonhole] Number of prompts loaded:", prompts.length);
        } catch (err: any) {
            console.error("[Buttonhole] Failed to load prompts:", err);
            
            // Create a default prompts.json if it doesn't exist
            if (err.code === 'ENOENT') {
                console.log("[Buttonhole] Creating default prompts.json");
                prompts = [
                    {
                        "label": "Sample Prompt",
                        "prompt": "This is a sample prompt for Buttonhole.",
                        "enabled": true
                    }
                ];
                
                try {
                    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2), "utf8");
                    console.log("[Buttonhole] Created default prompts.json successfully");
                } catch (writeErr: any) {
                    console.error("[Buttonhole] Failed to create default prompts.json:", writeErr);
                    vscode.window.showErrorMessage("Failed to create default prompts.json: " + writeErr.message);
                }
            } else {
                vscode.window.showErrorMessage("Failed to load prompts.json: " + err.message);
                panel.dispose();
                return;
            }
        }

        const scriptUri = panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(context.extensionPath, "media", "webview.js"))
        );
        const styleUri = panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(context.extensionPath, "media", "style.css"))
        );

        panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src ${panel.webview.cspSource};">
    <link rel="stylesheet" href="${styleUri}">
    <title>Buttonhole</title>
</head>
<body>
    <div id="container"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;

        panel.onDidDispose(() => {
            panel = undefined;
        });

        panel.webview.onDidReceiveMessage(
            (msg) => {
                if (msg.command === "webviewReady") {
                    panel?.webview.postMessage({ command: "setPrompts", prompts: prompts });
                } else if (msg.command === "savePrompts") {
                    console.log("[Buttonhole] Saving prompts to:", promptsPath);
                    fs.writeFileSync(promptsPath, JSON.stringify(msg.prompts, null, 2), "utf8");
                    console.log("[Buttonhole] Prompts saved successfully");
                    
                    // Confirm to the webview that save was successful
                    panel?.webview.postMessage({ command: "saveSuccess" });
                } else if (msg.command === "openPromptFile") {
                    const fileUri = vscode.Uri.file(promptsPath);
                    vscode.window.showTextDocument(fileUri);
                }
            },
            undefined,
            context.subscriptions
        );
    };

    context.subscriptions.push(vscode.commands.registerCommand("buttonhole.open", openPanel));
}
