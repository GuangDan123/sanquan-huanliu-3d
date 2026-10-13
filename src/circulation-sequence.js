/* One clock and persistent globe paths preserve the causal chain across all four stages. */
const CIRCULATION_SEQUENCE = {
  duration:40, starts:[0,12,23,33], root:null, flows:[], arrowLoops:[], labels:[], annotations:[], pressureCues:[], pressureWaves:[], clouds:[], accumulations:[], descentColumns:[], equatorAir:null, ascentColumns:[], fronts:[], bands:[], guides:[], parcel:null,
  cameraMode:'ride', cameraActive:false, freeView:false,
  ambientElapsed:0, ambientPaused:false,
  highAltitude:1.45, pressureColors:{equator:0xffd447,subtropical:0x72d44a,subpolar:0x329bff,polar:0xb986ff}, inspectedNote:null,
  thermalColors:{hadley:{warm:0xffb52e,cold:0xb6dc45},ferrel:{warm:0xb6dc45,cold:0x16c8b5},polar:{warm:0x2586ff,cold:0x2586ff}},
  cellLatitudes:{equatorEdge:2,hadleyEdge:28,ferrelEdge:32,ferrelFront:58,polarFront:62,frontSlope:12},
  cells:{hadley:['equator-rise','upper','parallel','sink','trade'],ferrel:['ferrel-sink','west','subpolar-rise','ferrel-upper'],polar:['polar-rise','polar-upper','polar-sink','polar-east']},
  phases:[
    {start:0,title:'赤道受热，空气上升',text:'赤道地区受热较多，空气膨胀上升。到达高空后，在同一高度气压差作用下，气流开始向较高纬度运动。先沿经线向北的高空气流，是观察右偏的起点。'},
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
function sequenceElapsed(){return CIRCULATION_SEQUENCE.starts[STATE.mechanismStage]+STATE.mechanismDemo.elapsed;}
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
    ['equator-rise',.45,'↑','赤道受热，空气上升','高空向两侧流出，地面形成低压','赤道受热，空气膨胀上升，并在高空向两侧流出。高空辐散使近地面空气柱质量减少，形成热力性的赤道低气压带；近地面空气从两侧汇入。黄色色带随上升逐渐形成。'],
    ['upper',.52,'↗','地转偏向力','高空气流由赤道流向30°附近','赤道上升气流在高空向较高纬度运动，受到地转偏向力影响，逐渐获得向东分量。到30°附近时，风向近似与纬线平行。左右以气流前进方向为准，不能按屏幕的左右判断。地转偏向力改变水平运动方向，不是使空气下沉的力。'],
    ['parallel',.5,'→','30°高空，气流堆积','气流转向东，沿纬线不断汇入','来自低纬的高空气流逐渐转为偏西风，在30°附近近似平行纬线。教材用高空气流积聚概括这一环节，随后发生大尺度下沉。积聚与下沉属于动力过程，地转偏向力本身不直接向下压空气。'],
    ['sink',.5,'↓','30°空气下沉，形成高压','地面空气增多，形成副热带高压','高空气流在30°附近积聚，并与大尺度下沉相联系。下沉向近地面补充空气质量，使近地面空气柱的重量增加，形成动力性的副热带高气压带。绿色色带随下沉形成，近地面随后向赤道和60°附近分流。'],
    ['trade',.45,'↙','信风形成','高压流向赤道低压，发生偏转','近地面空气从30°附近的副热带高压流向赤道低压。气压梯度力使气流趋向低压，地转偏向力使流向发生偏转；摩擦使近地面风斜穿等压线。'],
    ['west',.48,'↗','盛行西风形成','副热带高压流向副极地低压','近地面空气从30°附近的副热带高压向60°附近的副极地低压流动，受地转偏向力影响，形成自西向东的盛行西风。中纬环流为间接环流，不能用当地受热上升解释整个环流。'],
    ['subpolar-rise',.5,'↑','60°冷暖相遇，暖气流抬升','暖空气沿冷空气上方爬升','较暖的西风与较冷的极地东风在60°附近辐合。冷空气密度较大，暖空气沿倾斜极锋向高纬侧爬升。上升与高空质量输出相联系，形成动力性的副极地低气压带。蓝色色带随抬升渐显；这里不是因当地强烈受热而形成低压。'],
    ['ferrel-upper',.6,'↙','中纬高空：返回30°','抬升后的空气返回30°附近，再下沉','中纬气流在高空向30°附近返回，连接本圈的下沉支。近地面向高纬、高空向低纬、30°下沉和60°附近上升，共同组成独立闭合的费雷尔环流。'],
    ['polar-upper',.5,'↗','高纬高空：流向两极','上升后的空气流向极地，再下沉','副极地附近上升的气流在高空向极地运动，随后冷却下沉，连接极地近地面气流。它与中纬高空回流同时形成，属于另一条独立闭合路线。'],
    ['polar-sink',.5,'↓','两极冷却，空气下沉','地面空气增多，形成极地高压','极地气温低，空气强烈冷却，密度增大并下沉。下沉向近地面补充空气质量，形成热力性的极地高气压带。紫色极冠随下沉形成，近地面空气由极地高压流向60°附近的副极地低压。'],
    ['polar-east',.5,'↙','极地东风形成','极地高压流向副极地低压','极地近地面空气从极地高压流向60°附近的副极地低压，受地转偏向力偏转，形成自东向西的极地东风；在副极地与较暖的西风交汇。']
  ];
  for(const h of [1,-1])for(const [kind,t,symbol,title,brief,detail] of definitions){
    const flow=seq.flows.find(f=>f.kind===kind&&f.h===h),button=document.createElement('button'),label=document.createElement('button'),leader=document.createElement('div'),el=document.createElement('div');
    const hemisphere=h===1?'北半球':'南半球',wind=kind==='trade'?(h===1?'东北信风':'东南信风'):kind==='west'?(h===1?'西南风':'西北风'):kind==='polar-east'?(h===1?'东北风':'东南风'):null;
    const deflection=h===1?'向右偏':'向左偏';
    const noteTitle=kind==='upper'?`地转偏向力：${hemisphere}${deflection}`:kind==='trade'?`${wind}：30°→赤道`:kind==='west'?'盛行西风：30°→60°':kind==='polar-east'?'极地东风：两极→60°':title;
    const noteBrief=kind==='upper'?`向${h===1?'北':'南'}运动，逐渐转向东`:wind?`${hemisphere}${deflection}，形成${wind}`:brief;
    const note={kind,h,t,flow,title:noteTitle,brief:noteBrief,detail:detail+(wind?`${hemisphere}气流${h===1?'向右':'向左'}偏转，形成${wind}。`:kind==='upper'?`${hemisphere}运动气流${h===1?'向右':'向左'}偏转。`:''),el,button,label,leader};
    el.className='sequence-note';el.hidden=true;el.dataset.kind=kind;el.dataset.hemisphere=h;button.className='sequence-note-marker';button.textContent=symbol;button.title=hemisphere+' · '+note.title;button.setAttribute('aria-label',button.title);
    label.className='sequence-note-label';const heading=document.createElement('strong'),summary=document.createElement('span');heading.textContent=note.title;summary.textContent=note.brief;label.append(heading,summary);leader.className='sequence-note-leader';
    const color=['equator-rise','sink','subpolar-rise','polar-sink'].includes(kind)?sequencePressureColor(kind==='equator-rise'?0:kind==='sink'?30:kind==='subpolar-rise'?60:90):flow.sourceColor.getHex();el.style.setProperty('--note-color','#'+color.toString(16).padStart(6,'0'));note.summary=summary;
    button.onclick=label.onclick=()=>pauseSequenceExplanation(note);
    button.onpointerenter=button.onfocus=()=>{seq.hoveredNote=note;};button.onpointerleave=button.onblur=()=>{if(seq.hoveredNote===note)seq.hoveredNote=null;};
    el.append(leader,button,label);layer.append(el);seq.annotations.push(note);
  }
}
function sequenceNoteSummary(note,e){
  if(note.kind==='equator-rise')return e<1.5?'空气受热膨胀，开始上升':e<3?'上升后从高空流出，地面空气减少':'地面空气减少，形成赤道低压';
  if(note.kind==='sink')return e<16.2?'高空气团堆积，两支气流一起下沉':e<17.6?'下沉补充空气，地面空气增多':e<19?'地面空气增多，形成副热带高压':'地面气流分向赤道和60°附近';
  if(note.kind==='subpolar-rise')return e<28?'冷空气在下，暖空气被迫抬升':e<29?'暖空气沿冷空气上方持续爬升':'高空向外流出，地面形成副极地低压';
  if(note.kind==='polar-sink')return e<31.8?'空气冷却变密，开始下沉':e<32.5?'下沉补充空气，地面空气增多':'极地高压形成，地面气流吹向60°';
  return note.brief;
}
function updateSequenceAnnotations(){
  const seq=CIRCULATION_SEQUENCE;if(!seq.annotationLayer)return;
  seq.annotationLayer.hidden=STATE.step!==1||!STATE.showLabels||document.body.classList.contains('ui-hidden');if(seq.annotationLayer.hidden)return;
  const e=sequenceElapsed(),framing=getSceneFraming(),left=framing.left+6,right=framing.left+framing.availableW-6,top=100,bottom=framing.top+framing.availableH-8;
  const sample=sequenceRideSample(e),active=seq.inspectedNote||seq.annotations.find(n=>n.h===1&&n.kind===sample.kind),occupied=[],paths=[];
  const project=p=>{const w=seq.root.localToWorld(p.clone()),n=w.clone().project(camera);return {x:(n.x+1)*innerWidth/2,y:(1-n.y)*innerHeight/2,visible:n.z>-1&&n.z<1&&w.clone().sub(seq.root.position).dot(camera.position.clone().sub(w))>0};};
  for(const flow of seq.flows.filter(f=>f.group.visible&&STATE.showPaths)){
    const progress=clamp((e-flow.start)/(flow.end-flow.start),0,1);let previous=null;
    for(let i=0;i<=100;i++){const p=project(flow.curve.getPoint(i/100*progress));if(previous?.visible&&p.visible)paths.push({left:Math.min(previous.x,p.x)-7,right:Math.max(previous.x,p.x)+7,top:Math.min(previous.y,p.y)-7,bottom:Math.max(previous.y,p.y)+7});previous=p;}
  }
  for(const column of [...seq.descentColumns,...seq.ascentColumns].filter(c=>c.group.visible)){
    const progress=clamp((e-column.start)/(column.end-column.start),0,1);let previous=null;
    for(let i=0;i<=60;i++){const p=project(column.curve.getPoint(i/60*progress));if(previous?.visible&&p.visible)paths.push({left:Math.min(previous.x,p.x)-8,right:Math.max(previous.x,p.x)+8,top:Math.min(previous.y,p.y)-8,bottom:Math.max(previous.y,p.y)+8});previous=p;}
  }
  for(const cloud of [...seq.accumulations,seq.equatorAir].filter(c=>c?.group.visible)){
    const points=[cloud.center,...[-1,1].flatMap(sign=>[cloud.center.clone().addScaledVector(cloud.north,.66*cloud.scale*sign),cloud.center.clone().addScaledVector(cloud.east,.48*cloud.scale*sign),cloud.center.clone().addScaledVector(cloud.radial,.18*sign)])].map(project);
    if(points.some(p=>p.visible))paths.push({left:Math.min(...points.map(p=>p.x))-8,right:Math.max(...points.map(p=>p.x))+8,top:Math.min(...points.map(p=>p.y))-8,bottom:Math.max(...points.map(p=>p.y))+8});
  }
  const intersects=(r,a,gap=0)=>r.left<a.right+gap&&r.right>a.left-gap&&r.top<a.bottom+gap&&r.bottom>a.top-gap;
  const place=(x,y,width,height,maxLeader=Infinity)=>{
    const candidates=[];
    for(const distance of [30,60,100,160])for(const [dx,dy] of [[1,0],[-1,0],[0,-1],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]])candidates.push([x+dx*distance-(dx<0?width:dx===0?width/2:0),y+dy*distance-(dy<0?height:dy===0?height/2:0)]);
    for(let cy=top;cy<=bottom-height;cy+=height+8)candidates.push([left,cy],[right-width,cy]);
    return candidates.map(([lx,ly])=>({left:clamp(lx,left,right-width),top:clamp(ly,top,bottom-height)})).map(r=>({...r,right:r.left+width,bottom:r.top+height})).find(r=>r.left>=left&&r.right<=right&&r.top>=top&&r.bottom<=bottom&&Math.hypot(clamp(x,r.left,r.right)-x,clamp(y,r.top,r.bottom)-y)<=maxLeader&&!occupied.some(a=>intersects(r,a,6))&&!paths.some(a=>intersects(r,a)));
  };
  for(const wave of seq.pressureWaves){
    const el=wave.word,anchor=project(wave.center);
    const visible=wave.mesh.visible&&anchor.visible&&anchor.x>left+10&&anchor.x<right-10&&anchor.y>top+10&&anchor.y<bottom-10;
    el.hidden=!visible;if(!visible)continue;
    const position=place(anchor.x,anchor.y,el.offsetWidth,el.offsetHeight,75);
    el.hidden=!position;if(position){el.style.left=position.left+'px';el.style.top=position.top+'px';occupied.push(position);}
  }
  for(const label of seq.labels.filter(l=>l.obj.visible)){
    if(label.onBand){
      const el=label.obj.element,width=el.offsetWidth,height=el.offsetHeight;
      const longitudes=[label.bandLongitude??100,...Array.from({length:60},(_,i)=>100+(i%2?-1:1)*Math.ceil(i/2)*6)];
      let position=null;
      for(const lon of longitudes){
        const point=sequencePoint(label.lat,lon,.14),anchor=project(point);
        if(!anchor.visible)continue;
        const r={left:anchor.x-width/2,right:anchor.x+width/2,top:anchor.y-height/2,bottom:anchor.y+height/2};
        if(r.left<left||r.right>right||r.top<top||r.bottom>bottom||occupied.some(a=>intersects(r,a,6))||paths.some(a=>intersects(r,a)))continue;
        position=r;label.bandLongitude=lon;label.obj.position.copy(point);break;
      }
      el.style.visibility=position?'':'hidden';
      if(position){el.style.transform=`translate(${position.left}px,${position.top}px)`;occupied.push(position);}
      continue;
    }
    const el=label.obj.element,anchor=project(label.obj.position),width=el.offsetWidth,height=el.offsetHeight,position=place(anchor.x,anchor.y,width,height,label.pressure?160:Infinity);
    if(position){el.style.transform=`translate(${position.left}px,${position.top}px)`;el.style.visibility='';occupied.push(position);}else el.style.visibility='hidden';
    if(label.pressure){
      if(!label.leader){label.leader=document.createElement('div');label.leader.className='sequence-pressure-leader';label.leader.style.background=el.style.color;seq.annotationLayer.append(label.leader);}
      const lx=position?clamp(anchor.x,position.left,position.right):anchor.x,ly=position?clamp(anchor.y,position.top,position.bottom):anchor.y,dx=lx-anchor.x,dy=ly-anchor.y;
      label.leader.hidden=!position||Math.hypot(dx,dy)<15;label.leader.style.left=anchor.x+'px';label.leader.style.top=anchor.y+'px';label.leader.style.width=Math.hypot(dx,dy)+'px';label.leader.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
    }
  }
  seq.labels.filter(l=>!l.obj.visible).forEach(l=>{if(l.leader)l.leader.hidden=true;});
  const notes=seq.annotations.slice().sort((a,b)=>(b===active)-(a===active));
  for(const note of notes){
    const anchor=note.flow.curve.getPoint(note.t),world=seq.root.localToWorld(anchor.clone()),ndc=world.clone().project(camera),x=(ndc.x+1)*innerWidth/2,y=(1-ndc.y)*innerHeight/2;
    const visible=e>note.flow.start+.1&&STATE.showPaths&&ndc.z>-1&&ndc.z<1&&x>left+10&&x<right-10&&y>top+10&&y<bottom-10&&world.clone().sub(seq.root.position).dot(camera.position.clone().sub(world))>0&&(!seq.cameraActive||note.h===1);
    note.el.hidden=!visible;if(!visible)continue;
    note.el.style.left=x+'px';note.el.style.top=y+'px';note.el.classList.toggle('is-current',note===active);note.summary.textContent=sequenceNoteSummary(note,e);note.summary.hidden=note!==active;
    const tangent=project(note.flow.curve.getPoint(Math.min(1,note.t+.015))),dx=tangent.x-x,dy=tangent.y-y,length=Math.hypot(dx,dy)||1;
    note.button.style.left=-dy/length*18+'px';note.button.style.top=dx/length*18+'px';
    const showText=note===active&&e<40||note===seq.hoveredNote||note===seq.inspectedNote;
    note.label.hidden=!showText;note.leader.hidden=true;if(!showText)continue;
    const width=note.label.offsetWidth,height=note.label.offsetHeight,placement=place(x,y,width,height);
    note.label.hidden=!placement;note.leader.hidden=!placement;
    if(placement){occupied.push(placement);note.label.style.left=placement.left-x+'px';note.label.style.top=placement.top-y+'px';const tx=clamp(x,placement.left,placement.right),ty=clamp(y,placement.top,placement.bottom),dx=tx-x,dy=ty-y;note.leader.style.width=Math.hypot(dx,dy)+'px';note.leader.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;}
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
  for(const cue of CIRCULATION_SEQUENCE.pressureCues){const p=clamp((e-cue.start)/(cue.end-cue.start),0,1);cue.mesh.visible=STATE.showParticles&&e>cue.start&&e<cue.end+.8;cue.mesh.geometry.setDrawRange(0,Math.round(cue.high?8+28*p:36-28*p));cue.mesh.material.opacity=.45+.3*p;}
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
    const cloud={h,lon,warm,scale:warm?1.5:1,center,radial,east,north,group,particles,puffs};if(warm)seq.equatorAir=cloud;else seq.accumulations.push(cloud);
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
    const rise=smoothstep(clamp((e-1.5)/2.5,0,1)),strength=cloud.warm?rise:build*settle;
    cloud.group.visible=STATE.showParticles&&(cloud.warm?e>1.5:e>12);const points=cloud.particles.geometry.attributes.position;
    cloud.particles.geometry.setDrawRange(0,Math.round(cloud.warm?24+120*rise:24+120*build));cloud.particles.material.opacity=(cloud.warm?.28:.34)*strength;
    for(let i=0;i<points.count;i++){
      const angle=i*2.39996,mix=(i+.5)/points.count,r=.51*cloud.scale*Math.sqrt(mix)*(cloud.warm?1+.25*rise:1.6-.6*build),pulse=.018*Math.sin(motionTime*1.3+i*.8);
      const point=cloud.center.clone().addScaledVector(cloud.north,Math.cos(angle)*(r+pulse)).addScaledVector(cloud.east,Math.sin(angle)*r*.62).addScaledVector(cloud.radial,Math.sin(i*1.37)*.105);
      points.setXYZ(i,point.x,point.y,point.z);
    }points.needsUpdate=true;
    cloud.puffs.forEach(({sprite,offset},i)=>{const size=cloud.scale*(cloud.warm?1+.2*rise:.65+.35*build);sprite.position.copy(cloud.center).addScaledVector(offset,cloud.scale*(cloud.warm?1+.25*rise:.72+.28*build));sprite.scale.set((i===0?1.05:.45+.09*Math.sin(i*1.9))*size,(i===0?.57:.33)*size,1);sprite.material.opacity=(i===0?.45:.36)*strength;});
  }
  for(const column of [...seq.descentColumns,...seq.ascentColumns]){
    const progress=clamp((e-column.start)/(column.end-column.start),0,1);column.group.visible=STATE.showPaths&&progress>0;
    column.beam.geometry.setDrawRange(0,Math.floor(progress*80)*10*6);column.beam.material.uniforms.uOpacity.value=column.warm?.16:.18*settle;
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
function roundSequenceJunctions(definitions){
  const seq=CIRCULATION_SEQUENCE;
  for(const h of [1,-1])for(const kinds of Object.values(seq.cells)){
    const legs=kinds.map(kind=>definitions.find(d=>d.args[4]===kind&&d.args[5]===h));
    for(let i=0;i<legs.length;i++){
      const incoming=legs[i],outgoing=legs[(i+1)%legs.length],a=incoming.raw,b=outgoing.raw;
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
function createCirculationSequence(){
  const seq=CIRCULATION_SEQUENCE,root=new THREE.Group();root.position.x=SCENE_OFFSET_X;root.visible=false;scene.add(root);seq.root=root;
  root.add(new THREE.HemisphereLight(0xe7f5ff,0x668c7f,.6));
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(CONFIG.earth.radius+2.05,64,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,blending:THREE.AdditiveBlending,
    uniforms:{uColor:{value:new THREE.Color(0x78ccff)}},
    vertexShader:'varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader:`varying vec3 vNormal;varying vec3 vView;uniform vec3 uColor;void main(){float rim=pow(1.0-clamp(dot(normalize(vNormal),normalize(vView)),0.0,1.0),3.0);gl_FragColor=vec4(uColor,.025+.42*rim);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    }`}));root.add(atmosphere);seq.atmosphere=atmosphere;
  const definitions=[],flow=(...args)=>{const raw=new SequenceCurve(args[0]);definitions.push({args,raw,curve:raw});return raw;};
  const buildFlow=(sample,start,end,color,kind,h,lon,endColor=color,curve=new SequenceCurve(sample),sourceCurve=curve)=>{
    const group=new THREE.Group();root.add(group);
    // A translucent ribbon with feathered edges reads as air, rather than a solid pipe.
    const owners=Object.keys(seq.cells).filter(cell=>seq.cells[cell].includes(kind));
    const positions=[],centers=[],uvs=[],thermalMix=[],indices=[],across=8,segments=100;
    for(let i=0;i<=segments;i++){
      const t=i/segments,center=curve.getPoint(t),width=sequenceRibbonWidth(kind,t);
      const side=curve.getTangent(t).cross(new THREE.Vector3(Math.cos(degToRad(80)),.15,-Math.sin(degToRad(80)))).normalize();
      for(let j=0;j<=across;j++){const p=center.clone().addScaledVector(side,(j/across-.5)*width);if(p.length()<CONFIG.earth.radius+.045)p.setLength(CONFIG.earth.radius+.045);positions.push(p.x,p.y,p.z);centers.push(center.x,center.y,center.z);uvs.push(t,j/across);thermalMix.push(sequenceThermalProgress(kind,center,t,curve));}
    }
    for(let i=0;i<segments;i++)for(let j=0;j<across;j++){const a=i*(across+1)+j,b=a+across+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const ribbonGeometry=new THREE.BufferGeometry();ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));ribbonGeometry.setAttribute('center',new THREE.Float32BufferAttribute(centers,3));ribbonGeometry.setAttribute('thermalMix',new THREE.Float32BufferAttribute(thermalMix,1));ribbonGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));ribbonGeometry.setIndex(indices);
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{uColor:{value:new THREE.Color(color)},uEndColor:{value:new THREE.Color(endColor)},uTime:{value:0},uOpacity:{value:.36},uWidth:{value:1}},
      vertexShader:'attribute vec3 center;attribute float thermalMix;uniform float uWidth;varying vec2 vUv;varying float vThermal;void main(){vUv=uv;vThermal=thermalMix;gl_Position=projectionMatrix*modelViewMatrix*vec4(center+(position-center)*uWidth,1.0);}',
      fragmentShader:`varying vec2 vUv;varying float vThermal;uniform vec3 uColor;uniform vec3 uEndColor;uniform float uTime;uniform float uOpacity;
      void main(){float d=abs(vUv.y-.5);float edge=exp(-18.0*d*d);float wave=.5+.5*sin(vUv.x*19.0-uTime*1.15);vec3 color=mix(uColor,uEndColor,vThermal);gl_FragColor=vec4(color,edge*uOpacity*(.65+.35*pow(wave,3.0)));
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      }`});
    const ribbon=new THREE.Mesh(ribbonGeometry,material);group.add(ribbon);
    const filamentGeometry=new THREE.TubeGeometry(curve,100,.025,4,false),filamentColors=[];
    for(let i=0;i<=100;i++){const t=i/100,c=new THREE.Color(color).lerp(new THREE.Color(endColor),sequenceThermalProgress(kind,curve.getPoint(t),t,curve));for(let j=0;j<=4;j++)filamentColors.push(c.r,c.g,c.b);}
    filamentGeometry.setAttribute('color',new THREE.Float32BufferAttribute(filamentColors,3));
    const filament=new THREE.Mesh(filamentGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.8,depthWrite:false}));group.add(filament);
    const tubes=[filament];
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(42*3),3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(42*3),3));
    const particles=new THREE.Points(geometry,new THREE.PointsMaterial({vertexColors:true,size:.10,map:particleTexture,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending}));particles.frustumCulled=false;group.add(particles);
    seq.flows.push({curve,sourceCurve,sourceColor:new THREE.Color(color),endColor:new THREE.Color(endColor),owners,group,tubes,ribbon,particles,start,end,kind,h,lon});return curve;
  };
  const {equatorEdge,hadleyEdge,ferrelEdge,ferrelFront,polarFront,frontSlope}=seq.cellLatitudes;
  // Adjacent boundaries sit two degrees either side of their nominal pressure belt.
  const upper=(t,h,lon,alt=seq.highAltitude)=>sequencePoint(h*(equatorEdge+(hadleyEdge-equatorEdge)*(2*t-t*t)),lon*smoothstep(t)+48*t*t,alt);
  for(const h of [1,-1]){
    const lon=h===1?0:12,frontTopLat=ferrelFront+frontSlope,polarTopLat=polarFront+frontSlope;
    for(const strand of [1]){
      const l=lon+(strand-1)*3.5,alt=seq.highAltitude+(strand-1)*.07,lowWarm=seq.thermalColors.hadley.warm,temperate=seq.thermalColors.hadley.cold,midCold=seq.thermalColors.ferrel.cold,polarCold=seq.thermalColors.polar.cold;
      // Separate equatorial rises across latitude while sharing one meridian.
      flow(t=>sequencePoint(equatorEdge*h,0,.08+(alt-.08)*t),0,4,lowWarm,'equator-rise',h,0);
      const curve=flow(t=>upper(t,h,l,alt),4,12,lowWarm,'upper',h,l,temperate);
      flow(t=>sequencePoint(hadleyEdge*h,l+48+18*t,alt),12,15,temperate,'parallel',h,l);
      flow(t=>sequencePoint(hadleyEdge*h,l+66,alt-(alt-.08)*t),15,19,temperate,'sink',h,l);
      flow(t=>sequencePoint(h*(equatorEdge+(hadleyEdge-equatorEdge)*(1-t)),(l+66)*(1-smoothstep(t)),.08),19,23,temperate,'trade',h,l,lowWarm);
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
  for(const [lat,name,start,end] of [[0,'赤道低气压带',0,4],[30,'副热带高气压带',15,19],[-30,'副热带高气压带',15,19],[60,'副极地低气压带',27,30],[-60,'副极地低气压带',27,30],[85,'极地高气压带',31,33],[-85,'极地高气压带',31,33]]){
    const high=name.includes('高'),color=sequencePressureColor(lat);
    const vertices=[],uv=[],indices=[],width=Math.abs(lat)>80?8:5,cols=160,rows=8;
    for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++){const p=sequencePoint(lat+(j/rows-.5)*width,360*i/cols,.12);vertices.push(p.x,p.y,p.z);uv.push(i/cols,j/rows);}
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const a=i*(rows+1)+j,b=a+rows+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){gl_FragColor=vec4(uColor,uOpacity);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    }`});
    const mesh=new THREE.Mesh(geometry,material);root.add(mesh);seq.bands.push({mesh,lat,start,end});
    const el=document.createElement('div');el.className='sequence-label sequence-pressure-label';el.textContent=name+(high?' ↓':' ↑');el.style.color='#'+color.toString(16).padStart(6,'0');el.style.borderColor=el.style.color;
    const polar=Math.abs(lat)>80,obj=new CSS2DObject(el);obj.position.copy(sequencePoint(lat,Math.abs(lat)===60?130:76,.14));
    if(polar)obj.center.set(.5,lat>0?2.2:-1.2);
    root.add(obj);seq.labels.push({obj,start,end,pressure:true,polar,lat,onBand:Math.abs(lat)===30});
  }
  createSequenceAnnotations();createSequencePressureCues();createSequencePressureWaves();
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
  document.getElementById('sequence-explanation')?.close();
  if(changed&&STATE.step===1)updateStepPanel(1);
  syncCirculationSequence();updateSequenceUI();
}
function replayCirculationSequence(){
  const seq=CIRCULATION_SEQUENCE;
  releaseSequenceCamera();
  if(seq.freeLens){camera.near=seq.freeLens.near;camera.fov=seq.freeLens.fov;camera.updateProjectionMatrix();seq.freeLens=null;}
  viewAnimation++;CLASSROOM.focusAnimation++;
  seq.cameraMode='ride';seq.freeView=false;
  seekCirculationSequence(0,true);
}
function pauseSequenceExplanation(note=null){
  note=note?.flow?note:null;CIRCULATION_SEQUENCE.inspectedNote=note;
  CIRCULATION_SEQUENCE.ambientPaused=true;
  STATE.playing=false;STATE.mechanismDemo.running=false;const p=sequencePhase(),dialog=document.getElementById('sequence-explanation');
  if(!dialog)return;
  document.getElementById('sequence-explanation-time').textContent=`形成环节 ${STATE.mechanismStage+1} / 4 · ${sequenceElapsed().toFixed(1)} / 40 秒`;
  document.getElementById('sequence-explanation-title').textContent=note?`${note.h===1?'北半球':'南半球'} · ${note.title}`:p.title;document.getElementById('sequence-explanation-text').textContent=note?note.detail:p.text;
  if(!dialog.open)dialog.show();dialog.scrollTop=0;document.getElementById('sequence-continue').disabled=false;updateSequenceUI();
}
function renderSequencePanel(body,controls,navigation){
  const titles=['高空右偏','30°下沉分流','60°交汇抬升','三圈归纳'];
  document.getElementById('sp-title').textContent=titles[STATE.mechanismStage];
  body.innerHTML='<div class="mechanism-question">观察：北半球高空气流怎样从向北运动转为向东运动，并在30°附近下沉？</div><div class="mechanism-actions"><button class="btn" id="mechanism-reveal">暂停并解释</button></div><p class="model-note">教材理想模型；纬度、气流高度与时间为示意。地转偏向力仅改变水平运动方向。</p><button class="btn btn-sm" id="mechanism-related">对应教材标准剖面</button>';
  controls.innerHTML=`<div class="mechanism-demo"><div class="sequence-camera-controls"><div id="mechanism-demo-phase" class="mechanism-demo-status" aria-live="polite"></div><button class="btn btn-sm" id="sequence-camera-toggle"></button></div><div class="sequence-stages">${titles.map((title,i)=>`<button type="button" data-sequence-stage="${i}" title="${title}">${i+1} · ${title}</button>`).join('')}</div><input class="sequence-timeline" id="sequence-timeline" type="range" min="0" max="40" step=".1" value="${sequenceElapsed()}" aria-label="形成过程进度"><div class="sequence-time"><span id="sequence-time"></span><span>40 秒</span></div><div class="mechanism-actions"><button class="btn" id="mechanism-demo-play">播放过程</button><button class="btn" id="mechanism-demo-replay">从头重播</button></div></div>`;
  controls.querySelector('.mechanism-demo').insertAdjacentHTML('afterbegin','<div class="sequence-cell-key"><span title="低纬：橙黄为暖，黄绿为冷"><i class="hadley"></i>低纬</span><span title="中纬：黄绿为暖，蓝绿色为冷"><i class="ferrel"></i>中纬</span><span title="高纬：全部为蓝色冷气流"><i class="polar"></i>高纬</span></div>');
  controls.querySelector('.sequence-cell-key').insertAdjacentHTML('afterend','<div class="sequence-pressure-key"><span><i style="background:#ffd447"></i>赤道</span><span><i style="background:#72d44a"></i>30°</span><span><i style="background:#329bff"></i>60°</span><span><i style="background:#b986ff"></i>两极</span></div>');
  navigation.innerHTML='<button class="btn" id="mechanism-prev">上一形成环节</button><button class="btn" id="mechanism-next">下一形成环节</button>';
  document.getElementById('mechanism-related').onclick=()=>openSectionAt([30,30,60,0][STATE.mechanismStage]);
  document.getElementById('mechanism-reveal').onclick=pauseSequenceExplanation;
  document.getElementById('mechanism-demo-play').onclick=()=>{if(STATE.mechanismDemo.running&&STATE.playing||sequenceAmbientRunning())pauseSequenceExplanation();else playMechanismDemo();};
  document.getElementById('mechanism-demo-replay').onclick=replayCirculationSequence;
  document.getElementById('sequence-camera-toggle').onclick=()=>setSequenceCameraMode(CIRCULATION_SEQUENCE.cameraMode==='ride'?'overview':'ride');
  document.querySelectorAll('[data-sequence-stage]').forEach(b=>b.onclick=()=>setMechanismStage(Number(b.dataset.sequenceStage)));
  document.getElementById('sequence-timeline').oninput=e=>seekCirculationSequence(Number(e.target.value));
  document.getElementById('mechanism-prev').onclick=()=>STATE.mechanismStage===0?transitionToStep(0):setMechanismStage(STATE.mechanismStage-1);
  document.getElementById('mechanism-next').onclick=()=>STATE.mechanismStage===3?transitionToStep(2):setMechanismStage(STATE.mechanismStage+1);
  updateSequenceUI();
}
function updateSequenceUI(){
  if(STATE.step!==1)return;const seq=CIRCULATION_SEQUENCE,e=sequenceElapsed(),p=sequencePhase(),demo=STATE.mechanismDemo,playing=demo.running&&STATE.playing;
  const set=(id,text)=>{const el=document.getElementById(id);if(el&&el.textContent!==text)el.textContent=text;};
  set('mechanism-demo-phase',p.title);set('sequence-time',`${e.toFixed(1)} 秒${playing?'':demo.complete?' · 完成':' · 已暂停'}`);
  set('sequence-camera-toggle',seq.cameraMode==='ride'?'全景观察':'跟随气流');
  const cameraButton=document.getElementById('sequence-camera-toggle');if(cameraButton){cameraButton.setAttribute('aria-label',seq.cameraMode==='ride'?'切换到全景观察':'切换到观察完整路线的气流跟随视角');cameraButton.disabled=STATE.viewLocked;}
  const explanation=document.getElementById('sequence-explanation');
  if(explanation){
    if(innerWidth<=600){const panel=document.getElementById('step-panel').getBoundingClientRect(),control=document.getElementById('control-panel').getBoundingClientRect();explanation.style.setProperty('--explanation-top',panel.top+'px');explanation.style.setProperty('--explanation-height',Math.max(120,control.top-panel.top-12)+'px');}
    else{explanation.style.removeProperty('--explanation-top');explanation.style.removeProperty('--explanation-height');}
  }
  set('mechanism-demo-play',demo.complete?(seq.ambientPaused?'继续流动':'暂停并解释'):playing?'暂停并解释':e>0?'继续过程':'播放过程');
  set('mechanism-next',STATE.mechanismStage===3?'第三步':'下一形成环节');
  const range=document.getElementById('sequence-timeline');if(range&&document.activeElement!==range)range.value=e;
  document.querySelectorAll('[data-sequence-stage]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.sequenceStage)===STATE.mechanismStage?'step':'false'));
}
function syncCirculationSequence(){
  const seq=CIRCULATION_SEQUENCE,active=STATE.step===1;document.body.classList.toggle('sequence-active',active);
  const atmosphere=earthGroup.userData.sequenceAtmosphere||[];
  if(seq.sceneStyled!==active){
    if(active){seq.atmosphereVisible=atmosphere.map(m=>m.visible);atmosphere.forEach(m=>m.visible=false);STATE.showPressure=true;document.getElementById('tog-pressure').classList.add('active');}
    else {releaseSequenceCamera();if(seq.freeLens){camera.near=seq.freeLens.near;camera.fov=seq.freeLens.fov;camera.updateProjectionMatrix();seq.freeLens=null;}atmosphere.forEach((m,i)=>m.visible=seq.atmosphereVisible?.[i]??true);if(gridGroup)gridGroup.visible=STATE.showGrid;}
    seq.sceneStyled=active;
  }
  if(!seq.root){if(!active)return;createCirculationSequence();}seq.root.visible=active;if(seq.annotationLayer)seq.annotationLayer.hidden=!active;
  document.getElementById('flow-legend').hidden=true;document.getElementById('coriolis-comparison').hidden=true;document.getElementById('polar-front').hidden=true;
  mechanismGroups.forEach(g=>g.visible=false);mechanismLabels.forEach(({obj})=>obj.visible=false);
  if(!active){seq.freeView=false;seq.labels.forEach(({obj})=>obj.visible=false);document.getElementById('sequence-explanation').close();return;}
  singleCellGroup.visible=false;Object.values(threeCellGroups).forEach(g=>g.visible=false);
  if(gridGroup)gridGroup.visible=false;
  latLabels.forEach(({obj})=>obj.visible=false);
  coriolisNodes.forEach(n=>n.group.visible=false);coriolisLabels.forEach(l=>l.obj.visible=false);showDeflectionIndicators(false);
  pressureBeltMeshes.forEach(m=>m.visible=false);
  renderSequenceFlows();
}
function renderSequenceFlows(){
  const seq=CIRCULATION_SEQUENCE,e=sequenceElapsed(),motionTime=e+seq.ambientElapsed;
  if(!seq.cameraActive&&!seq.freeView){const az=Math.atan2(camera.position.z,camera.position.x-SCENE_OFFSET_X);seq.root.rotation.y=-(az+degToRad(80));}seq.root.updateMatrixWorld(true);
  const explaining=!!document.getElementById('sequence-explanation')?.open;
  const signature=[e,motionTime,STATE.showGrid,STATE.showPaths,STATE.showParticles,STATE.showPressure,STATE.showLabels,STATE.lowPerf,STATE.density,explaining,seq.cameraActive].join('|');
  if(seq.lastSignature===signature){updateSequenceLabels(e);return;}seq.lastSignature=signature;
  for(const f of seq.flows){
    seq.activeCell=e<=23?'hadley':e<30?'ferrel':e<38?'polar':'ferrel';
    const retainedLow=e>23&&seq.cells.hadley.includes(f.kind);
    const retainedMid=e>=30&&seq.cells.ferrel.includes(f.kind);
    const retainedPolar=e>=38&&seq.cells.polar.includes(f.kind);
    const allowed=f.kind==='ferrel-sink'&&e>15||seq.cells[seq.activeCell].includes(f.kind)||retainedLow||retainedMid||retainedPolar||(e>23&&e<30&&seq.cells.polar.includes(f.kind));
    const p=clamp((e-f.start)/(f.end-f.start),0,1);f.group.visible=allowed&&p>0&&(STATE.showPaths||STATE.showParticles);
    const current=e<=f.end+2,context=e<40&&retainedLow&&!seq.cells[seq.activeCell].includes(f.kind)?.65:1;
    const focus=(current||e>=23?1:.68)*(f.h===-1&&e<33?.75:1)*context;
    f.ribbon.visible=STATE.showPaths&&!STATE.lowPerf;
    f.ribbon.geometry.setDrawRange(0,Math.floor(p*100)*8*6);f.ribbon.material.uniforms.uTime.value=motionTime;f.ribbon.material.uniforms.uOpacity.value=.85*focus;f.ribbon.material.uniforms.uWidth.value=seq.cameraActive?1.1:1.25;
    const baseColor=f.sourceColor;f.ribbon.material.uniforms.uColor.value.copy(baseColor);
    f.tubes.forEach((mesh,i)=>{mesh.visible=STATE.showPaths&&(!STATE.lowPerf||i===0);mesh.geometry.setDrawRange(0,Math.floor(p*100)*5*6);});
    // A colored core keeps the wider ribbon readable against clouds and the atmosphere.
    f.tubes[0].geometry.setDrawRange(0,Math.floor(p*100)*4*6);f.tubes[0].material.opacity=.8*focus;
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
  const p=clamp((e-4)/8,0,1),pos=seq.upperCurve.getPoint(p),radial=pos.clone().normalize(),velocity=seq.upperCurve.getTangent(p).normalize();velocity.addScaledVector(radial,-velocity.dot(radial)).normalize();
  const ride=sequenceRideSample(e);seq.parcel.position.copy(seq.cameraActive?ride.point:pos);seq.parcel.visible=STATE.showParticles&&(seq.cameraActive?!ride.transferring:e>=4&&e<15);
  seq.velocity.position.copy(pos);seq.velocity.setDirection(velocity);seq.velocity.visible=!seq.cameraActive&&STATE.showPaths&&explaining&&e>=4&&e<15;
  seq.force.position.copy(pos);seq.force.setDirection(velocity.clone().cross(radial).normalize());seq.force.visible=!seq.cameraActive&&STATE.showPaths&&explaining&&e>4&&e<15;
  seq.reference.visible=!seq.cameraActive&&STATE.showPaths&&e>=4&&e<10;
  updateSequenceLabels(e);
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
  CIRCULATION_SEQUENCE.labels.forEach(({obj,start,end,pressure,polar,onBand})=>{
    const projected=obj.getWorldPosition(new THREE.Vector3()).project(camera),x=(projected.x+1)*innerWidth/2,y=(1-projected.y)*innerHeight/2;
    const inFrame=projected.z>-1&&projected.z<1&&x>left&&x<right&&y>top&&y<bottom;
    if(polar){
      const mobileNorth=innerWidth<=600&&obj.position.y>0,projected=obj.getWorldPosition(new THREE.Vector3()).project(camera),x=(projected.x+1)*innerWidth/2;
      const horizontal=mobileNorth?clamp((x-16)/(obj.element.offsetWidth||100),.5,1.9):.5;
      obj.center.set(horizontal,obj.position.y>0?(innerWidth<=600?-.2:2.2):-1.2);
    }
    obj.visible=(onBand||inFrame)&&(!CIRCULATION_SEQUENCE.cameraActive||obj.position.y>=-.01)&&STATE.showLabels&&e>=(pressure?start+.25:start)&&(!pressure||STATE.showPressure)&&(onBand||polar||isSurfaceMarkerVisible(obj));
    if(pressure)obj.element.style.opacity=String(.35+.65*smoothstep(clamp((e-start)/(end-start),0,1)));
  });
}
function updateSequenceFlowGeometry(flow,curve){
  flow.curve=curve;
  const ribbon=flow.ribbon.geometry.attributes.position,filament=flow.tubes[0].geometry.attributes.position;
  for(let i=0;i<=100;i++){
    const t=i/100,center=curve.getPoint(t),tangent=curve.getTangent(t),width=sequenceRibbonWidth(flow.kind,t);
    const side=tangent.clone().cross(new THREE.Vector3(Math.cos(degToRad(80)),.15,-Math.sin(degToRad(80)))).normalize();
    for(let j=0;j<=8;j++){const p=center.clone().addScaledVector(side,(j/8-.5)*width);if(p.length()<CONFIG.earth.radius+.045)p.setLength(CONFIG.earth.radius+.045);ribbon.setXYZ(i*9+j,p.x,p.y,p.z);}
    const normal=tangent.clone().cross(side).normalize();
    for(let j=0;j<=4;j++){const a=j/4*Math.PI*2,p=center.clone().addScaledVector(side,Math.cos(a)*.025).addScaledVector(normal,Math.sin(a)*.025);filament.setXYZ(i*5+j,p.x,p.y,p.z);}
  }
  ribbon.needsUpdate=true;filament.needsUpdate=true;flow.ribbon.geometry.computeBoundingSphere();flow.tubes[0].geometry.computeBoundingSphere();
}
function updateCirculationSequence(dt){
  const demo=STATE.mechanismDemo;
  if(sequenceAmbientRunning())CIRCULATION_SEQUENCE.ambientElapsed+=Math.min(dt,.1)*STATE.speed;
  if(demo.running&&STATE.playing){
    const e=Math.min(40,sequenceElapsed()+Math.min(dt,.1)*STATE.speed),stage=CIRCULATION_SEQUENCE.starts.findLastIndex(s=>e>=s);
    demo.elapsed=e-CIRCULATION_SEQUENCE.starts[stage];demo.complete=e===40;
    if(stage!==STATE.mechanismStage){STATE.mechanismStage=stage;updateStepPanel(1);}
    if(demo.complete){demo.running=false;STATE.playing=false;}
  }
  syncCirculationSequence();updateSequenceUI();
}

function sequenceRideSample(time){
  const seq=CIRCULATION_SEQUENCE,e=clamp(time,0,40);
  const legs=[['equator-rise',0,4],['upper',4,12],['parallel',12,15],['sink',15,19],['trade',19,23],['west',23,27],['subpolar-rise',27,30],['polar-upper',30,31],['polar-sink',31,33],['polar-east',33,35],['polar-rise',35,38],['ferrel-upper',38,40]];
  const sample=time=>{const [kind,start,end]=legs.find(l=>time<l[2])||legs.at(-1),flow=seq.flows.find(f=>f.h===1&&f.kind===kind),t=clamp((time-start)/(end-start),0,1);return {point:flow.curve.getPoint(t),tangent:flow.curve.getTangent(t).normalize(),kind,t};};
  const current=sample(e),boundary=[23,30,38].find(b=>Math.abs(e-b)<.35);
  // Transfer the camera between independent cells without drawing a connecting airflow.
  if(boundary!==undefined){const a=sample(boundary-.35),b=sample(boundary+.35),mix=smoothstep((e-boundary+.35)/.7);current.point.copy(a.point).lerp(b.point,mix);current.tangent.copy(a.tangent).lerp(b.tangent,mix).normalize();current.transferring=true;}
  return current;
}
function setSequenceCameraMode(mode){
  const seq=CIRCULATION_SEQUENCE;seq.freeView=false;seq.cameraMode=mode==='overview'?'overview':'ride';
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
  seq.cameraActive=false;seq.cameraSaved=null;seq.lastSignature=null;
  if(!keepPose&&(saved.width!==innerWidth||saved.height!==innerHeight))frameScene(true);
}
function sequenceRideFrame(e){
  const seq=CIRCULATION_SEQUENCE,step=.025;
  const framing=getSceneFraming(),viewportKey=[framing.w,framing.h,framing.availableW,framing.availableH].map(Math.round).join(':');
  if(seq.rideViewportKey!==viewportKey){seq.rideFrames=null;seq.rideViewportKey=viewportKey;}
  if(!seq.rideFrames){
    const regions={};let radius=0;
    for(const [cell,kinds] of Object.entries(seq.cells)){
      const points=seq.flows.filter(f=>f.h===1&&kinds.includes(f.kind)).flatMap(f=>f.curve.getPoints(32)),center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
      regions[cell]=center;radius=Math.max(radius,...points.map(p=>p.distanceTo(center)));
    }
    const tangentFov=Math.tan(degToRad(65/2))*Math.min(framing.availableW,framing.availableH)/framing.h;
    const distance=Math.max(8.5,(radius+.65)/Math.sin(Math.atan(tangentFov)));
    const closeups=[[0,4,'equator-rise'],[15,19,'sink'],[27,30,'subpolar-rise'],[31,33,'polar-sink']].map(([start,end,kind])=>{
      const points=seq.flows.find(f=>f.h===1&&f.kind===kind).curve.getPoints(32),center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3()),r=Math.max(...points.map(p=>p.distanceTo(center)));
      return {start,end,kind,center,distance:Math.max(4.2,(r+.75)/Math.sin(Math.atan(tangentFov)))};
    });
    seq.rideFrames=[];let previousDirection=null,up=new THREE.Vector3(0,1,0);
    for(let i=0;i<=1600;i++){
      const time=i*step,sample=sequenceRideSample(time),radial=sample.point.clone().normalize();
      const bend=[4,12,15,19,23,27,30,31,33,35,38].find(b=>Math.abs(time-b)<.35);
      const tangent=bend===undefined?sample.tangent:sequenceRideSample(bend-.35).tangent.lerp(sequenceRideSample(bend+.35).tangent,smoothstep((time-bend+.35)/.7)).normalize();
      let center=regions[time<=23?'hadley':time<30?'ferrel':time<38?'polar':'ferrel'].clone();
      for(const [start,before,after] of [[23,'hadley','ferrel'],[30,'ferrel','polar'],[38,'polar','ferrel']])if(Math.abs(time-start)<.8)center=regions[before].clone().lerp(regions[after],smoothstep((time-start+.8)/1.6));
      const ahead=sequenceRideSample(Math.min(40,time+1.5)).point,target=center.clone().lerp(sample.point,.25).lerp(ahead,.10).multiplyScalar(.78);
      const outward=center.clone().normalize().lerp(radial,.25).normalize(),east=new THREE.Vector3(outward.z,0,-outward.x).normalize();
      const north=outward.clone().cross(east).normalize();
      const frontView=smoothstep(clamp((time-25)/2,0,1))*(1-smoothstep(clamp((time-30)/2,0,1)));
      const eye=target.clone().addScaledVector(outward,distance*.85).addScaledVector(north,distance*(-.65+.30*frontView)).addScaledVector(tangent,-distance*.10).addScaledVector(east,distance*(.12+.55*frontView));
      const close=closeups.find(c=>time>=c.start&&time<=c.end);
      if(close){const fade=Math.min(1.35,(close.end-close.start)*.46),mix=smoothstep(clamp(Math.min((time-close.start)/fade,(close.end-time)/fade),0,1)),normal=close.center.clone().normalize(),side=new THREE.Vector3(normal.z,0,-normal.x).normalize(),vertical=normal.clone().cross(side).normalize(),closeEye=close.center.clone().addScaledVector(normal,close.distance*.82).addScaledVector(vertical,-close.distance*.56).addScaledVector(side,close.distance*.36);eye.lerp(closeEye,mix);target.lerp(close.center,mix);}
      if(time>38){const mix=smoothstep((time-38)/2),overviewEye=new THREE.Vector3(Math.cos(degToRad(80)),.08,-Math.sin(degToRad(80))).normalize().multiplyScalar(7.4/Math.sin(Math.atan(tangentFov)));eye.lerp(overviewEye,mix);target.multiplyScalar(1-mix);}
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
    seq.cameraActive=true;seq.lastSignature=null;viewAnimation++;CLASSROOM.focusAnimation++;controls.enabled=true;
  }
  const e=sequenceElapsed(),sample=sequenceRideSample(e),frame=sequenceRideFrame(e);
  const worldEye=seq.root.localToWorld(frame.eye),rotation=seq.root.quaternion.clone().multiply(frame.rotation),worldUp=frame.up.transformDirection(seq.root.matrixWorld);
  const worldTarget=worldEye.clone().add(new THREE.Vector3(0,0,-1).applyQuaternion(rotation)),intro=smoothstep(clamp(e/1.5,0,1));
  const fov=lerp(seq.cameraSaved.fov,65,intro),near=lerp(seq.cameraSaved.near,.035,intro);
  if(camera.fov!==fov||camera.near!==near){camera.fov=fov;camera.near=near;camera.updateProjectionMatrix();}
  camera.position.copy(seq.cameraSaved.position).lerp(worldEye,intro);
  const center=seq.root.position,offset=camera.position.clone().sub(center);if(offset.length()<CONFIG.earth.radius+.3)camera.position.copy(center).add(offset.setLength(CONFIG.earth.radius+.3));
  camera.quaternion.copy(seq.cameraSaved.quaternion).slerp(rotation,intro);camera.up.copy(worldUp);controls.target.copy(worldTarget);camera.updateMatrixWorld(true);
  seq.ridePose={eye:worldEye.clone(),target:worldTarget.clone(),kind:sample.kind};updateSequenceLabels(e);updateSequenceUI();
}
