const vscode=require('vscode'),assert=require('node:assert/strict');
exports.run=async()=>{
  const extension=vscode.extensions.getExtension('test-robot.frc-auto-visualizer');assert.ok(extension,'Extension discovered');await extension.activate();
  const commands=await vscode.commands.getCommands(true);for(const name of ['frcVisualizer.open','frcVisualizer.reference','frcVisualizer.connect','frcVisualizer.disconnect'])assert.ok(commands.includes(name),name);
  const folder=vscode.workspace.workspaceFolders[0].uri;const uri=vscode.Uri.joinPath(folder,'src/main/java/frc/robot/auto/Autos.java');const document=await vscode.workspace.openTextDocument(uri);await vscode.window.showTextDocument(document);
  const lenses=await vscode.commands.executeCommand('vscode.executeCodeLensProvider',uri);assert.ok(lenses.some(l=>l.command?.title==='View path: First 8 Path'),'Java CodeLens');
  await vscode.commands.executeCommand('frcVisualizer.reference','First 8 Path','path',folder.path);
  await vscode.commands.executeCommand('frcVisualizer.open');console.log('Native VS Code smoke passed: activation, commands, Java CodeLens, sidebar focus, editor panel.');
};
