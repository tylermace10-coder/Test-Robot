const fs=require('node:fs/promises'),path=require('node:path'),url=require('node:url'),Module=require('node:module');
class Uri {
  constructor(value){this.value=new URL(value);}
  get path(){return decodeURIComponent(this.value.pathname);}
  get fsPath(){return url.fileURLToPath(this.value);}
  toString(){return this.value.href;}
  with({path:next}){const result=new URL(this.value);result.pathname=next;return new Uri(result.href);}
  static file(p){return new Uri(url.pathToFileURL(p).href);}
  static parse(p){return new Uri(p);}
  static joinPath(uri,...parts){return uri.with({path:path.posix.join(uri.path,...parts)});}
}
const disposable=()=>({dispose(){}});
async function makeHost(root,mediaUrl='https://test.local/media'){
  const folder=path.join(root,'src/main/deploy/pathplanner'), commands=new Map(),messages=[],webviews=[],notices=[];let provider,lenses;
  const workspaceState=new Map();
  const vscode={Uri,ViewColumn:{Beside:2},Range:class{constructor(start,end){this.start=start;this.end=end;}},CodeLens:class{constructor(range,command){this.range=range;this.command=command;}},EventEmitter:class{event=()=>disposable();fire(){}dispose(){}},
    workspace:{isTrusted:true,textDocuments:[],getWorkspaceFolder:()=>({uri:Uri.file(root)}),getConfiguration:()=>({get:key=>({telemetryUrl:'ws://localhost:5810/nt/test',actualPoseTopic:'/actual',plannedPoseTopic:'/planned'}[key])}),
      findFiles:async()=>{const results=[];for(const [dir,ext]of [['paths','.path'],['autos','.auto']]){for(const name of await fs.readdir(path.join(folder,dir)))if(name.endsWith(ext))results.push(Uri.file(path.join(folder,dir,name)));}return results;},
      fs:{readFile:uri=>fs.readFile(uri.fsPath),writeFile:(uri,bytes)=>fs.writeFile(uri.fsPath,bytes),createDirectory:uri=>fs.mkdir(uri.fsPath,{recursive:true})},
      createFileSystemWatcher:()=>({dispose(){},onDidChange:disposable,onDidCreate:disposable,onDidDelete:disposable}),onDidChangeWorkspaceFolders:disposable,onDidChangeTextDocument:disposable,onDidSaveTextDocument:disposable},
    window:{registerWebviewViewProvider:(id,value)=>{provider=value;return disposable();},showInformationMessage:message=>notices.push(message),showWarningMessage:message=>notices.push(message),showErrorMessage:message=>notices.push(message),createWebviewPanel:()=>{const webview=makeView();return{webview,reveal(){},onDidDispose:disposable,dispose(){}};}},
    commands:{registerCommand:(name,handler)=>{commands.set(name,handler);return disposable();},executeCommand:async()=>{}},languages:{registerCodeLensProvider:(selector,value)=>{lenses=value;return disposable();}}};
  function makeView(){const webview={cspSource:'http://127.0.0.1:*',html:'',options:{},asWebviewUri:uri=>`${mediaUrl}/${path.basename(uri.fsPath)}`,postMessage:message=>{messages.push(structuredClone(message));return Promise.resolve(true);},onDidReceiveMessage:callback=>{webview.receive=callback;return disposable();}};webviews.push(webview);return webview;}
  const context={extensionUri:Uri.file(path.resolve(__dirname,'..')),subscriptions:[],workspaceState:{get:(key,fallback)=>workspaceState.get(key)??fallback,update:async(key,value)=>workspaceState.set(key,structuredClone(value))}};
  const original=Module._load;Module._load=function(name,...args){return name==='vscode'?vscode:original.call(this,name,...args);};
  let extension;try{delete require.cache[require.resolve('../out/extension')];extension=require('../out/extension');}finally{Module._load=original;}
  await extension.activate(context);const view=makeView();provider.resolveWebviewView({webview:view,onDidDispose:disposable});await view.receive({type:'ready'});
  return {provider,view,messages,webviews,commands,notices,vscode,context,lenses,dispose(){provider.dispose();}};
}
module.exports={makeHost,Uri};
