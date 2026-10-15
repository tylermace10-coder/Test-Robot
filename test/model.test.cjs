const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const m=require('../out/model');
const root=path.resolve(__dirname,'../../src/main/deploy/pathplanner');
test('official image border, origin, dimensions and coordinate inverse',()=>{
  assert.deepEqual(m.fieldPixel({x:0,y:0}),{x:100,y:1714});
  assert.deepEqual(m.fieldPixel({x:16.54,y:8.07}),{x:3408,y:100});
  for(const p of [{x:0,y:0},{x:4.32,y:7.22},{x:16.54,y:8.07}]){const q=m.pixelField(m.fieldPixel(p));assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<1e-10);assert.deepEqual(m.alliancePoint(m.alliancePoint(p,true),true),p);}
});
test('every repository path and auto parses against installed schema',()=>{
  for(const name of fs.readdirSync(path.join(root,'paths')).filter(n=>n.endsWith('.path'))){const p=m.parsePath(fs.readFileSync(path.join(root,'paths',name),'utf8'));const samples=m.samplePath(p);assert.deepEqual({x:samples[0].x,y:samples[0].y},p.waypoints[0].anchor);assert.deepEqual({x:samples.at(-1).x,y:samples.at(-1).y},p.waypoints.at(-1).anchor);assert.ok(samples.every(s=>[s.x,s.y,s.distance,s.heading].every(Number.isFinite)));}
  for(const name of fs.readdirSync(path.join(root,'autos')).filter(n=>n.endsWith('.auto'))){const a=m.parseAuto(fs.readFileSync(path.join(root,'autos',name),'utf8'));assert.ok(m.autoPaths(a.command).every(n=>typeof n==='string'));}
});
test('rejects malformed and incompatible schemas',()=>{
  assert.throws(()=>m.parsePath('{'));
  assert.throws(()=>m.parsePath('{"version":"2026.0"}'),/Unsupported/);
  assert.throws(()=>m.parsePath('{"version":"2025.0","waypoints":[]}'),/waypoints/);
  assert.throws(()=>m.parseAuto('{"version":"2025.0","command":null}'),/command/);
});
test('nested auto references retain repeats and traversal order',()=>{
  const p=n=>({type:'path',data:{pathName:n}});
  assert.deepEqual(m.autoPaths({type:'sequential',data:{commands:[p('A'),{type:'parallel',data:{commands:[p('B'),{type:'named',data:{name:'Shoot'}}]}},p('A')]}}),['A','B','A']);
});
test('Java references cover this project and common APIs without matching comments',()=>{
  const source='// fromPathFile("Comment")\n/* new PathPlannerAuto("Comment") */\nPathPlannerPath.fromPathFile("Drive Forward");\nPathPlannerUtils.loadPathByName("First 8 Path");\nAutoBuilder.buildAuto("Routine");\nnew PathPlannerAuto("Auto");\nAutoBuilder.getAllAutoPaths("Paths");';
  const refs=m.javaReferences(source);assert.deepEqual(refs.map(r=>[r.name,r.kind]),[['Drive Forward','path'],['First 8 Path','path'],['Routine','auto'],['Auto','auto'],['Paths','auto']]);
  for(const ref of refs) assert.ok(source.slice(ref.start,ref.end).includes(ref.name));
});
test('Bezier handles affect geometry; rotation interpolation takes shortest arc',()=>{
  const p=m.parsePath(fs.readFileSync(path.join(root,'paths','Drive Forward.path'),'utf8'));
  p.waypoints=[{anchor:{x:0,y:0},prevControl:null,nextControl:{x:0,y:1}},{anchor:{x:1,y:0},prevControl:{x:1,y:1},nextControl:null}];p.rotationTargets=[];p.idealStartingState.rotation=170;p.goalEndState.rotation=-170;
  const samples=m.samplePath(p),mid=samples[50];assert.equal(mid.x,.5);assert.equal(mid.y,.75);assert.equal(mid.heading,180);assert.ok(samples.at(-1).distance>1);
});
