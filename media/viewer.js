/* Read-only geometric preview. Field metadata pinned to PathPlanner v2026.1.2. */
(() => {
  'use strict';
  const api=acquireVsCodeApi(), $=id=>document.getElementById(id), canvas=$('field'), ctx=canvas.getContext('2d'), image=$('image');
  let data={paths:[],autos:[],errors:[],state:{path:'',auto:'',alliance:'blue',progress:0},live:{actual:[],planned:[]}}, playing=false, last=0, tick=0;
  let camera={zoom:1,x:0,y:0,...api.getState()?.camera}, drag=null, width=0,height=0;
  let draft=null, edits=[], editDrag=null, saving=false;
  const persist=()=>api.setState({camera});
  const post=()=>api.postMessage({type:'state',state:data.state});
  const auto=()=>data.autos.find(a=>a.id===data.state.auto);
  const active=()=>draft??data.paths.find(p=>p.id===data.state.path);
  const routinePaths=()=>{const a=auto();return a?a.paths.map(n=>data.paths.find(p=>p.name===n&&p.root===a.root)).filter(Boolean).map(p=>draft?.id===p.id?draft:p):[];};
  const playlist=()=>active()?[active()]:routinePaths();
  const duration=p=>p.samples.at(-1).distance/p.data.globalConstraints.maxVelocity;
  function playback(){const list=playlist(),total=list.reduce((n,p)=>n+duration(p),0);let time=data.state.progress*total;for(let i=0;i<list.length;i++){const p=list[i],seconds=duration(p);if(time<=seconds||i===list.length-1){const distance=Math.min(1,seconds?time/seconds:0)*p.samples.at(-1).distance;let hi=p.samples.findIndex(s=>s.distance>=distance);if(hi<0)hi=p.samples.length-1;const b=p.samples[hi],a=p.samples[Math.max(0,hi-1)],f=b.distance===a.distance?0:(distance-a.distance)/(b.distance-a.distance);return {p,total,pose:{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,heading:a.heading+(b.heading-a.heading)*f,pos:a.pos+(b.pos-a.pos)*f}};}time-=seconds;}return {total:0};}
  const scale=()=>Math.min(width/3508,height/1814)*camera.zoom;
  const origin=()=>({x:(width-3508*scale())/2+camera.x,y:(height-1814*scale())/2+camera.y});
  function screen(p,flip=true){const red=flip&&data.state.alliance==='red',x=red?16.54-p.x:p.x,y=red?8.07-p.y:p.y,s=scale(),o=origin();return {x:o.x+(x+.5)*200*s,y:o.y+(8.57-y)*200*s};}
  function line(points,color,lw=2,flip=true){if(!points.length)return;ctx.beginPath();points.forEach((p,i)=>{const q=screen(p,flip);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.stroke();}
  function dot(p,color,r=4){const q=screen(p);ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function robot(p,color,flip=true,dimensions={length:.9,width:.9}){const q=screen(p,flip),heading=(p.heading+(flip&&data.state.alliance==='red'?180:0))*Math.PI/180,s=200*scale();ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-heading);ctx.fillStyle=color+'44';ctx.strokeStyle=color;ctx.lineWidth=2;ctx.fillRect(-dimensions.length*s/2,-dimensions.width*s/2,dimensions.length*s,dimensions.width*s);ctx.strokeRect(-dimensions.length*s/2,-dimensions.width*s/2,dimensions.length*s,dimensions.width*s);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(dimensions.length*s/2,0);ctx.lineTo(dimensions.length*s/2-5,-4);ctx.moveTo(dimensions.length*s/2,0);ctx.lineTo(dimensions.length*s/2-5,4);ctx.stroke();ctx.restore();}
  function markerLabel(p,text,color){const q=screen(p);ctx.font='11px sans-serif';ctx.fillStyle=color;ctx.fillText(text,q.x+7,q.y-7);}
  function atPos(p,pos){return p.samples.reduce((a,b)=>Math.abs(b.pos-pos)<Math.abs(a.pos-pos)?b:a);}
  function draw(){
    ctx.clearRect(0,0,width,height);const o=origin(),s=scale();if(image.complete&&image.naturalWidth)ctx.drawImage(image,o.x,o.y,3508*s,1814*s);
    const a=auto(),list=a?routinePaths():data.paths.map(p=>draft?.id===p.id?draft:p),selected=active(),play=playback(),focus=selected??play.p;
    for(const p of list)line(p.samples,p===focus?'#41d7ff':a?'#b79aff':'#6f8997',p===focus?3:1.5);
    if(focus){
      for(const w of focus.data.waypoints){for(const control of [w.prevControl,w.nextControl])if(control){line([w.anchor,control],'#ffca66',1);dot(control,'#ffca66',3);}dot(w.anchor,'#41d7ff',5);}
      for(const target of focus.data.rotationTargets){const p=atPos(focus,target.waypointRelativePos);dot(p,'#d492ff');markerLabel(p,`${target.rotationDegrees}°`,'#d492ff');}
      for(const event of focus.data.eventMarkers){const p=atPos(focus,event.waypointRelativePos);dot(p,'#ffe27a',5);markerLabel(p,event.name||'Event','#ffe27a');if(Number.isFinite(event.endWaypointRelativePos))line(focus.samples.filter(s=>s.pos>=event.waypointRelativePos&&s.pos<=event.endWaypointRelativePos),'#ffe27a',4);}
      robot(focus.samples[0],'#5de5a0',true,focus.robot);robot(focus.samples.at(-1),'#ffae69',true,focus.robot);
    }
    if(play.pose){robot(play.pose,'#ffffff',true,play.p.robot);const red=data.state.alliance==='red',x=red?16.54-play.pose.x:play.pose.x,y=red?8.07-play.pose.y:play.pose.y,h=((play.pose.heading+(red?180:0))%360+360)%360;$('pose').textContent=`X ${x.toFixed(2)} m · Y ${y.toFixed(2)} m · ${h.toFixed(1)}° · preview ${play.p.data.globalConstraints.maxVelocity.toFixed(2)} m/s`;}else $('pose').textContent='Select a saved PathPlanner path';
    for(const [key,color] of [['planned','#ff6cdb'],['actual','#a3ff56']]){const trail=data.live?.[key]??[];line(trail,color,2,false);if(trail.length)robot(trail.at(-1),color,false);}
    $('empty').textContent=!image.naturalWidth?'Official field image unavailable. Reinstall the extension or restore media/field26.png.':!data.paths.length?'No supported paths found in src/main/deploy/pathplanner/paths.':'';
    $('timeline').value=data.state.progress;
  }
  function options(select,items,placeholder,value){select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent=placeholder;select.append(first);for(const p of items){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;option.title=p.root;select.append(option);}select.value=value;}
  function describe(c,level=0){let line='  '.repeat(level)+c.type;if(c.type==='path')line+=`: ${c.data.pathName}`;if(c.type==='named')line+=`: ${c.data.name} (Java command; motion unknown)`;if(c.type==='wait')line+=`: ${c.data.waitTime} s`;return line+'\n'+(c.data.commands??[]).map(x=>describe(x,level+1)).join('');}
  function refresh(){options($('auto'),data.autos,'Individual paths',data.state.auto);options($('path'),auto()?routinePaths().filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i):data.paths,auto()?'Whole routine (path geometry order)':'Select path',data.state.path);$('alliance').value=data.state.alliance;$('routine').textContent=auto()?describe(auto().command)+'\nRoutine playback concatenates path geometry. Waits, parallel groups, named commands, and runtime branching are not simulated.':'';$('errors').textContent=data.errors.join('\n');if(active()?.data.pointTowardsZones.length)$('errors').textContent+='\nPoint-towards zones are not reflected in approximate headings.';$('status').textContent=(data.live?.status??'Disconnected')+' · planned: magenta · actual: lime';draw();}
  function editControls(){for(const id of ['auto','path','alliance','play','timeline'])$(id).disabled=!!draft;$('save').disabled=!edits.length||saving;$('discard').disabled=!draft||saving;$('edit').disabled=!!draft;$('editStatus').textContent=draft?(saving?'Saving with backup…':`Editing ${draft.name} · drag anchors or amber handles; Save to write. ${edits.length} changes.`):'Read-only viewer';}
  window.addEventListener('message',event=>{if(event.data?.type==='data'){data=event.data;refresh();}if(event.data?.type==='saved'){draft=null;edits=[];saving=false;editControls();refresh();}if(event.data?.type==='saveError'){saving=false;editControls();$('editStatus').textContent=event.data.reason;}});
  $('auto').onchange=()=>{playing=false;data.state.auto=$('auto').value;data.state.path=auto()?'':data.paths[0]?.id??'';data.state.progress=0;post();refresh();};
  $('path').onchange=()=>{playing=false;data.state.path=$('path').value;data.state.progress=0;post();refresh();};
  $('alliance').onchange=()=>{data.state.alliance=$('alliance').value;post();draw();};
  $('timeline').oninput=()=>{playing=false;$('play').textContent='Play';data.state.progress=Number($('timeline').value);post();draw();};
  $('play').onclick=()=>{playing=!playing;if(data.state.progress>=1)data.state.progress=0;$('play').textContent=playing?'Pause':'Play';last=performance.now();};
  $('expand').onclick=()=>api.postMessage({type:'open'});$('connect').onclick=()=>api.postMessage({type:'connect'});$('disconnect').onclick=()=>api.postMessage({type:'disconnect'});
  $('edit').onclick=()=>{if(!active()){$('editStatus').textContent='Select an individual path to edit.';return;}playing=false;$('play').textContent='Play';draft=structuredClone(active());edits=[];editControls();draw();};
  $('discard').onclick=()=>{draft=null;edits=[];editControls();refresh();};
  $('save').onclick=()=>{if(!draft||saving)return;saving=true;editControls();api.postMessage({type:'save',id:draft.id,hash:draft.hash,edits});};
  $('fit').onclick=()=>{camera={zoom:1,x:0,y:0};persist();draw();};
  canvas.addEventListener('wheel',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,o=origin(),s=scale(),px=(x-o.x)/s,py=(y-o.y)/s;camera.zoom=Math.min(12,Math.max(.5,camera.zoom*Math.exp(-e.deltaY*.001)));const next=origin();camera.x+=x-(next.x+px*scale());camera.y+=y-(next.y+py*scale());persist();draw();},{passive:false});
  canvas.onpointerdown=e=>{if(saving)return;if(draft){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let distance=10;draft.data.waypoints.forEach((w,index)=>{for(const target of ['anchor','prevControl','nextControl'])if(w[target]){const q=screen(w[target]),d=Math.hypot(q.x-x,q.y-y);if(d<distance){distance=d;editDrag={index,target};}}});}if(!editDrag)drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};canvas.setPointerCapture(e.pointerId);};
  function rebuildDraft(){let distance=0,previous=null;draft.samples=draft.samples.map(sample=>{const segment=Math.min(draft.data.waypoints.length-2,Math.floor(sample.pos)),t=sample.pos-segment,u=1-t,a=draft.data.waypoints[segment],b=draft.data.waypoints[segment+1],c=a.nextControl??a.anchor,d=b.prevControl??b.anchor;const x=u*u*u*a.anchor.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.anchor.x,y=u*u*u*a.anchor.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.anchor.y;if(previous)distance+=Math.hypot(x-previous.x,y-previous.y);previous={x,y};return {...sample,x,y,distance};});}
  canvas.onpointermove=e=>{if(editDrag&&draft){const r=canvas.getBoundingClientRect(),o=origin(),s=scale();let x=(e.clientX-r.left-o.x)/(200*s)-.5,y=8.57-(e.clientY-r.top-o.y)/(200*s);if(data.state.alliance==='red'){x=16.54-x;y=8.07-y;}const point={x:Math.max(-.5,Math.min(17.04,x)),y:Math.max(-.5,Math.min(8.57,y))},w=draft.data.waypoints[editDrag.index],old=w[editDrag.target];if(editDrag.target==='anchor')for(const key of ['prevControl','nextControl'])if(w[key]){w[key].x+=point.x-old.x;w[key].y+=point.y-old.y;}w[editDrag.target]={...old,...point};rebuildDraft();draw();return;}if(!drag)return;camera.x+=e.clientX-drag.x;camera.y+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;draw();};
  function endEdit(){if(editDrag&&draft){edits.push({...editDrag,point:{...draft.data.waypoints[editDrag.index][editDrag.target]}});editDrag=null;editControls();}}
  canvas.onpointerup=e=>{if(editDrag){endEdit();return;}if(!drag)return;const moved=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);drag=null;persist();if(moved<4&&!draft){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=null,distance=12;for(const p of auto()?routinePaths():data.paths)for(const sample of p.samples){const q=screen(sample),d=Math.hypot(q.x-x,q.y-y);if(d<distance){distance=d;best=p;}}if(best){data.state.path=best.id;data.state.progress=0;playing=false;post();refresh();}}};
  canvas.onpointercancel=()=>{endEdit();drag=null;};
  new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=window.devicePixelRatio||1;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}).observe(canvas);
  image.onload=draw;image.onerror=draw;
  function frame(now){if(playing&&!document.hidden){const total=playback().total;if(total>0){data.state.progress=Math.min(1,data.state.progress+(now-last)/1000/total);draw();if(now-tick>120){post();tick=now;}}else playing=false;if(data.state.progress>=1){playing=false;post();}$('play').textContent=playing?'Pause':'Play';}last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
  editControls();api.postMessage({type:'ready'});
})();
