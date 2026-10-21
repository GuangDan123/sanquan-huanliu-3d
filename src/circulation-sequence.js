/* One clock and persistent globe paths preserve the causal chain across all four stages. */
const CIRCULATION_SEQUENCE = {
  duration:40, starts:[0,12,23,33], root:null, flows:[], arrowLoops:[], labels:[], annotations:[], pressureCues:[], pressureWaves:[], clouds:[], accumulations:[], descentColumns:[], equatorAir:null, ascentColumns:[], fronts:[], bands:[], guides:[], parcel:null,
  secondStepBlendDuration:12,
  cameraMode:'overview', cameraActive:false, freeView:false, autoRidePending:false, cameraIntroStart:0,
  ambientElapsed:0, ambientPaused:false,
  highAltitude:1.45, pressureColors:{equator:0xffd447,subtropical:0x72d44a,subpolar:0x329bff,polar:0xb986ff}, inspectedNote:null,
  thermalColors:{hadley:{warm:0xffb52e,cold:0xb6dc45},ferrel:{warm:0xb6dc45,cold:0x16c8b5},polar:{warm:0x2586ff,cold:0x2586ff}},
  // Keep the second-step equatorial rise on the exact latitude used by the
  // first-step single-cell model, so the handoff has no spatial jump.
  cellLatitudes:{equatorEdge:2.5,hadleyEdge:28,ferrelEdge:32,ferrelFront:58,polarFront:62,frontSlope:12},
  cells:{hadley:['equator-rise','upper','parallel','sink','trade'],ferrel:['ferrel-sink','west','subpolar-rise','ferrel-upper'],polar:['polar-rise','polar-upper','polar-sink','polar-east']},
  phases:[
    {start:0,title:'地球开始自转，原有气流偏转并在高空断开',text:'地球开始自转的同时，原有赤道上升至低纬高空的气流开始偏转，并在高空转折处逐渐断开。原来继续通向极地、极地下沉和近地面返回的路径逐渐淡出；保留的气流向东偏转，继续连接高空积聚、下沉和回流。'},
    {start:4,title:'地转偏向力：北半球向右偏',text:'地球自转使北半球运动空气受到地转偏向力。以气流前进方向为准，北半球向右偏，南半球向左偏；风向改变后，偏向力的方向也随之改变。这里向北运动的高空气流逐渐转向东。青色箭头表示水平偏向方向，不表示下沉力。'},
    {start:10,title:'30°附近，高空风近似平行纬线',text:'在教材理想模型中，高空气流到达北纬30°附近时已明显向东偏转，逐渐成为偏西风，运动方向近似与纬线平行。它不再像无自转的单圈模型那样一直向北极输送。30°是近似位置，气流仍不断从低纬流入。'},
    {start:12,title:'高空气流在30°附近积聚',text:'低纬高空气流持续流入30°附近，而向更高纬度的输送减弱。教材用“高空气流积聚”概括这一环节。发光粒子变密表示空气汇入增多，并非地转偏向力把空气直接向下压。'},
    {start:15,title:'两支气流同步下沉，形成副热带高气压带',text:'低纬与中纬环流在30°附近的两条下沉支同步形成，共同对应副热带的下沉区。下沉向近地面补充空气质量，形成副热带高气压带。两条支路在纬度方向小幅错开，便于独立观察。中纬环流的其余路线随后展开；真实环流同时受辐射冷却与整体质量、动量收支影响，地转偏向力本身只改变水平运动方向。'},
    {start:19,title:'近地面分流，连接低纬环流',text:'副热带高压区的近地面气流向两侧流出。向赤道的气流在北半球右偏，形成东北信风；向较高纬度的气流右偏，形成盛行西风。赤道上升、高空输送、30°下沉和近地面回流连接成哈德莱环流。'},
    {start:23,title:'60°附近，冷暖气流交汇',text:'来自副热带的较暖西风与来自极地的较冷东风，在60°附近辐合。近地面空气汇聚，为后续抬升提供条件。这里的纬度是大尺度平均位置，不是一条固定的天气锋线。'},
    {start:27,title:'暖气流沿极锋爬升，中纬与高纬环流并行形成',text:'来自中纬度的较暖气流在60°附近遇到来自高纬度的冷气团。冷空气密度较大，位于下方；暖色气流沿倾斜的极锋持续向高纬侧、向高空爬升。中纬与高纬各自的上升支同步形成，到达高空后，两圈回流同时展开，分别连接30°附近与极地。三圈相邻支路在纬度方向小幅错开，各自闭合，便于独立观察；它们仍共同对应60°附近的辐合上升区。大尺度辐合上升形成动力性的副极地低气压带，蓝色纬向带随爬升逐渐显现。此处上升主要不是当地强烈受热造成的；极锋坡度和高空接点纬度为教学示意。'},
    {start:31,title:'极地冷却下沉，形成极地高气压带',text:'极地气温很低，空气冷却、密度增大并下沉。下沉向近地面补充空气质量，形成热力性的极地高气压带。紫色极冠随下沉逐渐显现；近地面空气向60°附近的低压区流出，偏转为极地东风。'},
    {start:33,title:'三圈已闭合，对照中纬与高纬环流',text:'中纬与高纬高空回流各自连接本圈的上升支与下沉支，两圈同步闭合。低纬、中纬、高纬是三条独立闭合的路线，各自的气流持续保留，连接处首尾相接。最后的镜头依次观察两圈的路线，演示结束后南北半球完整三圈环流同时显示，可自由拖动观察。费雷尔环流为间接环流。光带为平均环流示意，并非一团空气实际走遍三圈。'}
  ]
};
// 第三步的简化环流示意：复用前两步的宽幅 ribbon 流带，不带入第二步过程标注。
const THIRD_STEP_SCHEMATIC = {
  root:null, flows:[], arrows:[], elapsed:0
};
function sequenceElapsed(){return CIRCULATION_SEQUENCE.starts[STATE.mechanismStage]+STATE.mechanismDemo.elapsed;}
function sequenceDisplayedCurve(kind,h=1,e=sequenceElapsed()){
  const flow=CIRCULATION_SEQUENCE.flows.find(f=>f.kind===kind&&f.h===h);
  if(STATE.step===1&&e<CIRCULATION_SEQUENCE.secondStepBlendDuration&&['equator-rise','upper'].includes(kind)){
    const original=SINGLE_CIRCULATION.flows.find(f=>f.h===h&&f.index===(kind==='upper'?1:0));
    if(original)return singleTransitionCurve(original,smoothstep(clamp(e/CIRCULATION_SEQUENCE.secondStepBlendDuration,0,1)));
  }
  return flow.curve;
}
function sequenceAmbientRunning(){return STATE.step===1&&STATE.mechanismDemo.complete&&!CIRCULATION_SEQUENCE.ambientPaused&&!document.getElementById('sequence-explanation')?.open&&!LESSON_STATE.open;}
function sequencePhase(){const e=sequenceElapsed();const phase=CIRCULATION_SEQUENCE.phases.findLast(p=>e>=p.start);return {index:CIRCULATION_SEQUENCE.phases.indexOf(phase),text:phase.title,...phase};}
function sequencePoint(lat,lon,alt){const r=CONFIG.earth.radius+alt,a=degToRad(lat),b=-degToRad(lon);return new THREE.Vector3(r*Math.cos(a)*Math.cos(b),r*Math.sin(a),r*Math.cos(a)*Math.sin(b));}
function sequenceThermalProgress(kind,point,t,curve){
  const lat=Math.abs(Math.asin(point.y/point.length())*180/Math.PI),bounds=CIRCULATION_SEQUENCE.cellLatitudes;
  if(curve&&['upper','trade','west','ferrel-upper'].includes(kind)){
    const a=curve.getPoint(0),b=curve.getPoint(1),start=Math.abs(Math.asin(a.y/a.length())*180/Math.PI),end=Math.abs(Math.asin(b.y/b.length())*180/Math.PI);
    return clamp((lat-start)/(end-start),0,1);
  }
  if(kind==='upper')return clamp(lat/bounds.hadleyEdge,0,1);
  if(kind==='trade')return clamp(1-lat/bounds.hadleyEdge,0,1);
  if(kind==='west')return clamp((lat-bounds.ferrelEdge)/(bounds.ferrelFront-bounds.ferrelEdge),0,1);
  if(kind==='ferrel-upper')return clamp(1-(lat-bounds.ferrelEdge)/(bounds.ferrelFront-bounds.ferrelEdge),0,1);
  return t;
}
function sequenceRibbonWidth(kind,t){return .20+(['sink','ferrel-sink','subpolar-rise','polar-rise'].includes(kind)?.08:.40)*Math.sin(Math.PI*t);}
function sequencePressureColor(lat){const p=CIRCULATION_SEQUENCE.pressureColors,a=Math.abs(lat);return a<10?p.equator:a<45?p.subtropical:a<80?p.subpolar:p.polar;}
function createSequenceAnnotations(){
  const seq=CIRCULATION_SEQUENCE,layer=document.createElement('div');layer.id='sequence-annotations';document.body.append(layer);seq.annotationLayer=layer;
  const definitions=[
    ['equator-rise',.45,'↗','单圈起点：赤道上升支开始偏转','单圈开始偏转','第一步已经形成赤道上升支。加入地转偏向力后，单圈从这个起点开始扭曲；低纬环流沿同一位置接续展开，不重新播放受热上升过程。'],
    ['upper',.52,'↗','地转偏向力','高空气流偏转','赤道上升气流在高空向较高纬度运动，受到地转偏向力影响，逐渐获得向东分量。到30°附近时，风向近似与纬线平行。左右以气流前进方向为准，不能按屏幕的左右判断。地转偏向力改变水平运动方向，不是使空气下沉的力。'],
    ['parallel',.5,'→','30°高空，气流堆积','高空气流堆积','来自低纬的高空气流逐渐转为偏西风，在30°附近近似平行纬线。教材用高空气流积聚概括这一环节，随后发生大尺度下沉。积聚与下沉属于动力过程，地转偏向力本身不直接向下压空气。'],
    ['sink',.5,'↓','30°空气下沉，形成高压','30°气流下沉','高空气流在30°附近积聚，并与大尺度下沉相联系。下沉向近地面补充空气质量，使近地面空气柱的重量增加，形成动力性的副热带高气压带。绿色色带随下沉形成，近地面随后向赤道和60°附近分流。'],
    ['trade',.45,'↙','信风形成','信风形成','近地面空气从30°附近的副热带高压流向赤道低压。气压梯度力使气流趋向低压，地转偏向力使流向发生偏转；摩擦使近地面风斜穿等压线。'],
    ['west',.48,'↗','盛行西风形成','盛行西风','近地面空气从30°附近的副热带高压向60°附近的副极地低压流动，受地转偏向力影响，形成自西向东的盛行西风。中纬环流为间接环流，不能用当地受热上升解释整个环流。'],
    ['subpolar-rise',.5,'↑','60°冷暖相遇，暖气流抬升','暖气流沿锋面抬升','较暖的西风与较冷的极地东风在60°附近辐合。冷空气密度较大，暖空气沿倾斜极锋向高纬侧爬升。上升与高空质量输出相联系，形成动力性的副极地低气压带。蓝色色带随抬升渐显；这里不是因当地强烈受热而形成低压。'],
    ['ferrel-upper',.6,'↙','中纬高空：返回30°','高空返回30°','中纬气流在高空向30°附近返回，连接本圈的下沉支。近地面向高纬、高空向低纬、30°下沉和60°附近上升，共同组成独立闭合的费雷尔环流。'],
    ['polar-upper',.5,'↗','高纬高空：流向两极','高空流向两极','副极地附近上升的气流在高空向极地运动，随后冷却下沉，连接极地近地面气流。它与中纬高空回流同时形成，属于另一条独立闭合路线。'],
    ['polar-sink',.5,'↓','两极冷却，空气下沉','极地冷却下沉','极地气温低，空气强烈冷却，密度增大并下沉。下沉向近地面补充空气质量，形成热力性的极地高气压带。紫色极冠随下沉形成，近地面空气由极地高压流向60°附近的副极地低压。'],
    ['polar-east',.5,'↙','极地东风形成','极地东风','极地近地面空气从极地高压流向60°附近的副极地低压，受地转偏向力偏转，形成自东向西的极地东风；在副极地与较暖的西风交汇。']
  ];
  for(const h of [1,-1])for(const [kind,t,symbol,title,brief,detail] of definitions){
    const flow=seq.flows.find(f=>f.kind===kind&&f.h===h),button=document.createElement('button'),label=document.createElement('button'),leader=document.createElement('div'),el=document.createElement('div');
    const hemisphere=h===1?'北半球':'南半球',wind=kind==='trade'?(h===1?'东北信风':'东南信风'):kind==='west'?(h===1?'西南风':'西北风'):kind==='polar-east'?(h===1?'东北风':'东南风'):null;
    const deflection=h===1?'向右偏':'向左偏';
    const noteTitle=kind==='upper'?`地转偏向力：${hemisphere}${deflection}`:kind==='trade'?`${wind}：30°→赤道`:kind==='west'?'盛行西风：30°→60°':kind==='polar-east'?'极地东风：两极→60°':title;
    const caption=kind==='upper'?`${hemisphere}${deflection}`:kind==='trade'?wind:brief;
    const note={kind,h,t,flow,title:noteTitle,caption,detail:detail+(wind?`${hemisphere}气流${h===1?'向右':'向左'}偏转，形成${wind}。`:kind==='upper'?`${hemisphere}运动气流${h===1?'向右':'向左'}偏转。`:''),el,button,label,leader};
    el.className='sequence-note';el.hidden=true;el.dataset.kind=kind;el.dataset.hemisphere=h;button.className='sequence-note-marker';button.textContent=symbol;button.title=caption;button.setAttribute('aria-label',hemisphere+' · '+caption);
    label.className='sequence-note-label';const heading=document.createElement('strong');heading.textContent=caption;label.append(heading);leader.className='sequence-note-leader';
    const color=['equator-rise','sink','subpolar-rise','polar-sink'].includes(kind)?sequencePressureColor(kind==='equator-rise'?0:kind==='sink'?30:kind==='subpolar-rise'?60:90):flow.sourceColor.getHex();el.style.setProperty('--note-color','#'+color.toString(16).padStart(6,'0'));
    button.onclick=label.onclick=()=>pauseSequenceExplanation(note);
    button.onpointerenter=button.onfocus=()=>{seq.hoveredNote=note;};button.onpointerleave=button.onblur=()=>{if(seq.hoveredNote===note)seq.hoveredNote=null;};
    el.append(leader,button,label);layer.append(el);seq.annotations.push(note);
  }
}
function createSequenceKnowledgeMarkers(){
  const layer=CIRCULATION_SEQUENCE.annotationLayer;
  if(!layer)return;
  CIRCULATION_SEQUENCE.knowledgeMarkers=[];
  for(const h of [1,-1]){
    const button=document.createElement('button');
    button.type='button';button.className='sequence-knowledge-marker';button.textContent='极锋';
    button.setAttribute('aria-label',`${h===1?'北':'南'}半球极锋知识点`);button.hidden=true;
    button.onclick=()=>showKnowledge('polar-front');
    layer.append(button);CIRCULATION_SEQUENCE.knowledgeMarkers.push({button,h});
  }
}
function placeAnchoredSceneLabel(owner,el,anchor,bounds,occupied,obstacles=[],centered=false,avoidObstacles=false){
  const width=el.offsetWidth,height=el.offsetHeight;
  if(!width||!height)return null;
  const {left,right,top,bottom,key}=bounds;
  const rect=([dx,dy])=>({left:anchor.x+dx,right:anchor.x+dx+width,top:anchor.y+dy,bottom:anchor.y+dy+height});
  const overlaps=(r,a,gap=0)=>r.left<a.right+gap&&r.right>a.left-gap&&r.top<a.bottom+gap&&r.bottom>a.top-gap;
  const fits=r=>r.left>=left&&r.right<=right&&r.top>=top&&r.bottom<=bottom;
  const clear=r=>fits(r)&&!occupied.some(a=>overlaps(r,a,6));
  let placement=owner.annotationPlacement;
  if(!placement||placement.key!==key){
    const offsets=centered?[[-width/2,-height/2]]:owner.annotationAbove?[[30,-height-75],[-width-30,-height-75],[-width/2,75],[30,-height/2],[-width-30,-height/2]]:[[30,-height/2],[-width-30,-height/2],[-width/2,-height-30],[-width/2,30]];
    const offset=offsets.find(o=>clear(rect(o))&&!obstacles.some(a=>overlaps(rect(o),a,8)))||offsets.find(o=>clear(rect(o)))||offsets[0];
    placement=owner.annotationPlacement={key,width,height,offset};
  }
  // The offset stays attached to its anchor, even while hidden. Never seek a new slot during playback.
  const position=rect(placement.offset);
  if(!clear(position)||((centered||avoidObstacles)&&obstacles.some(a=>overlaps(position,a,avoidObstacles?8:0))))return null;
  occupied.push(position);return position;
}
function sequenceBandAnchorVisible(label){
  const seq=CIRCULATION_SEQUENCE,world=label.obj.getWorldPosition(new THREE.Vector3()),direction=world.clone().sub(camera.position),distance=direction.length();
  const ray=seq.labelRay||(seq.labelRay=new THREE.Raycaster());ray.set(camera.position,direction.normalize());ray.near=0;ray.far=distance-.025;
  const earth=seq.labelEarth||(seq.labelEarth=new THREE.Sphere(seq.root.position,CONFIG.earth.radius));earth.center.copy(seq.root.position);
  const hit=ray.ray.intersectSphere(earth,new THREE.Vector3());
  if(hit&&hit.distanceTo(camera.position)<ray.far)return false;
  return ray.intersectObjects(seq.bands.filter(b=>b!==label.band&&b.mesh.visible&&b.mesh.material.uniforms.uOpacity.value>.05).map(b=>b.mesh),false).length===0;
}
function updateSequenceAnnotations(){
  const seq=CIRCULATION_SEQUENCE;if(!seq.annotationLayer)return;
  seq.annotationLayer.hidden=STATE.step!==1||!STATE.showLabels||document.body.classList.contains('ui-hidden');if(seq.annotationLayer.hidden)return;
  const e=sequenceElapsed(),framing=getSceneFraming(),left=framing.left+6,right=framing.left+framing.availableW-6,top=100,bottom=framing.top+framing.availableH-8;
  const sample=sequenceRideSample(e),active=seq.inspectedNote||seq.annotations.find(n=>n.h===1&&n.kind===sample.kind),occupied=[],paths=[];
  const project=p=>{const w=seq.root.localToWorld(p.clone()),n=w.clone().project(camera);return {x:(n.x+1)*innerWidth/2,y:(1-n.y)*innerHeight/2,visible:n.z>-1&&n.z<1&&w.clone().sub(seq.root.position).dot(camera.position.clone().sub(w))>0};};
  const visibleFlows=[...seq.flows,...(e<seq.secondStepBlendDuration?SINGLE_CIRCULATION.flows:[])];
  for(const flow of visibleFlows.filter(f=>f.group.visible&&STATE.showPaths)){
    const progress=flow.owners.includes('single')?1:clamp((e-flow.start)/(flow.end-flow.start),0,1);let previous=null;
    for(let i=0;i<=100;i++){const p=project(flow.curve.getPoint(i/100*progress));if(previous?.visible&&p.visible)paths.push({left:Math.min(previous.x,p.x)-7,right:Math.max(previous.x,p.x)+7,top:Math.min(previous.y,p.y)-7,bottom:Math.max(previous.y,p.y)+7});previous=p;}
  }
  for(const column of [...seq.descentColumns,...seq.ascentColumns].filter(c=>c.group.visible)){
    const progress=column.warm?1:clamp((e-column.start)/(column.end-column.start),0,1);let previous=null;
    for(let i=0;i<=60;i++){const p=project(column.curve.getPoint(i/60*progress));if(previous?.visible&&p.visible)paths.push({left:Math.min(previous.x,p.x)-8,right:Math.max(previous.x,p.x)+8,top:Math.min(previous.y,p.y)-8,bottom:Math.max(previous.y,p.y)+8});previous=p;}
  }
  for(const cloud of [...seq.accumulations,seq.equatorAir].filter(c=>c?.group.visible)){
    const points=[cloud.center,...[-1,1].flatMap(sign=>[cloud.center.clone().addScaledVector(cloud.north,.66*cloud.scale*sign),cloud.center.clone().addScaledVector(cloud.east,.48*cloud.scale*sign),cloud.center.clone().addScaledVector(cloud.radial,.18*sign)])].map(project);
    if(points.some(p=>p.visible))paths.push({left:Math.min(...points.map(p=>p.x))-8,right:Math.max(...points.map(p=>p.x))+8,top:Math.min(...points.map(p=>p.y))-8,bottom:Math.max(...points.map(p=>p.y))+8});
  }
  const bounds={left,right,top,bottom,key:[innerWidth,innerHeight,seq.cameraMode,seq.annotationEpoch||0].join(':')};
  // Reserve the teaching callout before placing contextual pressure labels.
  const notes=seq.annotations.slice().sort((a,b)=>(b===active)-(a===active));
  for(const note of notes){
    const curve=sequenceDisplayedCurve(note.kind,note.h,e),anchor=curve.getPoint(note.t),world=seq.root.localToWorld(anchor.clone()),ndc=world.clone().project(camera),x=(ndc.x+1)*innerWidth/2,y=(1-ndc.y)*innerHeight/2;
    const visible=e>note.flow.start+.1&&STATE.showPaths&&ndc.z>-1&&ndc.z<1&&x>left+10&&x<right-10&&y>top+10&&y<bottom-10&&world.clone().sub(seq.root.position).dot(camera.position.clone().sub(world))>0&&(!seq.cameraActive||note.h===1);
    note.el.hidden=!visible;if(!visible)continue;
    note.el.style.left=x+'px';note.el.style.top=y+'px';note.el.classList.toggle('is-current',note===active);
    note.button.style.left='-15px';note.button.style.top='0px';
    const showText=note===active&&e<40||note===seq.hoveredNote||note===seq.inspectedNote;
    note.label.hidden=!showText;note.leader.hidden=true;if(!showText)continue;
    const placement=placeAnchoredSceneLabel(note,note.label,{x,y},bounds,occupied,paths);
    note.label.hidden=!placement;note.leader.hidden=!placement;
    if(placement){note.label.style.left=placement.left-x+'px';note.label.style.top=placement.top-y+'px';const tx=clamp(x,placement.left,placement.right),ty=clamp(y,placement.top,placement.bottom),dx=tx-x,dy=ty-y;note.leader.style.width=Math.hypot(dx,dy)+'px';note.leader.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;}
  }
  for(const label of seq.labels.filter(l=>l.obj.visible).sort((a,b)=>Number(!!b.pressure)-Number(!!a.pressure))){
    const el=label.obj.element,anchor=project(label.obj.position),position=placeAnchoredSceneLabel(label,el,anchor,bounds,occupied,label.pressure?[]:paths,true);
    el.style.visibility=position?'':'hidden';
    if(position)el.style.transform=`translate(${position.left}px,${position.top}px)`;
  }
  for(const wave of seq.pressureWaves){
    const el=wave.word,anchor=project(wave.center);
    const visible=wave.mesh.visible&&anchor.visible&&anchor.x>left+10&&anchor.x<right-10&&anchor.y>top+10&&anchor.y<bottom-10;
    el.hidden=!visible;if(!visible)continue;
    const position=placeAnchoredSceneLabel(wave,el,anchor,bounds,occupied,paths);
    el.hidden=!position;if(position){el.style.left=position.left+'px';el.style.top=position.top+'px';}
  }
  for(const marker of seq.knowledgeMarkers||[]){
    const flow=seq.flows.find(f=>f.kind==='subpolar-rise'&&f.h===marker.h);
    if(!flow){marker.button.hidden=true;continue;}
    const point=flow.curve.getPoint(.5),world=seq.root.localToWorld(point.clone()),ndc=world.clone().project(camera),x=(ndc.x+1)*innerWidth/2,y=(1-ndc.y)*innerHeight/2;
    const visible=flow.group.visible&&e>=flow.start+.1&&ndc.z>-1&&ndc.z<1&&x>left+12&&x<right-12&&y>top+12&&y<bottom-12&&world.clone().sub(seq.root.position).dot(camera.position.clone().sub(world))>0&&(!seq.cameraActive||marker.h===1);
    marker.button.hidden=!visible;
    if(visible){marker.button.style.left=x+'px';marker.button.style.top=y+'px';}
  }
}
function createSequencePressureCues(){
  const seq=CIRCULATION_SEQUENCE;
  for(const h of [1,-1])for(const [kind,lat,start,end,high] of [['equator-rise',0,0,4,false],['sink',30,15,19,true],['subpolar-rise',60,27,30,false],['polar-sink',90,31,33,true]]){
    const flow=seq.flows.find(f=>f.kind===kind&&f.h===h),foot=flow.curve.getPoint(high?1:0),baseLat=Math.asin(foot.y/foot.length())*180/Math.PI,lon=-Math.atan2(foot.z,foot.x)*180/Math.PI,positions=[];
    for(let i=0;i<36;i++){const a=i*2.39996,r=.3*Math.sqrt((i+.5)/36);const p=sequencePoint(clamp(baseLat+Math.sin(a)*r*3,-89.8,89.8),lon+Math.cos(a)*r*7,.10+(i%4)*.025);positions.push(p.x,p.y,p.z);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const mesh=new THREE.Points(geometry,new THREE.PointsMaterial({color:sequencePressureColor(lat),size:.13,map:particleTexture,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));seq.root.add(mesh);seq.pressureCues.push({mesh,h,kind,start,end,high});
  }
}
function updateSequencePressureCues(e){
  for(const cue of CIRCULATION_SEQUENCE.pressureCues){const p=clamp((e-cue.start)/(cue.end-cue.start),0,1),openingEquator=cue.kind==='equator-rise'&&e<CIRCULATION_SEQUENCE.secondStepBlendDuration;cue.mesh.visible=STATE.showParticles&&e>cue.start&&e<cue.end+.8&&!openingEquator;cue.mesh.geometry.setDrawRange(0,Math.round(cue.high?8+28*p:36-28*p));cue.mesh.material.opacity=.45+.3*p;}
}
function createSequencePressureWaves(){
  const seq=CIRCULATION_SEQUENCE;
  for(const [lat,lon,high,start,end] of [[30,66,true,17,19],[-30,78,true,17,19],[0,0,false,.5,4]]){
    const center=sequencePoint(lat,lon,.16),radial=center.clone().normalize(),east=new THREE.Vector3(radial.z,0,-radial.x).normalize(),north=radial.clone().cross(east).normalize(),radius=.9;
    const geometry=new THREE.CircleGeometry(1,96),positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++){const point=center.clone().addScaledVector(east,positions.getX(i)*radius).addScaledVector(north,positions.getY(i)*radius).setLength(center.length());positions.setXYZ(i,point.x,point.y,point.z);}
    geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{uColor:{value:new THREE.Color(sequencePressureColor(lat))},uRadii:{value:[0,0,0,0]},uAlpha:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uRadii[4];uniform float uAlpha;void main(){float r=length((vUv-.5)*2.0),rings=0.0;for(int i=0;i<4;i++){float wave=uRadii[i];float edge=1.0-smoothstep(.005,.017,abs(r-wave));float fade=smoothstep(.10,.22,wave)*(1.0-smoothstep(.84,1.0,wave));rings=max(rings,edge*fade);}gl_FragColor=vec4(mix(uColor,vec3(1.0),.22),rings*uAlpha);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      }`});
    const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=6;mesh.visible=false;seq.root.add(mesh);
    const word=document.createElement('div');word.className='sequence-pressure-wave-word';word.textContent=high?'高压':'低压';word.dataset.pressure=high?'high':'low';word.hidden=true;seq.annotationLayer.append(word);
    seq.pressureWaves.push({lat,lon,high,start,end,radius,center,mesh,word,phases:[]});
  }
}
function updateSequencePressureWaves(e,motionTime){
  for(const wave of CIRCULATION_SEQUENCE.pressureWaves){
    const progress=smoothstep(clamp((e-wave.start)/(wave.end-wave.start),0,1));wave.mesh.visible=STATE.showPressure&&progress>0;wave.mesh.material.uniforms.uAlpha.value=.8*progress;
    wave.phases=Array.from({length:4},(_,i)=>(((motionTime-wave.start)*.30+i/4)%1+1)%1);
    wave.mesh.material.uniforms.uRadii.value=wave.phases.map(t=>.12+.88*(wave.high?t:1-t));
    if(!wave.mesh.visible)wave.word.hidden=true;
  }
}
function createSequenceAccumulations(){
  const seq=CIRCULATION_SEQUENCE;
  const regions=[{h:1,lat:30,lon:66,alt:seq.highAltitude+.16},{h:-1,lat:-30,lon:78,alt:seq.highAltitude+.16},{h:0,lat:0,lon:0,alt:seq.highAltitude+.08,warm:true}];
  for(const {h,lat,lon,alt,warm=false} of regions){
    const color=warm?seq.thermalColors.hadley.warm:seq.thermalColors.hadley.cold,cloudColor=warm?color:0xd9ed8c;
    const center=sequencePoint(lat,lon,alt),radial=center.clone().normalize(),east=new THREE.Vector3(radial.z,0,-radial.x).normalize(),north=radial.clone().cross(east).normalize();
    const group=new THREE.Group();seq.root.add(group);group.visible=false;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(144*3),3));
    const particles=new THREE.Points(geometry,new THREE.PointsMaterial({color:cloudColor,size:.105,map:particleTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));particles.frustumCulled=false;group.add(particles);seq.clouds.push(particles);
    const puffs=[];
    for(let i=0;i<9;i++){
      const angle=i*2.39996,r=i===0?0:.375*Math.sqrt(i/9),offset=north.clone().multiplyScalar(Math.cos(angle)*r).addScaledVector(east,Math.sin(angle)*r*.65).addScaledVector(radial,Math.sin(i*1.7)*.05);
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:particleTexture,color:cloudColor,transparent:true,opacity:0,depthWrite:false}));sprite.position.copy(center).add(offset);group.add(sprite);puffs.push({sprite,offset});
    }
    const cloud={h,lon,warm,scale:warm?1.5:2,center,radial,east,north,group,particles,puffs};if(warm)seq.equatorAir=cloud;else seq.accumulations.push(cloud);
    if(warm){
      const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:particleTexture,color,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));
      halo.position.copy(sequencePoint(0,0,1.85));halo.scale.set(3.8,1.75,1);group.add(halo);
    }
    for(const offset of [-.75,.75]){
      const curve=new SequenceCurve(t=>sequencePoint(warm?offset:h*(30+offset),lon,warm?.14+(seq.highAltitude-.14)*t:seq.highAltitude+.16-(seq.highAltitude+.16-.14)*t));
      const columnGroup=new THREE.Group();seq.root.add(columnGroup);columnGroup.visible=false;
      const geometry=new THREE.TubeGeometry(curve,80,.058,10,false),material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
        uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){float edge=.4+.6*pow(abs(cos(vUv.y*6.2831853)),2.0);gl_FragColor=vec4(uColor,uOpacity*edge);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        }`});
      const beam=new THREE.Mesh(geometry,material);columnGroup.add(beam);
      const arrows=[];for(let i=0;i<4;i++){
        const helper=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.16,warm?color:0xe4ffaf,.09,.072);
        for(const part of [helper.line,helper.cone]){part.material.transparent=true;part.material.opacity=.92;part.material.depthWrite=false;}columnGroup.add(helper);arrows.push({helper,t:0});
      }
      (warm?seq.ascentColumns:seq.descentColumns).push({h,offset,warm,curve,group:columnGroup,beam,arrows,start:warm?0:15,end:warm?4:19});
    }
  }
}
function updateSequenceAccumulations(e,motionTime){
  const seq=CIRCULATION_SEQUENCE,build=smoothstep(clamp((e-12)/3,0,1)),settle=1-.35*smoothstep(clamp((e-19)/4,0,1));
  for(const cloud of [...seq.accumulations,seq.equatorAir]){
    // Retain the completed equatorial ascent instead of replaying its buildup.
    const rise=1,strength=cloud.warm?1:build*settle;
    cloud.group.visible=STATE.showParticles&&(cloud.warm||e>12);const points=cloud.particles.geometry.attributes.position;
    cloud.particles.geometry.setDrawRange(0,Math.round(cloud.warm?24+120*rise:24+120*build));cloud.particles.material.opacity=(cloud.warm?.28:.34)*strength;
    for(let i=0;i<points.count;i++){
      const angle=i*2.39996,mix=(i+.5)/points.count,r=.51*cloud.scale*Math.sqrt(mix)*(cloud.warm?1+.25*rise:1.6-.6*build),pulse=.018*Math.sin(motionTime*1.3+i*.8);
      const point=cloud.center.clone().addScaledVector(cloud.north,Math.cos(angle)*(r+pulse)).addScaledVector(cloud.east,Math.sin(angle)*r*.62).addScaledVector(cloud.radial,Math.sin(i*1.37)*.105);
      points.setXYZ(i,point.x,point.y,point.z);
    }points.needsUpdate=true;
    cloud.puffs.forEach(({sprite,offset},i)=>{const size=cloud.scale*(cloud.warm?1+.2*rise:.65+.35*build);sprite.position.copy(cloud.center).addScaledVector(offset,cloud.scale*(cloud.warm?1+.25*rise:.72+.28*build));sprite.scale.set((i===0?1.05:.45+.09*Math.sin(i*1.9))*size,(i===0?.57:.33)*size,1);sprite.material.opacity=(i===0?.45:.36)*strength;});
  }
  for(const column of [...seq.descentColumns,...seq.ascentColumns]){
    const progress=column.warm?1:clamp((e-column.start)/(column.end-column.start),0,1);column.group.visible=STATE.showPaths&&progress>0;
    column.beam.geometry.setDrawRange(0,Math.floor(progress*80)*10*6);column.beam.material.uniforms.uOpacity.value=column.warm?.19:.18*settle;
    column.arrows.forEach((arrow,i)=>{
      const t=(((motionTime-column.start)*.32+i/column.arrows.length)%1+1)%1,point=column.curve.getPoint(t),direction=column.curve.getTangent(t).normalize();arrow.t=t;
      arrow.helper.visible=column.group.visible&&t>.045&&t<Math.min(.96,progress-.03);arrow.helper.position.copy(point).addScaledVector(direction,-.08);arrow.helper.setDirection(direction);
    });
  }
}
class SequenceCurve extends THREE.Curve {
  constructor(sample){super();this.sample=sample;}
  getPoint(t,target=new THREE.Vector3()){return target.copy(this.sample(t));}
}
function roundSequenceJunctions(definitions,cells=CIRCULATION_SEQUENCE.cells){
  for(const h of [1,-1])for(const kinds of Object.values(cells)){
    const legs=kinds.map(kind=>definitions.find(d=>d.args[4]===kind&&d.args[5]===h));
    for(let i=0;i<legs.length;i++){
      const incoming=legs[i],outgoing=legs[(i+1)%legs.length],a=incoming.raw,b=outgoing.raw;
      // Preserve the shared equatorial origin. The low-latitude branch must
      // begin exactly where the deflected single-cell ascent begins.
      if(incoming.args[4]==='trade'&&outgoing.args[4]==='equator-rise')continue;
      if(a.getTangent(1).dot(b.getTangent(0))>.995)continue;
      const trim=Math.min(.42,a.getLength()*.22,b.getLength()*.22),ta=a.getUtoTmapping(0,a.getLength()-trim),tb=b.getUtoTmapping(0,trim);
      const start=a.getPoint(ta),end=b.getPoint(tb),handle=trim*.55,inTangent=a.getTangent(ta),outTangent=b.getTangent(tb),c1=start.clone().addScaledVector(inTangent,handle),c2=end.clone().addScaledVector(outTangent,-handle);
      const r0=start.length(),r1=r0+inTangent.dot(start.clone().normalize())*handle,r3=end.length(),r2=r3-outTangent.dot(end.clone().normalize())*handle;
      // Round on the spherical shell so ground-level bends never cut into Earth.
      const arc=t=>{const u=1-t,p=start.clone().multiplyScalar(u*u*u).addScaledVector(c1,3*u*u*t).addScaledVector(c2,3*u*t*t).addScaledVector(end,t*t*t),radius=r0*u*u*u+r1*3*u*u*t+r2*3*u*t*t+r3*t*t*t;return p.normalize().multiplyScalar(radius);};
      incoming.tail={t:ta,arc};outgoing.head={t:tb,arc};
    }
    for(const leg of legs){leg.curve=new SequenceCurve(t=>{
      if(leg.head&&t<leg.head.t)return leg.head.arc(.5+.5*t/leg.head.t);
      if(leg.tail&&t>leg.tail.t)return leg.tail.arc(.5*(t-leg.tail.t)/(1-leg.tail.t));
      return leg.raw.getPoint(t);
    });leg.curve.roundedJoins={head:leg.head?.t,tail:leg.tail?.t};}
  }
}
function createCirculationAtmosphere(){
  // 辉光壳半径随第三步环流示意一起放大（R+2.6=7.6），保证抬升后的环流带仍包在大气层内。
  return new THREE.Mesh(new THREE.SphereGeometry(CONFIG.earth.radius+2.6,64,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,blending:THREE.AdditiveBlending,
    uniforms:{uColor:{value:new THREE.Color(0x78ccff)}},
    vertexShader:'varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader:`varying vec3 vNormal;varying vec3 vView;uniform vec3 uColor;void main(){float rim=pow(1.0-clamp(dot(normalize(vNormal),normalize(vView)),0.0,1.0),3.0);gl_FragColor=vec4(uColor,.025+.42*rim);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    }`}));
}
function createAirflowVisual(root,{sample,start,end,color,kind,h,lon,endColor=color,curve=new SequenceCurve(sample),sourceCurve=curve,cells=CIRCULATION_SEQUENCE.cells,thermalProgress=sequenceThermalProgress,thermalPalette=null,ribbonWidth=sequenceRibbonWidth,streamline=false,closed=false,sectionNormal=new THREE.Vector3(0,0,1)}){
    const group=new THREE.Group();root.add(group);
    // A translucent ribbon with feathered edges reads as air, rather than a solid pipe.
    const owners=Object.keys(cells).filter(cell=>cells[cell].includes(kind));
    const positions=[],centers=[],uvs=[],thermalMix=[],indices=[],across=8,segments=100;
    for(let i=0;i<=segments;i++){
      const t=i/segments,center=curve.getPoint(t),width=ribbonWidth(kind,t);
      const side=curve.getTangent(t).cross(closed?sectionNormal:new THREE.Vector3(Math.cos(degToRad(80)),.15,-Math.sin(degToRad(80)))).normalize();
      for(let j=0;j<=across;j++){const p=center.clone().addScaledVector(side,(j/across-.5)*width);if(p.length()<CONFIG.earth.radius+.045)p.setLength(CONFIG.earth.radius+.045);positions.push(p.x,p.y,p.z);centers.push(center.x,center.y,center.z);uvs.push(t,j/across);thermalMix.push(thermalProgress(kind,center,t,curve));}
    }
    for(let i=0;i<segments;i++)for(let j=0;j<across;j++){const a=i*(across+1)+j,b=a+across+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const ribbonGeometry=new THREE.BufferGeometry();ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));ribbonGeometry.setAttribute('center',new THREE.Float32BufferAttribute(centers,3));ribbonGeometry.setAttribute('thermalMix',new THREE.Float32BufferAttribute(thermalMix,1));ribbonGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));ribbonGeometry.setIndex(indices);
    const palette=thermalPalette?.map(c=>new THREE.Color(c));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      defines:{...(palette?{THERMAL_PALETTE:1}:{}),...(streamline?{STREAMLINE:1}:{})},
      blending:streamline?THREE.AdditiveBlending:THREE.NormalBlending,
      uniforms:{uColor:{value:new THREE.Color(color)},uEndColor:{value:new THREE.Color(endColor)},uPalette:{value:palette||[]},uTime:{value:0},uOpacity:{value:.36},uWidth:{value:1},uStreamline:{value:1}},
      vertexShader:'attribute vec3 center;attribute float thermalMix;uniform float uWidth;varying vec2 vUv;varying float vThermal;void main(){vUv=uv;vThermal=thermalMix;gl_Position=projectionMatrix*modelViewMatrix*vec4(center+(position-center)*uWidth,1.0);}',
      fragmentShader:`varying vec2 vUv;varying float vThermal;uniform vec3 uColor;uniform vec3 uEndColor;uniform float uTime;uniform float uOpacity;uniform float uStreamline;
      #ifdef THERMAL_PALETTE
      uniform vec3 uPalette[4];
      #endif
      void main(){float d=abs(vUv.y-.5);float edge=exp(-18.0*d*d);float wave=.5+.5*sin(vUv.x*19.0-uTime*1.15);vec3 color=mix(uColor,uEndColor,vThermal);
      #ifdef THERMAL_PALETTE
      color=vThermal<.333333?mix(uPalette[0],uPalette[1],vThermal*3.0):vThermal<.666667?mix(uPalette[1],uPalette[2],vThermal*3.0-1.0):mix(uPalette[2],uPalette[3],vThermal*3.0-2.0);
      #endif
      #ifdef STREAMLINE
      edge=mix(edge,exp(-42.0*d*d)*(1.0-smoothstep(.35,.5,d)),uStreamline);wave=mix(wave,1.0,uStreamline);
      #endif
      gl_FragColor=vec4(color,edge*uOpacity*(.65+.35*pow(wave,3.0)));
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      }`});
    const ribbon=new THREE.Mesh(ribbonGeometry,material);group.add(ribbon);
    const filamentGeometry=new THREE.TubeGeometry(curve,100,.025,4,closed),filamentColors=[];
    for(let i=0;i<=100;i++){const t=i/100,mix=thermalProgress(kind,curve.getPoint(t),t,curve),index=Math.min(2,Math.floor(mix*3)),c=palette?palette[index].clone().lerp(palette[index+1],mix*3-index):new THREE.Color(color).lerp(new THREE.Color(endColor),mix);for(let j=0;j<=4;j++)filamentColors.push(c.r,c.g,c.b);}
    filamentGeometry.setAttribute('color',new THREE.Float32BufferAttribute(filamentColors,3));
    const filament=new THREE.Mesh(filamentGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.8,depthWrite:false}));group.add(filament);
    const tubes=[filament];
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(42*3),3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(42*3),3));
    const particles=new THREE.Points(geometry,new THREE.PointsMaterial({vertexColors:true,size:.10,map:particleTexture,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending}));particles.frustumCulled=false;group.add(particles);
    return {curve,sourceCurve,sourceColor:new THREE.Color(color),endColor:new THREE.Color(endColor),owners,group,tubes,ribbon,particles,start,end,kind,h,lon,ribbonWidth,thermalProgress,thermalPalette,sectionNormal};
}
// Trace the red outlines in the user's 1196 x 1082 image, then mirror south.
const THIRD_STEP_REFERENCE={
  hadley:[[256,533],[200,533],[149,531],[131,515],[127,493],[138,462],[156,430],[184,397],[216,370],[248,350],[276,343],[299,349],[311,363],[311,387],[305,420],[296,459],[289,493],[279,519]],
  ferrel:[[289,323],[276,308],[277,283],[289,255],[310,225],[337,195],[366,172],[398,152],[432,136],[457,127],[470,130],[471,140],[459,168],[447,204],[433,242],[414,268],[388,294],[359,315],[331,326],[307,329]],
  polar:[[477,220],[468,215],[469,190],[480,161],[497,135],[521,114],[552,99],[583,86],[613,81],[634,82],[649,94],[657,111],[659,138],[658,165],[653,178],[628,181],[598,184],[565,192],[531,202],[501,210]]
};
function fitThirdStepTracedOutline(samples,low,high,groundRadius){
  const sourceAngles=samples.map(p=>Math.atan2(p.y,-p.x));
  const axis=(Math.min(...sourceAngles)+Math.max(...sourceAngles))/2;
  const axisX=-Math.cos(axis),axisY=Math.sin(axis);
  const bounds=offset=>{
    let min=Infinity,max=-Infinity,inner=Infinity;
    samples.forEach(p=>{
      const x=p.x+axisX*offset,y=p.y+axisY*offset,angle=Math.atan2(y,-x);
      min=Math.min(min,angle);max=Math.max(max,angle);inner=Math.min(inner,Math.hypot(x,y));
    });
    return {min,max,inner};
  };
  const targetSpan=degToRad(high-low);
  let start=0,end=Math.max(...samples.map(p=>p.length()))*4;
  // Translation and uniform scale preserve the traced contour's proportions.
  for(let i=0;i<40;i++){
    const middle=(start+end)/2,extent=bounds(middle);
    if(extent.max-extent.min>targetSpan)start=middle;else end=middle;
  }
  const extent=bounds(end),scale=groundRadius/extent.inner;
  const rotation=degToRad((low+high)/2)-(extent.min+extent.max)/2;
  return point=>{
    const x=point.x+axisX*end,y=point.y+axisY*end;
    const latitude=Math.atan2(y,-x)+rotation,radius=Math.hypot(x,y)*scale;
    return {latitude,radius};
  };
}
function createThirdStepSchematic(){
  const s=THIRD_STEP_SCHEMATIC,root=new THREE.Group();root.position.x=SCENE_OFFSET_X;root.visible=false;scene.add(root);s.root=root;
  const atmosphere=earthGroup.userData.sequenceAtmosphere[1];
  const atmosphereRadius=atmosphere.geometry.parameters.radius;
  const atmosphereHorizontal=atmosphereRadius*Math.min(atmosphere.scale.x,atmosphere.scale.z);
  const atmosphereVertical=atmosphereRadius*atmosphere.scale.y;
  const meridian=degToRad(30),sectionNormal=new THREE.Vector3(Math.sin(meridian),0,Math.cos(meridian));
  const outlines=Object.fromEntries(Object.entries(THIRD_STEP_REFERENCE).map(([name,points])=>[
    name,new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x-646,552-y,0)),true,'centripetal')
  ]));
  // riseEdge 指明该圈"上升端"在低纬侧还是高纬侧：哈德莱与极地环流在低纬侧上升，
  // 费雷尔环流是间接环流，在 60° 一侧上升、在 30° 一侧下沉，上升端因此在高纬侧。
  // palette 的四个色标一律按「上升端 → 下沉端」排列，取色进度 0 落在上升端、1 落在下沉端：
  //   低纬：赤道橙红（上升）→ 30° 浅蓝（下沉）；
  //   中纬：60° 深蓝（上升）→ 30° 浅蓝（下沉）；
  //   极地：60° 深蓝（上升）→ 90° 紫（下沉）。
  const defs=[
    {name:'hadley',top:30,low:0,riseEdge:'low',palette:[0xff5538,0xffb52e,0x83d5f2,0x72c5ed],width:.58},
    {name:'ferrel',top:60,low:30,riseEdge:'high',palette:[0x315fc4,0x4781d2,0x5ca3df,0x72c5ed],width:.52,latitudeOffset:1,surfaceClearance:.48},
    {name:'polar',top:90,low:60,riseEdge:'low',palette:[0x315fc4,0x4781d2,0x6579df,0x7855ce],width:.46}
  ];
  for(const h of [1,-1])for(const d of defs){
    const reference=THIRD_STEP_REFERENCE[d.name];
    const spline=outlines[d.name];
    spline.arcLengthDivisions=1000;
    const referenceSamples=spline.getPoints(1024);
    const latitudes=referenceSamples.map(p=>Math.abs(Math.atan2(p.y,-p.x)*180/Math.PI));
    const latitudeLow=Math.min(...latitudes),latitudeHigh=Math.max(...latitudes);
    const latitudeAt=point=>degToRad(lerp(d.low+1.5,d.top-1.5,
      (Math.atan2(point.y,-point.x)*180/Math.PI-latitudeLow)/(latitudeHigh-latitudeLow))+(d.latitudeOffset||0));
    const innerRadius=Math.min(...referenceSamples.map(p=>Math.hypot(p.x,p.y)));
    const groundRadius=CONFIG.earth.radius+(d.surfaceClearance??.65);
    const tracedFit=d.name==='ferrel'?fitThirdStepTracedOutline(referenceSamples,d.low+1.5+d.latitudeOffset,d.top-1.5+d.latitudeOffset,groundRadius):null;
    const envelopeScale=1-(d.width/2+.06)/Math.min(atmosphereHorizontal,atmosphereVertical);
    let radialGain=Infinity;
    referenceSamples.forEach(point=>{
      const height=Math.hypot(point.x,point.y)-innerRadius;
      if(height<=1e-6)return;
      const latitude=latitudeAt(point);
      const boundary=envelopeScale/Math.hypot(Math.cos(latitude)/atmosphereHorizontal,Math.sin(latitude)/atmosphereVertical);
      radialGain=Math.min(radialGain,(boundary-groundRadius)/height);
    });
    const baseCurve=new SequenceCurve(t=>{
      const point=spline.getPointAt(d.name==='ferrel'?1-t:t);
      const fitted=tracedFit?.(point);
      const latitude=fitted?.latitude??latitudeAt(point);
      const radius=fitted?.radius??(groundRadius+(Math.hypot(point.x,point.y)-innerRadius)*radialGain);
      // A true meridional section keeps geographic latitude correct as the camera tilts.
      const horizontal=radius*Math.cos(latitude);
      return point.set(-horizontal*Math.cos(meridian),h*radius*Math.sin(latitude),horizontal*Math.sin(meridian));
    });
    const curve=new SequenceCurve(t=>seasonalSchematicPoint(baseCurve.getPoint(t)));
    curve.getTangent=(t,target=new THREE.Vector3())=>target.copy(curve.getPoint((t+.0001)%1)).sub(curve.getPoint((t-.0001+1)%1)).normalize();
    curve.arcLengthDivisions=1000;
    // 颜色只标示"处在环流的哪一段"，不按高度取色：
    // 进度 0 在上升端、1 在下沉端；两个端点正好分居纬度两端，所以只由纬度判定即可。
    // 若掺入高度权重，赤道上升支的顶部会被染冷、30° 下沉支的底部反而偏暖，与升降阶段正好错位。
    const thermalProgress=(k,p,t)=>{
      const diagramPoint=spline.getPointAt(d.name==='ferrel'?1-t:t);
      const latitude=Math.abs(Math.atan2(diagramPoint.y,-diagramPoint.x)*180/Math.PI);
      const along=(latitude-latitudeLow)/(latitudeHigh-latitudeLow||1);
      return clamp(d.riseEdge==='high'?1-along:along,0,1);
    };
    const flow=createAirflowVisual(root,{curve,start:0,end:1,color:d.palette[0],endColor:d.palette[3],kind:'schematic-'+d.name,h,lon:0,cells:{[d.name]:['schematic-'+d.name]},thermalProgress,thermalPalette:d.palette,ribbonWidth:()=>d.width,streamline:false,closed:true,sectionNormal});
    flow.baseCurve=baseCurve;
    flow.seasonAttributes=[flow.ribbon.geometry.attributes.position,flow.ribbon.geometry.attributes.center,...flow.tubes.map(mesh=>mesh.geometry.attributes.position)]
      .map(attribute=>({attribute,base:Float32Array.from(attribute.array)}));
    flow.reference={pixels:reference,spline};
    flow.group.visible=true;flow.ribbon.material.uniforms.uOpacity.value=.5;flow.tubes[0].material.opacity=.9;
    const arrows=[];
    for(let i=0;i<2;i++){
      const segments=20,geometry=new THREE.BufferGeometry(),indices=[];
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((segments+1)*6),3));
      for(let j=0;j<segments;j++){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      geometry.setIndex(indices);
      const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:d.palette[0],transparent:true,opacity:.95,depthWrite:false,side:THREE.DoubleSide}));
      mesh.frustumCulled=false;root.add(mesh);arrows.push({mesh,phase:i/3,segments});
    }
    s.flows.push(flow);s.arrows.push({flow,arrows,palette:d.palette.map(c=>new THREE.Color(c)),thermalProgress});
  }
  root.traverse(obj=>{if(!obj.material)return;const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach(m=>{m.depthTest=true;m.depthWrite=false;});obj.renderOrder=3;});
  window.__threeStepSchematicDebug={schematic:s};
}
function seasonalSchematicPoint(point){
  if(!STATE.seasonalShift)return point;
  const radius=point.length(),latitude=Math.asin(clamp(point.y/radius,-1,1))*180/Math.PI;
  const shifted=degToRad(seasonalLatitude(latitude)),longitude=Math.atan2(point.z,point.x),ring=radius*Math.cos(shifted);
  return point.set(ring*Math.cos(longitude),radius*Math.sin(shifted),ring*Math.sin(longitude));
}
function syncThirdStepSeason(){
  const s=THIRD_STEP_SCHEMATIC;if(!s.root||s.seasonalShift===STATE.seasonalShift)return;
  s.seasonalShift=STATE.seasonalShift;
  const point=new THREE.Vector3();
  for(const flow of s.flows){
    // Refit the original geometry each frame so polar loops can contract and
    // expand without accumulating drift or changing their circulation colors.
    for(const {attribute,base} of flow.seasonAttributes){
      if(!STATE.seasonalShift)attribute.array.set(base);
      else for(let i=0;i<base.length;i+=3){
        seasonalSchematicPoint(point.fromArray(base,i));point.toArray(attribute.array,i);
      }
      attribute.needsUpdate=true;
    }
    flow.curve.updateArcLengths();
    flow.ribbon.geometry.computeBoundingSphere();
    flow.tubes.forEach(mesh=>mesh.geometry.computeBoundingSphere());
  }
}
function updateThirdStepSchematic(dt){
  const s=THIRD_STEP_SCHEMATIC;if(!s.root)return;
  syncThirdStepSeason();
  s.elapsed+=Math.min(dt,.1)*Math.max(STATE.speed||1,0.25);
  s.flows.forEach(flow=>{flow.group.visible=s.root.visible&&STATE.showPaths;flow.ribbon.material.uniforms.uTime.value=s.elapsed*2.2;});
  s.arrows.forEach(({flow,arrows,palette,thermalProgress})=>arrows.forEach(a=>{
    a.phase=(a.phase+dt*.055*Math.max(STATE.speed||1,.25))%1;
    const t=flow.curve.getUtoTmapping(a.phase),p=flow.curve.getPoint(t);
    const scaled=thermalProgress(flow.kind,p,t,flow.curve)*3,index=Math.min(2,Math.floor(scaled)),color=palette[index].clone().lerp(palette[index+1],scaled-index);
    // Bend the whole arrow along the loop, including its head at tight corners.
    const positions=a.mesh.geometry.attributes.position,span=.34/flow.curve.getLength();
    for(let j=0;j<=a.segments;j++){
      const progress=j/a.segments,u=(a.phase-(1-progress)*span+1)%1;
      const center=flow.curve.getPointAt(u),side=flow.curve.getTangentAt(u).cross(flow.sectionNormal).normalize();
      const halfWidth=progress<.4?.012:.08*(1-progress)/.6;
      for(let k=0;k<2;k++){
        const vertex=center.clone().addScaledVector(side,(k===0?-1:1)*halfWidth);
        positions.setXYZ(j*2+k,vertex.x,vertex.y,vertex.z+.035);
      }
    }
    positions.needsUpdate=true;
    a.mesh.material.color.copy(color);a.mesh.visible=s.root.visible&&STATE.showPaths;
  }));
}
function setThirdStepSchematicVisible(v){
  if(!THIRD_STEP_SCHEMATIC.root)return;
  THIRD_STEP_SCHEMATIC.root.visible=v;
  if(v) updateThirdStepSchematic(0);
}
function faceThirdStepSchematic(){
  const s=THIRD_STEP_SCHEMATIC,root=s.root;if(!root?.visible)return;
  // Match the earlier steps: keep the section on the left meridian while
  // preserving Earth's north/south axis and the camera's real perspective.
  const az=Math.atan2(camera.position.z-earthGroup.position.z,camera.position.x-earthGroup.position.x);
  root.rotation.set(0,Math.PI/2-az,0);
  root.scale.setScalar(1);
}
window.__thirdStepSchematic={create:createThirdStepSchematic,setVisible:setThirdStepSchematicVisible,update:updateThirdStepSchematic,faceCamera:faceThirdStepSchematic,syncSeason:syncThirdStepSeason};
function layoutThirdStepBeltLabels(){
  const items=[...pressureLabels,...windLabels];
  if(STATE.step!==2){
    items.forEach(({obj})=>{obj.element.style.visibility='';obj.element.classList.remove('third-step-callout');});
    return;
  }
  const center=earthGroup.position.clone().project(camera),cx=(center.x+1)*innerWidth/2,cy=(1-center.y)*innerHeight/2;
  const distance=camera.position.distanceTo(earthGroup.position),focal=innerHeight/(2*Math.tan(degToRad(camera.fov/2)))*camera.zoom;
  const earthRadius=CONFIG.earth.radius;
  const radius=focal*earthRadius/Math.sqrt(Math.max(1,distance*distance-earthRadius**2))-2;
  const occupied=latLabels.filter(({obj})=>obj.visible&&obj.element.style.display!=='none')
    .map(({obj})=>obj.element.getBoundingClientRect());
  // Keep the original surface anchors; hide labels that cannot fit without overlap.
  for(const {obj} of items){
    const el=obj.element;el.classList.add('third-step-callout');el.style.visibility='';
    if(!obj.visible||el.style.display==='none')continue;
    const rect=el.getBoundingClientRect();
    const onGlobe=[rect.left,rect.right].every(x=>[rect.top,rect.bottom].every(y=>Math.hypot(x-cx,y-cy)<=radius));
    const overlaps=occupied.some(other=>rect.left<other.right+4&&rect.right>other.left-4&&rect.top<other.bottom+4&&rect.bottom>other.top-4);
    if(!onGlobe||overlaps)el.style.visibility='hidden';
    else occupied.push(rect);
  }
}
function createCirculationSequence(){
  const seq=CIRCULATION_SEQUENCE,root=new THREE.Group();root.position.x=SCENE_OFFSET_X;root.visible=false;scene.add(root);seq.root=root;
  root.add(new THREE.HemisphereLight(0xe7f5ff,0x668c7f,.6));
  const atmosphere=createCirculationAtmosphere();root.add(atmosphere);seq.atmosphere=atmosphere;
  const definitions=[],flow=(...args)=>{const raw=new SequenceCurve(args[0]);definitions.push({args,raw,curve:raw});return raw;};
  const buildFlow=(sample,start,end,color,kind,h,lon,endColor=color,curve=new SequenceCurve(sample),sourceCurve=curve)=>{
    const inherited=['equator-rise','upper'].includes(kind);let flow;
    flow=createAirflowVisual(root,{sample,start,end,color,kind,h,lon,endColor,curve,sourceCurve,...(inherited?{ribbonWidth:(kind,t)=>lerp(.34,sequenceRibbonWidth(kind,t),flow?.inheritedAppearance??0),streamline:true}:{})});seq.flows.push(flow);return curve;
  };
  const {equatorEdge,hadleyEdge,ferrelEdge,ferrelFront,polarFront,frontSlope}=seq.cellLatitudes;
  // Adjacent boundaries sit two degrees either side of their nominal pressure belt.
  const upper=(t,h,lon,alt=seq.highAltitude)=>sequencePoint(h*(equatorEdge+(hadleyEdge-equatorEdge)*(2*t-t*t)),lon*smoothstep(t)+48*t*t,alt);
  for(const h of [1,-1]){
    const lon=h===1?0:12,frontTopLat=ferrelFront+frontSlope,polarTopLat=polarFront+frontSlope;
    for(const strand of [1]){
      const l=lon+(strand-1)*3.5,alt=seq.highAltitude+(strand-1)*.07,lowWarm=seq.thermalColors.hadley.warm,temperate=seq.thermalColors.hadley.cold,midCold=seq.thermalColors.ferrel.cold,polarCold=seq.thermalColors.polar.cold;
      const surfaceAlt=CONFIG.particles.surfaceAlt;
      // Keep the low-latitude rise on the same equatorial meridian as the
      // single-cell origin; the handoff then continues into this branch.
      flow(t=>sequencePoint(equatorEdge*h,0,surfaceAlt+(alt-surfaceAlt)*t),0,4,lowWarm,'equator-rise',h,0);
      const curve=flow(t=>upper(t,h,l,alt),4,12,lowWarm,'upper',h,l,temperate);
      flow(t=>sequencePoint(hadleyEdge*h,l+48+18*t,alt),12,15,temperate,'parallel',h,l);
      flow(t=>sequencePoint(hadleyEdge*h,l+66,alt-(alt-surfaceAlt)*t),15,19,temperate,'sink',h,l);
      flow(t=>sequencePoint(h*(equatorEdge+(hadleyEdge-equatorEdge)*(1-t)),(l+66)*(1-smoothstep(t)),surfaceAlt),19,23,temperate,'trade',h,l,lowWarm);
      flow(t=>sequencePoint(ferrelEdge*h,l+66,alt-(alt-.08)*t),15,19,temperate,'ferrel-sink',h,l);
      flow(t=>sequencePoint(h*(ferrelEdge+(ferrelFront-ferrelEdge)*t),l+66+26*smoothstep(t),.08),23,27,temperate,'west',h,l,midCold);
      flow(t=>sequencePoint(h*(90-(90-polarFront)*t),l+120-28*smoothstep(t),.08),23,27,polarCold,'polar-east',h,l);
      flow(t=>sequencePoint(h*(ferrelFront+frontSlope*smoothstep(t)),l+92,.08+(alt-.08)*smoothstep(t)),27,30,midCold,'subpolar-rise',h,l);
      flow(t=>sequencePoint(h*(polarFront+frontSlope*smoothstep(t)),l+92,.08+(alt-.08)*smoothstep(t)),27,30,polarCold,'polar-rise',h,l);
      flow(t=>sequencePoint(h*(polarTopLat+(90-polarTopLat)*t),l+92+28*smoothstep(t),alt),30,33,polarCold,'polar-upper',h,l);
      flow(t=>sequencePoint(90*h,l+120,alt-(alt-.08)*t),31,33,polarCold,'polar-sink',h,l);
      // Both upper branches form together, each joined to its own ascent and descent.
      flow(t=>sequencePoint(h*(frontTopLat-(frontTopLat-ferrelEdge)*t),l+92-26*smoothstep(t),alt),30,33,midCold,'ferrel-upper',h,l,temperate);
      if(h===1&&lon===0&&strand===1)seq.upperCurve=curve;
    }
    // The cold-air wedge remains directly beneath the midlatitude sloping ascent.
    const vertices=[sequencePoint(ferrelFront*h,lon+89.5,.08),sequencePoint(frontTopLat*h,lon+89.5,.08),sequencePoint(frontTopLat*h,lon+89.5,seq.highAltitude),sequencePoint(ferrelFront*h,lon+94.5,.08),sequencePoint(frontTopLat*h,lon+94.5,.08),sequencePoint(frontTopLat*h,lon+94.5,seq.highAltitude)];
    const frontGeometry=new THREE.BufferGeometry().setFromPoints(vertices);frontGeometry.setIndex([0,1,2,3,5,4,0,2,5,0,5,3,1,4,5,1,5,2,0,3,4,0,4,1]);frontGeometry.computeVertexNormals();
    const front=new THREE.Mesh(frontGeometry,new THREE.MeshBasicMaterial({color:0x8fbfee,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));root.add(front);seq.fronts.push({mesh:front,h});
  }
  roundSequenceJunctions(definitions);
  for(const d of definitions){const [sample,start,end,color,kind,h,lon,endColor=color]=d.args;buildFlow(sample,start,end,color,kind,h,lon,endColor,d.curve,d.raw);}
  seq.upperCurve=seq.flows.find(f=>f.kind==='upper'&&f.h===1).curve;
  createSequenceAccumulations();
  for(const h of [1,-1])for(const [cell,kinds] of Object.entries(seq.cells)){
    const flows=kinds.map(kind=>seq.flows.find(f=>f.h===h&&f.kind===kind)),lengths=flows.map(f=>f.curve.getLength()),total=lengths.reduce((a,b)=>a+b,0),count={hadley:4,ferrel:3,polar:2}[cell],arrows=[];
    for(let i=0;i<count;i++){
      const helper=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.34,seq.thermalColors[cell].cold,.20,.16);
      for(const part of [helper.line,helper.cone]){part.material.transparent=true;part.material.opacity=.95;part.material.depthWrite=false;}
      helper.visible=false;root.add(helper);arrows.push({helper,flow:null,t:0});
    }
    const seed=cell==='polar'?total-lengths.at(-1):0;
    seq.arrowLoops.push({cell,h,flows,lengths,total,seed,start:cell==='hadley'?0:cell==='ferrel'?15:23,arrows});
  }
  for(const lat of [0,30,-30]){
    const curve=new SequenceCurve(t=>sequencePoint(lat,360*t,lat===0?.025:.15));
    const material=lat===0?new THREE.LineBasicMaterial({color:0xe5decd,transparent:true,opacity:.45}):new THREE.LineDashedMaterial({color:0xdbe9ff,transparent:true,opacity:.8,dashSize:.16,gapSize:.10});
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(360)),material);if(lat!==0)line.computeLineDistances();root.add(line);seq.guides.push({line,lat});
  }
  const refs=[];for(let i=0;i<=90;i++)refs.push(sequencePoint(i,0,seq.highAltitude));
  const reference=new THREE.Line(new THREE.BufferGeometry().setFromPoints(refs),new THREE.LineDashedMaterial({color:0xaabbc9,transparent:true,opacity:.18,dashSize:.16,gapSize:.14}));reference.computeLineDistances();root.add(reference);seq.reference=reference;
  seq.parcel=new THREE.Mesh(new THREE.SphereGeometry(.10,12,8),new THREE.MeshBasicMaterial({color:0xffe0ae}));root.add(seq.parcel);
  seq.velocity=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.55,0xffce9f,.2,.12);
  seq.force=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),.55,0x65e5eb,.2,.12);root.add(seq.velocity,seq.force);
  for(const [lat,text,start,alt,lon] of [[0,'赤道',0,.05,8],[30,'30°N',0,.05,8],[60,'60°N',23,.05,8],[-30,'30°S',0,.05,20],[-60,'60°S',23,.05,20]]){
    const el=document.createElement('div');el.className='sequence-label';el.textContent=text;const obj=new CSS2DObject(el);obj.position.copy(sequencePoint(lat,lon,alt));root.add(obj);seq.labels.push({obj,start});
  }
  // A complete latitude band appears with the vertical motion that forms it.
  // The equatorial belt belongs to the handoff: let the single-cell path
  // deform first, then reveal the belt as the low-latitude route takes over.
  for(const [lat,name,start,end] of [[0,'赤道低气压带',4,12],[30,'副热带高气压带',15,19],[-30,'副热带高气压带',15,19],[60,'副极地低气压带',27,30],[-60,'副极地低气压带',27,30],[85,'极地高气压带',31,33],[-85,'极地高气压带',31,33]]){
    const high=name.includes('高'),color=sequencePressureColor(lat);
    const vertices=[],uv=[],indices=[],width=Math.abs(lat)>80?8:5,cols=160,rows=8;
    for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++){const p=sequencePoint(lat+(j/rows-.5)*width,360*i/cols,.12);vertices.push(p.x,p.y,p.z);uv.push(i/cols,j/rows);}
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const a=i*(rows+1)+j,b=a+rows+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){gl_FragColor=vec4(uColor,uOpacity);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    }`});
    const mesh=new THREE.Mesh(geometry,material),band={mesh,lat,start,end};root.add(mesh);seq.bands.push(band);
    const el=document.createElement('div');el.className='sequence-label sequence-pressure-label';el.textContent=name+(high?' ↓':' ↑');el.style.color='#'+color.toString(16).padStart(6,'0');el.style.borderColor=el.style.color;
    const obj=new CSS2DObject(el);obj.position.copy(sequencePoint(lat,100,.14));
    root.add(obj);seq.labels.push({obj,start,end,pressure:true,lat,onBand:true,band});
  }
  createSequenceAnnotations();createSequenceKnowledgeMarkers();createSequencePressureCues();createSequencePressureWaves();
  const dialog=document.createElement('dialog');dialog.id='sequence-explanation';dialog.setAttribute('aria-labelledby','sequence-explanation-title');
  dialog.innerHTML='<small id="sequence-explanation-time"></small><h3 id="sequence-explanation-title"></h3><p id="sequence-explanation-text"></p><small>暂停时可拖动地球或缩放，气流保持静止。</small><div class="sequence-dialog-actions"><button class="btn" id="sequence-close">保持暂停</button><button class="btn" id="sequence-continue">继续播放</button></div>';
  document.body.append(dialog);dialog.querySelector('#sequence-close').onclick=()=>dialog.close();dialog.querySelector('#sequence-continue').onclick=()=>{dialog.close();playMechanismDemo();};
  window.__circulationSequenceDebug={sequence:seq,seek:seekCirculationSequence,phase:sequencePhase,elapsed:sequenceElapsed,update:updateCirculationSequence,cameraMode:setSequenceCameraMode,route:sequenceRideSample};
}
function sequenceDuration(stage=STATE.mechanismStage){return (CIRCULATION_SEQUENCE.starts[stage+1]??40)-CIRCULATION_SEQUENCE.starts[stage];}
function seekCirculationSequence(time,play=false){
  const e=clamp(time,0,40),stage=Math.max(0,CIRCULATION_SEQUENCE.starts.findLastIndex(s=>e>=s)),changed=stage!==STATE.mechanismStage;
  STATE.mechanismStage=stage;STATE.demoMode='continuous';STATE.mechanismDemo={elapsed:e-CIRCULATION_SEQUENCE.starts[stage],running:play&&e<40,complete:e===40,node:0};STATE.playing=play&&e<40;
  CIRCULATION_SEQUENCE.ambientElapsed=0;CIRCULATION_SEQUENCE.ambientPaused=false;CIRCULATION_SEQUENCE.inspectedNote=null;
  CIRCULATION_SEQUENCE.annotationEpoch=(CIRCULATION_SEQUENCE.annotationEpoch||0)+1;
  document.getElementById('sequence-explanation')?.close();
  if(changed&&STATE.step===1)updateStepPanel(1);
  syncCirculationSequence();updateSequenceUI();
}
function replayCirculationSequence(){
  const seq=CIRCULATION_SEQUENCE;
  releaseSequenceCamera();
  if(seq.freeLens){camera.near=seq.freeLens.near;camera.fov=seq.freeLens.fov;camera.updateProjectionMatrix();seq.freeLens=null;}
  viewAnimation++;CLASSROOM.focusAnimation++;
  seq.cameraMode='overview';seq.freeView=false;
  seekCirculationSequence(0,false);
  // Restart at the same teaching state as entering step two: a complete,
  // stationary single cell. The learner starts the three-cell formation
  // explicitly after seeing this baseline again.
  setView('reset');
  // Show the stationary baseline, then follow the air as playback begins.
  seq.cameraMode='overview';seq.autoRidePending=true;seq.cameraIntroStart=0;
  showTeachingIntro(1);
}
function pauseSequenceExplanation(note=null){
  note=note?.flow?note:null;CIRCULATION_SEQUENCE.inspectedNote=note;
  CIRCULATION_SEQUENCE.ambientPaused=true;
  STATE.playing=false;STATE.mechanismDemo.running=false;const p=sequencePhase(),dialog=document.getElementById('sequence-explanation');
  if(!dialog)return;
  document.getElementById('sequence-explanation-time').textContent=`进度 ${sequenceElapsed().toFixed(1)} / 40 秒`;
  document.getElementById('sequence-explanation-title').textContent=note?`${note.h===1?'北半球':'南半球'} · ${note.title}`:p.title;document.getElementById('sequence-explanation-text').textContent=note?note.detail:p.text;
  if(!dialog.open)dialog.show();dialog.scrollTop=0;document.getElementById('sequence-continue').disabled=false;updateSequenceUI();
}
function renderSequencePanel(body,controls,navigation){
  const titles=['高空右偏','30°下沉分流','60°交汇抬升','三圈归纳'];
  document.getElementById('sp-title').textContent=titles[STATE.mechanismStage];
  body.innerHTML='<div class="mechanism-actions"><button class="btn" id="mechanism-reveal">暂停并解释</button></div>';
  controls.innerHTML=`<div class="mechanism-demo"><div class="sequence-stages">${titles.map((title,i)=>`<button type="button" data-sequence-stage="${i}" title="${title}">${i+1} · ${title}</button>`).join('')}</div><input class="sequence-timeline" id="sequence-timeline" type="range" min="0" max="40" step=".1" value="${sequenceElapsed()}" aria-label="形成过程进度"><div class="sequence-time"><span id="sequence-time"></span><span>40 秒</span></div><div class="mechanism-actions"><button class="btn" id="mechanism-demo-play">播放过程</button><button class="btn" id="mechanism-demo-replay">从头重播</button></div></div>`;
  controls.querySelector('.mechanism-demo').insertAdjacentHTML('afterbegin','<div class="sequence-cell-key"><span title="低纬：橙黄为暖，黄绿为冷"><i class="hadley"></i>低纬</span><span title="中纬：黄绿为暖，蓝绿色为冷"><i class="ferrel"></i>中纬</span><span title="高纬：全部为蓝色冷气流"><i class="polar"></i>高纬</span></div>');
  controls.querySelector('.sequence-cell-key').insertAdjacentHTML('afterend','<div class="sequence-pressure-key"><span><i style="background:#ffd447"></i>赤道</span><span><i style="background:#72d44a"></i>30°</span><span><i style="background:#329bff"></i>60°</span><span><i style="background:#b986ff"></i>两极</span></div>');
  navigation.innerHTML='<button class="btn" id="mechanism-prev">第一步</button><button class="btn" id="mechanism-next">第三步</button>';
  document.getElementById('mechanism-reveal').onclick=pauseSequenceExplanation;
  document.getElementById('mechanism-demo-play').onclick=()=>{if(STATE.mechanismDemo.running&&STATE.playing||sequenceAmbientRunning())pauseSequenceExplanation();else playMechanismDemo();};
  document.getElementById('mechanism-demo-replay').onclick=replayCirculationSequence;
  document.querySelectorAll('[data-sequence-stage]').forEach(b=>b.onclick=()=>setMechanismStage(Number(b.dataset.sequenceStage)));
  document.getElementById('sequence-timeline').oninput=e=>seekCirculationSequence(Number(e.target.value));
  document.getElementById('mechanism-prev').onclick=()=>transitionToStep(0);
  document.getElementById('mechanism-next').onclick=()=>transitionToStep(2);
  updateSequenceUI();
}
function updateSequenceUI(){
  if(STATE.step!==1)return;const seq=CIRCULATION_SEQUENCE,e=sequenceElapsed(),p=sequencePhase(),demo=STATE.mechanismDemo,playing=demo.running&&STATE.playing;
  const set=(id,text)=>{const el=document.getElementById(id);if(el&&el.textContent!==text)el.textContent=text;};
  set('sequence-time',`${e.toFixed(1)} 秒${playing?'':demo.complete?' · 完成':' · 已暂停'}`);
  const explanation=document.getElementById('sequence-explanation');
  if(explanation){
    if(innerWidth<=600){const panel=document.getElementById('step-panel').getBoundingClientRect(),control=document.getElementById('control-panel').getBoundingClientRect();explanation.style.setProperty('--explanation-top',panel.top+'px');explanation.style.setProperty('--explanation-height',Math.max(120,control.top-panel.top-12)+'px');}
    else{explanation.style.removeProperty('--explanation-top');explanation.style.removeProperty('--explanation-height');}
  }
  set('mechanism-demo-play',demo.complete?(seq.ambientPaused?'继续流动':'暂停并解释'):playing?'暂停并解释':e>0?'继续过程':'播放过程');
  set('mechanism-prev','第一步');set('mechanism-next','第三步');
  const range=document.getElementById('sequence-timeline');if(range&&document.activeElement!==range)range.value=e;
  document.querySelectorAll('[data-sequence-stage]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.sequenceStage)===STATE.mechanismStage?'step':'false'));
}
function syncCirculationSequence(){
  const seq=CIRCULATION_SEQUENCE,active=STATE.step===1;document.body.classList.toggle('sequence-active',STATE.step===1);
  const atmosphere=earthGroup.userData.sequenceAtmosphere||[];
  if(seq.sceneStyled!==active){
    if(active){seq.atmosphereVisible=SINGLE_CIRCULATION.styled?[...SINGLE_CIRCULATION.atmosphereVisible]:atmosphere.map(m=>m.visible);atmosphere.forEach(m=>m.visible=false);STATE.showPressure=true;document.getElementById('tog-pressure').classList.add('active');}
    else {releaseSequenceCamera();if(seq.freeLens){camera.near=seq.freeLens.near;camera.fov=seq.freeLens.fov;camera.updateProjectionMatrix();seq.freeLens=null;}atmosphere.forEach((m,i)=>m.visible=seq.atmosphereVisible?.[i]??true);if(gridGroup)gridGroup.visible=STATE.showGrid;}
    seq.sceneStyled=active;
  }
  if(!seq.root){if(!active)return;createCirculationSequence();}seq.root.visible=active;if(seq.annotationLayer)seq.annotationLayer.hidden=!active;
  document.getElementById('flow-legend').hidden=true;document.getElementById('coriolis-comparison').hidden=true;document.getElementById('polar-front').hidden=true;
  mechanismGroups.forEach(g=>g.visible=false);mechanismLabels.forEach(({obj})=>obj.visible=false);
  if(!active){seq.freeView=false;seq.labels.forEach(({obj})=>obj.visible=false);document.getElementById('sequence-explanation').close();return;}
  singleCellGroup.visible=false;Object.values(threeCellGroups).forEach(g=>g.visible=false);
  // Keep the physical globe grid visible while the sequence is active. The
  // airflow reference lines alone are too faint to establish latitude and
  // longitude in the opening frame.
  if(gridGroup)gridGroup.visible=STATE.showGrid;
  latLabels.forEach(({obj})=>obj.visible=false);
  coriolisNodes.forEach(n=>n.group.visible=false);coriolisLabels.forEach(l=>l.obj.visible=false);showDeflectionIndicators(false);
  if(STATE.step===1)pressureBeltMeshes.forEach(m=>m.visible=false);
  renderSequenceFlows();
}
function renderSequenceFlows(){
  const seq=CIRCULATION_SEQUENCE,e=sequenceElapsed(),motionTime=e+seq.ambientElapsed;
  if(!seq.cameraActive&&!seq.freeView){const az=Math.atan2(camera.position.z,camera.position.x-SCENE_OFFSET_X);seq.root.rotation.y=-(az+degToRad(80));}
  seq.root.updateMatrixWorld(true);
  const explaining=!!document.getElementById('sequence-explanation')?.open;
  const signature=[STATE.step,e,motionTime,STATE.showGrid,STATE.showPaths,STATE.showParticles,STATE.showPressure,STATE.showLabels,STATE.lowPerf,STATE.density,explaining,seq.cameraActive].join('|');
  if(seq.lastSignature===signature){updateSequenceLabels(e);return;}seq.lastSignature=signature;
  for(const f of seq.flows){
    seq.activeCell=e<=23?'hadley':e<30?'ferrel':e<38?'polar':'ferrel';
    const retainedLow=e>23&&seq.cells.hadley.includes(f.kind);
    const retainedMid=e>=30&&seq.cells.ferrel.includes(f.kind);
    const retainedPolar=e>=38&&seq.cells.polar.includes(f.kind);
    const allowed=f.kind==='ferrel-sink'&&e>15||seq.cells[seq.activeCell].includes(f.kind)||retainedLow||retainedMid||retainedPolar||(e>23&&e<30&&seq.cells.polar.includes(f.kind));
    const p=clamp((e-f.start)/(f.end-f.start),0,1);f.group.visible=allowed&&p>0&&(STATE.showPaths||STATE.showParticles);
    const current=e<=f.end+2,context=e<40&&retainedLow&&!seq.cells[seq.activeCell].includes(f.kind)?.65:1;
    // One visible ascent and upper line: the original meshes deform until
    // their geometry matches this route, then ownership switches in one frame.
    const inherited=['equator-rise','upper'].includes(f.kind),lowBranchStarted=!seq.cells.hadley.includes(f.kind)||e>=seq.secondStepBlendDuration;
    const focus=(inherited&&e<23||current||e>=23?1:.68)*(f.h===-1&&e<33?.75:1)*context;
    const appearance=smoothstep(clamp((e-seq.secondStepBlendDuration)/3,0,1));
    if(inherited&&f.inheritedAppearance!==appearance){f.inheritedAppearance=appearance;updateSequenceFlowGeometry(f,f.curve);}
    if(inherited){f.ribbon.material.uniforms.uStreamline.value=1-appearance;f.ribbon.material.blending=appearance===1?THREE.NormalBlending:THREE.AdditiveBlending;}
    f.ribbon.visible=STATE.showPaths&&!STATE.lowPerf;
    f.group.visible=f.group.visible&&lowBranchStarted;
    f.ribbon.geometry.setDrawRange(0,Math.floor(p*100)*8*6);f.ribbon.material.uniforms.uTime.value=motionTime;f.ribbon.material.uniforms.uOpacity.value=(inherited&&appearance<1?lerp(.32,.85,appearance):.85)*focus;f.ribbon.material.uniforms.uWidth.value=inherited?lerp(2,seq.cameraActive?1.1:1.25,appearance):seq.cameraActive?1.1:1.25;
    const baseColor=f.sourceColor;f.ribbon.material.uniforms.uColor.value.copy(baseColor);
    f.tubes.forEach((mesh,i)=>{mesh.visible=STATE.showPaths&&(!STATE.lowPerf||i===0);mesh.geometry.setDrawRange(0,Math.floor(p*100)*5*6);});
    // A colored core keeps the wider ribbon readable against clouds and the atmosphere.
    f.tubes[0].geometry.setDrawRange(0,Math.floor(p*100)*4*6);f.tubes[0].material.opacity=(inherited?lerp(.95,.8,appearance):.8)*focus;
    f.particles.visible=STATE.showParticles&&p>0;f.particles.material.size=seq.cameraActive?.07:.10;
    const positions=f.particles.geometry.attributes.position,colors=f.particles.geometry.attributes.color;
    const density=STATE.density==='sparse'?.45:STATE.density==='dense'?1:.75,count=Math.max(5,Math.floor(positions.count*density*(STATE.lowPerf?.4:1)));f.particles.geometry.setDrawRange(0,count);f.particles.material.opacity=(seq.cameraActive?.10:.24)*focus;
    for(let i=0;i<count;i++){
      // A deterministic time offset freezes every strand exactly when paused or scrubbed.
      const t=((motionTime*.14+i/count)%1)*p,point=f.curve.getPoint(t),color=baseColor.clone().lerp(f.endColor,sequenceThermalProgress(f.kind,point,t,f.curve));positions.setXYZ(i,point.x,point.y,point.z);colors.setXYZ(i,color.r,color.g,color.b);
    }
    positions.needsUpdate=true;colors.needsUpdate=true;
  }
  renderSequenceArrows(e,motionTime);
  updateSequencePressureCues(e);
  updateSequencePressureWaves(e,motionTime);
  updateSequenceAccumulations(e,motionTime);
  seq.fronts.forEach(({mesh})=>{const opacity=.28*smoothstep(clamp((e-26)/1,0,1))*(1-smoothstep(clamp((e-30)/1,0,1)));mesh.visible=STATE.showPaths&&opacity>0;mesh.material.opacity=opacity;});
  seq.guides.forEach(({line,lat})=>line.visible=lat===0?STATE.showPaths:STATE.showGrid);
  seq.bands.forEach(({mesh,start,end})=>{const progress=smoothstep(clamp((e-start)/(end-start),0,1));mesh.visible=STATE.showPressure&&progress>0;mesh.material.uniforms.uOpacity.value=.92*progress;});
  const p=clamp((e-4)/8,0,1),displayedUpper=sequenceDisplayedCurve('upper',1,e),pos=displayedUpper.getPoint(p),radial=pos.clone().normalize(),velocity=displayedUpper.getTangent(p).normalize();velocity.addScaledVector(radial,-velocity.dot(radial)).normalize();
  const ride=sequenceRideSample(e);seq.parcel.position.copy(seq.cameraActive?ride.point:pos);seq.parcel.visible=STATE.showParticles&&(seq.cameraActive?!ride.transferring:e>=4&&e<15);
  seq.velocity.position.copy(pos);seq.velocity.setDirection(velocity);seq.velocity.visible=!seq.cameraActive&&STATE.showPaths&&explaining&&e>=4&&e<15;
  seq.force.position.copy(pos);seq.force.setDirection(velocity.clone().cross(radial).normalize());seq.force.visible=!seq.cameraActive&&STATE.showPaths&&explaining&&e>4&&e<15;
  seq.reference.visible=false;
  updateSequenceLabels(e);
  if(STATE.step===2){
    seq.labels.forEach(({obj})=>obj.visible=false);
    seq.bands.forEach(({mesh})=>mesh.visible=false);
    seq.guides.forEach(({line})=>line.visible=false);
    seq.fronts.forEach(({mesh})=>mesh.visible=false);
    seq.pressureWaves.forEach(({mesh,word})=>{mesh.visible=false;word.hidden=true;});
    [...seq.accumulations,seq.equatorAir].forEach(cloud=>{if(cloud?.group)cloud.group.visible=false;});
    [...seq.ascentColumns,...seq.descentColumns].forEach(column=>{if(column?.group)column.group.visible=false;});
    if(seq.parcel)seq.parcel.visible=false;
    if(seq.velocity)seq.velocity.visible=false;
    if(seq.force)seq.force.visible=false;
    if(seq.annotationLayer)seq.annotationLayer.hidden=true;
  }
}
function renderSequenceArrows(e,motionTime){
  // Use the fixed complete loop; growing reveal lengths must never redistribute arrows.
  for(const loop of CIRCULATION_SEQUENCE.arrowLoops){
    for(const [i,arrow] of loop.arrows.entries()){
      let distance=(Math.max(0,motionTime-loop.start)*.45+loop.seed+i/loop.arrows.length*loop.total)%loop.total,index=0;
      arrow.loopDistance=distance;
      while(index<loop.flows.length-1&&distance>=loop.lengths[index])distance-=loop.lengths[index++];
      const f=loop.flows[index],progress=clamp((e-f.start)/(f.end-f.start),0,1),t=f.curve.getUtoTmapping(0,distance),point=f.curve.getPoint(t),direction=f.curve.getTangent(t).normalize();
      arrow.flow=f;arrow.t=t;arrow.helper.visible=f.group.visible&&STATE.showPaths&&t<=progress+1e-6&&(!STATE.lowPerf||i%2===0)&&(progress===1||distance>=.34);
      arrow.helper.position.copy(point).addScaledVector(direction,-.34);arrow.helper.setDirection(direction);
      arrow.helper.setColor(f.sourceColor.clone().lerp(f.endColor,sequenceThermalProgress(f.kind,point,t,f.curve)));
      for(const part of [arrow.helper.line,arrow.helper.cone])part.material.opacity=Math.min(1,f.ribbon.material.uniforms.uOpacity.value+.15);
    }
  }
}
function updateSequenceLabels(e){
  const framing=getSceneFraming(),left=framing.left+16,right=framing.left+framing.availableW-16,top=100+10,bottom=framing.top+framing.availableH-18;
  CIRCULATION_SEQUENCE.labels.forEach(label=>{
    const {obj,start,end,pressure}=label;
    const projected=obj.getWorldPosition(new THREE.Vector3()).project(camera),x=(projected.x+1)*innerWidth/2,y=(1-projected.y)*innerHeight/2;
    const inFrame=projected.z>-1&&projected.z<1&&x>left&&x<right&&y>top&&y<bottom;
    obj.visible=inFrame&&(!CIRCULATION_SEQUENCE.cameraActive||obj.position.y>=-.01)&&STATE.showLabels&&e>=(pressure?start+.25:start)&&(!pressure||STATE.showPressure)&&(pressure?sequenceBandAnchorVisible(label):isSurfaceMarkerVisible(obj));
    if(pressure)obj.element.style.opacity=String(.35+.65*smoothstep(clamp((e-start)/(end-start),0,1)));
  });
}
function updateSequenceFlowGeometry(flow,curve,thermalProgress=flow.thermalProgress){
  flow.curve=curve;
  const ribbon=flow.ribbon.geometry.attributes.position,centers=flow.ribbon.geometry.attributes.center,thermal=flow.ribbon.geometry.attributes.thermalMix,filament=flow.tubes[0].geometry.attributes.position,colors=flow.tubes[0].geometry.attributes.color,palette=flow.thermalPalette?.map(c=>new THREE.Color(c));
  for(let i=0;i<=100;i++){
    const t=i/100,center=curve.getPoint(t),tangent=curve.getTangent(t),width=flow.ribbonWidth(flow.kind,t);
    const side=tangent.clone().cross(new THREE.Vector3(Math.cos(degToRad(80)),.15,-Math.sin(degToRad(80)))).normalize();
    const mix=thermalProgress(flow.kind,center,t,curve),index=Math.min(2,Math.floor(mix*3)),color=palette?palette[index].clone().lerp(palette[index+1],mix*3-index):flow.sourceColor.clone().lerp(flow.endColor,mix);
    for(let j=0;j<=8;j++){const p=center.clone().addScaledVector(side,(j/8-.5)*width);if(p.length()<CONFIG.earth.radius+.045)p.setLength(CONFIG.earth.radius+.045);ribbon.setXYZ(i*9+j,p.x,p.y,p.z);if(centers)centers.setXYZ(i*9+j,center.x,center.y,center.z);thermal.setX(i*9+j,mix);}
    const normal=tangent.clone().cross(side).normalize();
    for(let j=0;j<=4;j++){const a=j/4*Math.PI*2,p=center.clone().addScaledVector(side,Math.cos(a)*.025).addScaledVector(normal,Math.sin(a)*.025);filament.setXYZ(i*5+j,p.x,p.y,p.z);colors.setXYZ(i*5+j,color.r,color.g,color.b);}
  }
  ribbon.needsUpdate=true;centers.needsUpdate=true;thermal.needsUpdate=true;colors.needsUpdate=true;filament.needsUpdate=true;flow.ribbon.geometry.computeBoundingSphere();flow.tubes[0].geometry.computeBoundingSphere();
}
function updateCirculationSequence(dt){
  const demo=STATE.mechanismDemo,seq=CIRCULATION_SEQUENCE;
  if(sequenceAmbientRunning())CIRCULATION_SEQUENCE.ambientElapsed+=Math.min(dt,.1)*STATE.speed;
  if(demo.running&&STATE.playing){
    const e=Math.min(40,sequenceElapsed()+Math.min(dt,.1)*STATE.speed),stage=CIRCULATION_SEQUENCE.starts.findLastIndex(s=>e>=s);
    demo.elapsed=e-CIRCULATION_SEQUENCE.starts[stage];demo.complete=e===40;
    if(stage!==STATE.mechanismStage){STATE.mechanismStage=stage;updateStepPanel(1);}
    if(e>0&&seq.autoRidePending){
      seq.autoRidePending=false;seq.cameraMode='ride';seq.cameraIntroStart=0;seq.lastSignature=null;
    }
    if(demo.complete){demo.running=false;STATE.playing=false;}
  }
  syncCirculationSequence();updateSequenceUI();
}

function sequenceRideSample(time){
  const seq=CIRCULATION_SEQUENCE,e=clamp(time,0,40);
  const legs=[['equator-rise',0,4],['upper',4,12],['parallel',12,15],['sink',15,19],['trade',19,23],['west',23,27],['polar-rise',27,30],['polar-upper',30,31],['polar-sink',31,33],['polar-east',33,35],['subpolar-rise',35,38],['ferrel-upper',38,40]];
  const sample=time=>{const [kind,start,end]=legs.find(l=>time<l[2])||legs.at(-1),curve=sequenceDisplayedCurve(kind,1,time),t=clamp((time-start)/(end-start),0,1);return {point:curve.getPoint(t),tangent:curve.getTangent(t).normalize(),kind,t};};
  const current=sample(e),boundary=[23,27,35].find(b=>Math.abs(e-b)<.35);
  // Transfer the camera between independent cells without drawing a connecting airflow.
  if(boundary!==undefined){const a=sample(boundary-.35),b=sample(boundary+.35),mix=smoothstep((e-boundary+.35)/.7);current.point.copy(a.point).lerp(b.point,mix);current.tangent.copy(a.tangent).lerp(b.tangent,mix).normalize();current.transferring=true;}
  return current;
}
function setSequenceCameraMode(mode){
  const seq=CIRCULATION_SEQUENCE;seq.freeView=false;seq.autoRidePending=false;seq.cameraIntroStart=0;seq.cameraMode=mode==='overview'?'overview':'ride';
  if(seq.cameraMode==='overview')releaseSequenceCamera();
  seq.lastSignature=null;syncCirculationSequence();updateSequenceCamera();updateSequenceUI();
}
function beginSequenceFreeView(){
  const seq=CIRCULATION_SEQUENCE;if(STATE.step!==1||STATE.viewLocked)return;
  seq.freeView=true;seq.cameraMode='overview';releaseSequenceCamera(true);
  controls.enabled=true;seq.lastSignature=null;updateSequenceUI();
}
function releaseSequenceCamera(keepPose=false){
  const seq=CIRCULATION_SEQUENCE;if(!seq.cameraActive)return;
  const saved=seq.cameraSaved;
  if(keepPose){
    seq.freeLens??={near:saved.near,fov:saved.fov};
    const direction=camera.getWorldDirection(new THREE.Vector3()),distance=Math.max(controls.minDistance+.01,camera.position.distanceTo(seq.root.position));
    controls.target.copy(camera.position).addScaledVector(direction,distance);
    // Flush leftover orbit damping before handing over a new follow-camera pose.
    const position=camera.position.clone(),rotation=camera.quaternion.clone(),up=camera.up.clone(),target=controls.target.clone(),damping=controls.enableDamping;
    controls.enableDamping=false;controls.update();controls.enableDamping=damping;
    camera.position.copy(position);camera.quaternion.copy(rotation);camera.up.copy(up);controls.target.copy(target);
  }else{
    camera.position.copy(saved.position);camera.up.copy(saved.up);camera.quaternion.copy(saved.quaternion);camera.near=saved.near;camera.fov=saved.fov;camera.updateProjectionMatrix();controls.target.copy(saved.target);
  }
  controls.enabled=!STATE.viewLocked;
  seq.cameraActive=false;seq.cameraSaved=null;seq.cameraIntroStart=0;seq.lastSignature=null;
  if(!keepPose&&(saved.width!==innerWidth||saved.height!==innerHeight))frameScene(true);
}
function sequenceRideFrame(e){
  const seq=CIRCULATION_SEQUENCE,step=.025;
  const framing=getSceneFraming(),viewportKey=[framing.w,framing.h,framing.availableW,framing.availableH].map(Math.round).join(':');
  if(seq.rideViewportKey!==viewportKey){seq.rideFrames=null;seq.rideViewportKey=viewportKey;}
  if(!seq.rideFrames){
    const regions={},regionRadii={};let radius=0;
    for(const [cell,kinds] of Object.entries(seq.cells)){
      const points=seq.flows.filter(f=>f.h===1&&kinds.includes(f.kind)).flatMap(f=>f.curve.getPoints(32)),center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
      regions[cell]=center;regionRadii[cell]=Math.max(...points.map(p=>p.distanceTo(center)));radius=Math.max(radius,regionRadii[cell]);
    }
    const tangentFov=Math.tan(degToRad(65/2))*Math.min(framing.availableW,framing.availableH)/framing.h;
    const distance=Math.max(8.5,(radius+.65)/Math.sin(Math.atan(tangentFov)));
    const closeups=[[0,4,'equator-rise'],[15,19,'sink'],[27,30,'polar-rise']].map(([start,end,kind])=>{
      const points=seq.flows.find(f=>f.h===1&&f.kind===kind).curve.getPoints(32),center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3()),r=Math.max(...points.map(p=>p.distanceTo(center)));
      return {start,end,kind,center,distance:Math.max(4.2,(r+.75)/Math.sin(Math.atan(tangentFov)))};
    });
    const closeupEye=shot=>{
      const normal=shot.center.clone().normalize(),side=new THREE.Vector3(normal.z,0,-normal.x).normalize(),vertical=normal.clone().cross(side).normalize();
      return shot.center.clone().addScaledVector(normal,shot.distance*.82).addScaledVector(vertical,-shot.distance*.56).addScaledVector(side,shot.distance*.36);
    };
    const subpolarShot=closeups.at(-1),subpolarEye=closeupEye(subpolarShot);
    const polarShot={center:regions.polar,distance:Math.max(subpolarShot.distance,(regionRadii.polar+.75)/Math.sin(Math.atan(tangentFov)))},polarEye=closeupEye(polarShot);
    const overviewEye=new THREE.Vector3(Math.cos(degToRad(80)),.08,-Math.sin(degToRad(80))).normalize().multiplyScalar(7.4/Math.sin(Math.atan(tangentFov)));
    // Interpolate around Earth at a controlled radius instead of cutting across it.
    const moveShot=(eye,target,fromEye,fromTarget,toEye,toTarget,mix)=>{
      const direction=fromEye.clone().normalize(),turn=new THREE.Quaternion().setFromUnitVectors(direction,toEye.clone().normalize());
      direction.applyQuaternion(new THREE.Quaternion().slerp(turn,mix));
      eye.copy(direction).multiplyScalar(lerp(fromEye.length(),toEye.length(),mix));target.copy(fromTarget).lerp(toTarget,mix);
    };
    seq.rideFrames=[];let previousDirection=null,up=new THREE.Vector3(0,1,0);
    for(let i=0;i<=1600;i++){
      const time=i*step,sample=sequenceRideSample(time),radial=sample.point.clone().normalize();
      const bend=[4,12,15,19,23,27,30,31,33,35,38].find(b=>Math.abs(time-b)<.35);
      const tangent=bend===undefined?sample.tangent:sequenceRideSample(bend-.35).tangent.lerp(sequenceRideSample(bend+.35).tangent,smoothstep((time-bend+.35)/.7)).normalize();
      let center=regions[time<=23?'hadley':time<27?'ferrel':time<35?'polar':'ferrel'].clone();
      for(const [start,before,after] of [[23,'hadley','ferrel'],[27,'ferrel','polar'],[35,'polar','ferrel']])if(Math.abs(time-start)<.8)center=regions[before].clone().lerp(regions[after],smoothstep((time-start+.8)/1.6));
      const ahead=sequenceRideSample(Math.min(40,time+1.5)).point,target=center.clone().lerp(sample.point,.25).lerp(ahead,.10).multiplyScalar(.78);
      const outward=center.clone().normalize().lerp(radial,.25).normalize(),east=new THREE.Vector3(outward.z,0,-outward.x).normalize();
      const north=outward.clone().cross(east).normalize();
      const frontView=smoothstep(clamp((time-25)/2,0,1));
      const eye=target.clone().addScaledVector(outward,distance*.85).addScaledVector(north,distance*(-.65+.30*frontView)).addScaledVector(tangent,-distance*.10).addScaledVector(east,distance*(.12+.55*frontView));
      const close=closeups.find(c=>time>=c.start&&time<=c.end);
      if(close){const fade=Math.min(1.35,(close.end-close.start)*.46),progress=(time-close.start)/fade,mix=smoothstep(clamp(close.kind==='polar-rise'?progress:Math.min(progress,(close.end-time)/fade),0,1));eye.lerp(closeupEye(close),mix);target.lerp(close.center,mix);}
      // Hold the 60-degree polar-front close-up, move once to the whole polar cell, then reveal the overview.
      if(time>=29)moveShot(eye,target,subpolarEye,subpolarShot.center,polarEye,polarShot.center,smoothstep(clamp((time-29)/4,0,1)));
      if(time>=34)moveShot(eye,target,polarEye,polarShot.center,overviewEye,new THREE.Vector3(),smoothstep(clamp((time-34)/6,0,1)));
      const direction=target.clone().sub(eye).normalize();
      if(previousDirection)up.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(previousDirection,direction));
      up.addScaledVector(direction,-up.dot(direction)).normalize();
      const level=new THREE.Vector3(0,1,0).addScaledVector(direction,-direction.y);
      if(level.lengthSq()>.02){
        level.normalize();const roll=Math.atan2(direction.dot(up.clone().cross(level)),up.dot(level));
        up.applyAxisAngle(direction,clamp(roll,-.045,.045));
      }
      let rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,target,up));
      if(i>0)rotation=seq.rideFrames[i-1].rotation.clone().slerp(rotation,.2);
      seq.rideFrames.push({eye,rotation,up:up.clone()});previousDirection=direction;
    }
    // Smooth the recorded camera path in time, so pause and seeking remain exact.
    const rawFrames=seq.rideFrames;
    seq.rideFrames=rawFrames.map((frame,i)=>{
      const eye=new THREE.Vector3();let rotation=null,total=0;
      for(let j=Math.max(0,i-10);j<=Math.min(rawFrames.length-1,i+10);j++){
        const weight=Math.exp(-.5*Math.pow((j-i)/4,2));total+=weight;
        eye.addScaledVector(rawFrames[j].eye,weight);
        rotation=rotation?rotation.slerp(rawFrames[j].rotation,weight/total):rawFrames[j].rotation.clone();
      }
      return {eye:eye.divideScalar(total),rotation,up:new THREE.Vector3(0,1,0).applyQuaternion(rotation)};
    });
  }
  const n=clamp(e/step,0,1600),i=Math.floor(n),a=seq.rideFrames[i],b=seq.rideFrames[Math.min(i+1,1600)],t=n-i;
  return {eye:a.eye.clone().lerp(b.eye,t),rotation:a.rotation.clone().slerp(b.rotation,t),up:a.up.clone().lerp(b.up,t).normalize()};
}
function updateSequenceCamera(){
  const seq=CIRCULATION_SEQUENCE;
  if(STATE.step!==1||seq.cameraMode!=='ride'){releaseSequenceCamera();return;}
  if(sequenceElapsed()===0){sequenceRideFrame(0);releaseSequenceCamera();return;}
  if(STATE.viewLocked)return;
  controls.enabled=true;
  if(!seq.cameraActive){
    seq.cameraSaved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),target:controls.target.clone(),near:camera.near,fov:camera.fov,width:innerWidth,height:innerHeight};
    seq.cameraActive=true;seq.cameraIntroStart=sequenceElapsed()-(STATE.mechanismDemo.running&&STATE.playing?0:1.5);seq.lastSignature=null;viewAnimation++;CLASSROOM.focusAnimation++;controls.enabled=true;
  }
  const e=sequenceElapsed(),sample=sequenceRideSample(e),frame=sequenceRideFrame(e);
  const worldEye=seq.root.localToWorld(frame.eye),rotation=seq.root.quaternion.clone().multiply(frame.rotation),worldUp=frame.up.transformDirection(seq.root.matrixWorld);
  const worldTarget=worldEye.clone().add(new THREE.Vector3(0,0,-1).applyQuaternion(rotation)),intro=smoothstep(clamp((e-seq.cameraIntroStart)/1.5,0,1));
  const fov=lerp(seq.cameraSaved.fov,65,intro),near=lerp(seq.cameraSaved.near,.035,intro);
  if(camera.fov!==fov||camera.near!==near){camera.fov=fov;camera.near=near;camera.updateProjectionMatrix();}
  camera.position.copy(seq.cameraSaved.position).lerp(worldEye,intro);
  const center=seq.root.position,offset=camera.position.clone().sub(center);if(offset.length()<CONFIG.earth.radius+.3)camera.position.copy(center).add(offset.setLength(CONFIG.earth.radius+.3));
  camera.quaternion.copy(seq.cameraSaved.quaternion).slerp(rotation,intro);camera.up.copy(worldUp);controls.target.copy(worldTarget);camera.updateMatrixWorld(true);
  seq.ridePose={eye:worldEye.clone(),target:worldTarget.clone(),kind:sample.kind};updateSequenceLabels(e);updateSequenceUI();
}
