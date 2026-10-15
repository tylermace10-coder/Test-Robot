const {test}=require('node:test'),assert=require('node:assert/strict');
const {WebSocketServer}=require('ws');
const {encode,decodeMulti}=require('@msgpack/msgpack');
const {Telemetry}=require('../out/telemetry');
test('NT4 subscribes to poses, decodes concatenated values, rejects stale/invalid values and disconnects',async()=>{
  const server=new WebSocketServer({host:'127.0.0.1',port:0,handleProtocols:protocols=>protocols.has('v4.1.networktables.first.wpi.edu')?'v4.1.networktables.first.wpi.edu':false});
  await new Promise(resolve=>server.on('listening',resolve));
  let resolvePose;const ready=new Promise(resolve=>resolvePose=resolve);let latest;
  const client=new Telemetry(live=>{latest=live;if(live.actual.length&&live.planned.length)resolvePose(live);});
  server.on('connection',ws=>{ws.on('message',(raw,binary)=>{
    if(binary){const packets=[...decodeMulti(raw)];if(packets[0][0]===-1)ws.send(encode([-1,1000,2,packets[0][3]]));return;}
    const messages=JSON.parse(raw.toString());assert.deepEqual(messages[0].params.topics,['/actual','/planned']);
    ws.send(JSON.stringify([{method:'announce',params:{id:1,name:'/actual',type:'double[]'}},{method:'announce',params:{id:2,name:'/planned',type:'double[]'}}]));
    ws.send(Buffer.concat([Buffer.from(encode([1,100,17,[2,3,90]])),Buffer.from(encode([1,99,17,[9,9,0]])),Buffer.from(encode([1,101,17,[1,2]])),Buffer.from(encode([2,100,17,[4,5,180]]))]));
  });});
  try{
    client.connect(`ws://127.0.0.1:${server.address().port}/nt/test`,'/actual','/planned');
    const result=await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('NT4 test timeout')),5000).unref())]);
    assert.deepEqual(result.actual,[{x:2,y:3,heading:90}]);assert.deepEqual(result.planned,[{x:4,y:5,heading:180}]);
    client.dispose();assert.equal(latest.status,'Disconnected');assert.deepEqual(latest.actual,[]);
  }finally{client.dispose();for(const ws of server.clients)ws.terminate();await new Promise(resolve=>server.close(resolve));}
});
