const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {applyEdits,fingerprint}=require('../out/editing');
const raw=fs.readFileSync(require('node:path').resolve(__dirname,'../../src/main/deploy/pathplanner/paths/Drive Forward.path'),'utf8');
test('anchor translation preserves controls, schema and unknown fields',()=>{
  const original=JSON.parse(raw);original.futureExtension={foo:'preserve'};const old=original.waypoints[0];old.futureWaypoint='keep';
  const result=JSON.parse(applyEdits(JSON.stringify(original),[{index:0,target:'anchor',point:{x:old.anchor.x+1,y:old.anchor.y-2}}]));
  assert.deepEqual(result.futureExtension,original.futureExtension);assert.equal(result.version,original.version);assert.equal(result.waypoints[0].futureWaypoint,'keep');
  assert.equal(result.waypoints[0].nextControl.x,old.nextControl.x+1);assert.equal(result.waypoints[0].nextControl.y,old.nextControl.y-2);assert.deepEqual(result.waypoints.slice(1),original.waypoints.slice(1));
});
test('handle edit changes only that handle; invalid edits fail',()=>{
  const original=JSON.parse(raw),result=JSON.parse(applyEdits(raw,[{index:0,target:'nextControl',point:{x:2,y:3}}]));
  assert.deepEqual(result.waypoints[0].anchor,original.waypoints[0].anchor);assert.deepEqual(result.waypoints[0].nextControl,{x:2,y:3});
  for(const edit of [{index:-1,target:'anchor',point:{x:0,y:0}},{index:0,target:'prevControl',point:{x:0,y:0}},{index:0,target:'anchor',point:{x:NaN,y:0}},{index:0,target:'unknown',point:{x:0,y:0}}])assert.throws(()=>applyEdits(raw,[edit]));
  assert.notEqual(fingerprint(Buffer.from(raw)),fingerprint(Buffer.from(raw+' ')));
});
