const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {makeHost}=require('./host-harness.cjs');
test('sidebar and editor share selection; edits back up original and reject conflicts and dirty files',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'frc-host-')),folder=path.join(root,'src/main/deploy/pathplanner');let host;
  try{
    await fs.mkdir(path.join(folder,'paths'),{recursive:true});await fs.mkdir(path.join(folder,'autos'));
    const original=await fs.readFile(path.resolve(__dirname,'../../src/main/deploy/pathplanner/paths/Drive Forward.path'));
    const file=path.join(folder,'paths/Drive Forward.path');await fs.writeFile(file,original);await fs.writeFile(path.join(folder,'settings.json'),'{"robotWidth":0.8,"robotLength":1.0}');
    await fs.writeFile(path.join(folder,'autos/Drive Forward.auto'),JSON.stringify({version:'2025.0',command:{type:'path',data:{pathName:'Drive Forward'}}}));
    host=await makeHost(root);const first=host.messages.at(-1);assert.equal(first.paths.length,1);assert.deepEqual(first.paths[0].robot,{width:.8,length:1});
    host.commands.get('frcVisualizer.open')();const editor=host.webviews.at(-1);await editor.receive({type:'ready'});
    const state={path:first.paths[0].id,auto:first.autos[0].id,alliance:'red',progress:.5};await host.view.receive({type:'state',state});assert.deepEqual(host.messages.at(-1).state,state);
    const record=first.paths[0],message={type:'save',id:record.id,hash:record.hash,edits:[{index:0,target:'anchor',point:{x:4,y:5}}]};
    await editor.receive(message);assert.equal(host.messages.at(-1).type,'saved');
    const backups=await fs.readdir(path.join(root,'.frc-visualizer-backups'));assert.equal(backups.length,1);assert.deepEqual(await fs.readFile(path.join(root,'.frc-visualizer-backups',backups[0])),original);
    const changed=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(changed.waypoints[0].anchor,{x:4,y:5});assert.equal(changed.version,'2025.0');
    await editor.receive(message);assert.equal(host.messages.at(-1).type,'saveError');assert.match(host.messages.at(-1).reason,/changed on disk/);assert.equal((await fs.readdir(path.join(root,'.frc-visualizer-backups'))).length,1);
    host.vscode.workspace.textDocuments=[{uri:{toString:()=>record.id},isDirty:true}];await editor.receive(message);assert.match(host.messages.at(-1).reason,/unsaved/);
    await editor.receive({...message,id:'file:///unrelated.path'});assert.match(host.messages.at(-1).reason,/supported path/);
  }finally{host?.dispose();await fs.rm(root,{recursive:true,force:true});}
});
