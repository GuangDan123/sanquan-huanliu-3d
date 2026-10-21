/* Teaching stages share one globe and one lesson timeline, including the final overview. */
let landSeaStory=null;
const LS_COLUMN_CAMERA={active:false,saved:null,manual:false,returnPose:null};
const LS_STORY_COLORS={cold:0x62c8ff,warm:0xffa05c,high:0xffd36f,low:0x70cbff};
function landSeaCameraPose(){return {position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone(),quaternion:camera.quaternion.clone(),framingDistance:getSceneFraming().distance};}
function releaseLandSeaColumnCamera(keepPose=false){
  const s=LS_COLUMN_CAMERA;if(!s.saved)return;
  if(keepPose){s.active=false;s.manual=true;return;}
  const p=s.saved,scale=getSceneFraming().distance/p.framingDistance;
  camera.position.copy(p.position).sub(p.target).multiplyScalar(scale).add(p.target);camera.up.copy(p.up);camera.quaternion.copy(p.quaternion);controls.target.copy(p.target);
  s.active=false;s.saved=null;s.manual=false;s.returnPose=null;
}
function updateLandSeaColumnCamera(){
  const s=LS_COLUMN_CAMERA,f=LANDSEA.formation;
  const eligible=STATE.step===3&&LANDSEA.surface==='real'&&f.view==='mechanism'&&f.node>=1&&f.node<=3;
  if(!eligible){releaseLandSeaColumnCamera();return;}
  if(STATE.viewLocked)return;
  // The heat and air-transfer stages share a side view. Restore the regional
  // view as the near-surface pressure stage begins; paused time freezes the lens.
  const blend=f.node===1?smoothstep(clamp(f.progress/.22,0,1)):f.node===2?1:1-smoothstep(clamp(f.progress/.24,0,1));
  if(blend===0){releaseLandSeaColumnCamera();return;}
  if(!s.saved){
    const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;
    s.saved=landSeaCameraPose();s.manual=false;s.returnPose=null;viewAnimation++;
  }
  if(s.manual&&f.node<3)return;
  const normal=s.saved,target=normal.target,distance=normal.position.distanceTo(target)*getSceneFraming().distance/normal.framingDistance;
  const direction=landSeaPoint(70,-52,1).normalize(),sidePosition=target.clone().addScaledVector(direction,distance);
  const sideUp=new THREE.Vector3(0,1,0).addScaledVector(direction,-direction.y).normalize().applyAxisAngle(direction,degToRad(-85));
  let sideQuaternion=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(sidePosition,target,sideUp));
  if(s.manual){s.returnPose??=landSeaCameraPose();sideQuaternion=s.returnPose.quaternion;}
  const orientation=normal.quaternion.clone().slerp(sideQuaternion,blend);
  controls.target.copy(target);
  camera.position.set(0,0,1).applyQuaternion(orientation).multiplyScalar(distance).add(target);
  camera.up.set(0,1,0).applyQuaternion(orientation);camera.quaternion.copy(orientation);
  s.active=true;frameScene();
}
function landSeaStoryState(){
  const f=LANDSEA.formation,q={};
  for(const key of ['bridge','heat','column','pressure','band','wind','overview'])q[key]=smoothstep(formationLevel('landsea',key));
  return {q,winter:LANDSEA.month===1,node:f.node,time:lsTimeline()};
}
function landSeaOverviewBlend(){return LANDSEA.formation.view==='result'?1:LANDSEA.surface==='real'?smoothstep(formationLevel('landsea','overview')):0;}
function landSeaStoryCenters(){
  // 区域机制图对照亚洲大陆与邻近西太平洋；全球中心位置仍由结果图表示。
  const lat=LANDSEA.month===1?45:30,centers=landSeaCenters();
  const blend=landSeaOverviewBlend();
  return [{...centers[0],lat,lon:103,sx:27,sy:17},{...centers[1],lat,lon:153,sx:25,sy:17}].map((c,i)=>{
    const target=centers[i],lonDelta=((target.lon-c.lon+540)%360)-180;
    return {...c,lat:lerp(c.lat,target.lat,blend),lon:c.lon+lonDelta*blend,sx:lerp(c.sx,target.sx,blend),sy:lerp(c.sy,target.sy,blend)};
  });
}
function landSeaStoryMassBudget(columnLevel,winter){
  const mass=clamp((columnLevel-.4)/.6,0,1),packets=Array.from({length:12},(_,i)=>clamp((mass-i/11*.65)/.35,0,1));
  const departed=packets.filter(p=>p>0).length,arrived=packets.filter(p=>p===1).length;
  const donor=24-departed,receiver=24+arrived;
  return {land:winter?receiver:donor,sea:winter?donor:receiver,inTransit:departed-arrived,packets};
}
function seekLandSeaStage(node){
  if(!Number.isInteger(node)||node<0||node>=formationStages('landsea').length)return;
  LANDSEA.formation.view='mechanism';LANDSEA.surface='real';LANDSEA.region='asia';
  Object.assign(LANDSEA.formation,{node,progress:0,clock:0,reveal:false});
  STATE.playing=false;resetLandSeaMechanism();viewAnimation++;
  refreshFormation('landsea');focusLandSeaRegion('asia');
}
function lsStoryCurve(points){
  // Interpolate latitude, longitude and height separately to keep elevated flow outside Earth.
  const c=new THREE.CatmullRomCurve3(points.map(([lat,lon,r=5.2])=>new THREE.Vector3(lat,lon,r)));
  return {getPoint(t){const p=c.getPoint(clamp(t,0,1));return landSeaPoint(p.x,p.y,p.z);}};
}
function lsGlobePatch(lat,lon,rx,ry,land=false){
  const vertices=[],colors=[],base=new THREE.Color(0xffffff);
  for(let y=-ry;y<ry;y+=2)for(let x=-rx;x<rx;x+=2){
    if(land&&landSeaMechanismLand(lat+y,lon+x)<.5)continue;
    for(const [a,b]of [[y,x],[y+2,x],[y,x+2],[y+2,x],[y+2,x+2],[y,x+2]]){
      const radius=Math.hypot(a/ry,b/rx),alpha=Math.exp(-1.5*radius*radius)*smoothstep(clamp((1.08-radius)/.28,0,1));
      vertices.push(...landSeaPoint(lat+a,lon+b,5.105).toArray());colors.push(base.r,base.g,base.b,alpha);
    }
  }
  const mesh=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)).setAttribute('color',new THREE.Float32BufferAttribute(colors,4)),
    new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  mesh.name='landsea-thermal-region';return mesh;
}
function lsGlobeLabel(group,kind,lat,lon,r=5.3){
  const el=document.createElement('div');el.className='ls-globe-note ls-note-'+kind;el.innerHTML='<b></b><span></span>';
  const obj=new CSS2DObject(el);obj.position.copy(landSeaPoint(lat,lon,r));group.add(obj);return {obj,kind};
}
function lsMakeFlow(parent,name,color,surface=false,dashed=false){
  const group=new THREE.Group();group.name=name;parent.add(group);
  const mat=dashed?new THREE.LineDashedMaterial({color,dashSize:.12,gapSize:.09,transparent:true,opacity:.8,depthWrite:false}):new THREE.LineBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false});
  const line=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(97*3),3)),mat);group.add(line);
  const heads=[];
  for(let i=0;i<1;i++){
    const head=new THREE.Mesh(surface?new THREE.BufferGeometry():new THREE.ConeGeometry(.075,.22,12),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}));
    head.name='landsea-teaching-direction';group.add(head);heads.push(head);
  }
  const dots=[];for(let i=0;i<(dashed?0:3);i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.026,8,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false}));group.add(dot);dots.push(dot);}
  return {group,line,heads,dots,surface,dashed};
}
function lsUpdateFlow(flow,curve,progress,time,visible,opacity=1){
  flow.group.visible=visible&&progress>0;if(!flow.group.visible)return;
  const pos=flow.line.geometry.attributes.position;
  for(let i=0;i<97;i++){const p=curve.getPoint(i/96);pos.setXYZ(i,p.x,p.y,p.z);}pos.needsUpdate=true;
  flow.line.geometry.setDrawRange(0,Math.max(2,Math.floor(97*progress)));flow.line.geometry.computeBoundingSphere();flow.line.computeLineDistances();
  flow.line.material.opacity=(flow.dashed?.62:flow.surface?.20:.8)*opacity;
  flow.heads.forEach(head=>{
    const t=clamp(progress,.001,1);head.visible=STATE.showPaths&&progress>.035;if(!head.visible)return;
    head.material.opacity=(flow.dashed?.65:.95)*opacity;
    if(flow.surface)landSeaSurfaceArrow(curve,flow.dashed?Math.max(0,t-.06):0,t,head.geometry,5.20);
    else{const p=curve.getPoint(t),dir=curve.getPoint(Math.min(1,t+.005)).sub(curve.getPoint(Math.max(0,t-.005))).normalize();head.position.copy(p);head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);}
  });
  flow.dots.forEach((dot,i)=>{const t=(time*.12+i/flow.dots.length)%1;dot.visible=STATE.showParticles&&t<progress;dot.position.copy(curve.getPoint(t));dot.material.opacity=.85*opacity;});
}
function lsMakeColumn(group,lat,lon){
  const root=new THREE.Group();root.position.copy(landSeaPoint(lat,lon,5.16));root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),root.position.clone().normalize());group.add(root);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,1,24,1,true),new THREE.MeshBasicMaterial({transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));root.add(body);
  const rings=[];for(let i=0;i<2;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.31,.018,6,32),new THREE.MeshBasicMaterial({transparent:true,opacity:.7}));ring.rotation.x=Math.PI/2;root.add(ring);rings.push(ring);}
  const particles=[];for(let i=0;i<44;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.042,6,5),new THREE.MeshBasicMaterial({color:0xe0f6ff,transparent:true,opacity:.9}));root.add(dot);particles.push(dot);}
  const arrows=[];for(let i=0;i<3;i++){const arrow=new THREE.Mesh(new THREE.ConeGeometry(.09,.22,8),new THREE.MeshBasicMaterial({color:0xffffff}));root.add(arrow);arrows.push(arrow);}
  root.name='landsea-air-column';return {root,body,rings,particles,arrows,lat,lon};
}
function lsUpdateColumn(c,index,state){
  const {q,winter,time}=state,land=index===0,fade=1-q.band;
  c.root.visible=q.heat>0&&fade>.02&&(STATE.showParticles||STATE.showPaths);if(!c.root.visible)return;
  const temp=land?(winter?LS_STORY_COLORS.cold:LS_STORY_COLORS.warm):(winter?LS_STORY_COLORS.warm:LS_STORY_COLORS.cold),
    height=lerp(1.5,land?(winter?1.05:2.15):1.55,q.heat),budget=landSeaStoryMassBudget(q.column,winter),
    count=land?budget.land:budget.sea,rise=land?!winter:winter;
  c.root.userData.particleCount=count;c.root.userData.height=height;
  c.body.scale.y=height;c.body.position.y=height/2;c.body.material.color.set(temp);c.body.material.opacity=.17*q.heat*fade;
  c.rings.forEach((ring,i)=>{ring.position.y=i*height;ring.material.color.set(temp);ring.material.opacity=.8*fade;ring.visible=STATE.showPaths;});
  c.particles.forEach((dot,i)=>{
    dot.visible=STATE.showParticles&&i<count;
    const angle=i*2.39996,r=.21*Math.sqrt(((i*17)%43+1)/44),motion=q.column>0?time*.19*(rise?1:-1):0;
    dot.position.set(Math.cos(angle)*r,(((i*.618+motion)%1+1)%1)*height,Math.sin(angle)*r);
    dot.material.opacity=.9*fade;
  });
  c.arrows.forEach((arrow,i)=>{
    const phase=((time*.25*(rise?1:-1)+i/3)%1+1)%1;
    arrow.visible=STATE.showPaths&&q.column>.12;arrow.position.set(.42,phase*height,0);
    arrow.rotation.z=rise?0:Math.PI;arrow.material.color.set(temp);
  });
}
function lsMakePressure(group){
  const root=new THREE.Group();root.name='landsea-growing-pressure-center';group.add(root);
  const fill=new THREE.Mesh(new THREE.PlaneGeometry(2,2,32,24),new THREE.MeshBasicMaterial({map:particleTexture,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  const unit=fill.geometry.attributes.position.array.slice();root.add(fill);
  const rings=[];for(let i=0;i<3;i++){const line=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(97*3),3)),new THREE.LineBasicMaterial({transparent:true,opacity:.8,depthWrite:false}));root.add(line);rings.push(line);}
  return {root,fill,rings,unit};
}
function lsPressureGeometry(p,center){
  p.center=center;const pos=p.fill.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){const point=landSeaPoint(center.lat+p.unit[i*3+1]*center.sy*.8,center.lon+p.unit[i*3]*center.sx*.85,5.12);pos.setXYZ(i,point.x,point.y,point.z);}
  pos.needsUpdate=true;p.fill.geometry.computeBoundingSphere();
}
function lsUpdatePressure(p,level,color,opacity=1){
  p.root.visible=STATE.showPressure&&level>0;if(!p.root.visible)return;
  p.fill.material.color.set(color);p.fill.material.opacity=.52*level*opacity;
  p.rings.forEach((line,i)=>{const a=line.geometry.attributes.position,size=(.2+.8*level)*(.4+i*.26);
    for(let j=0;j<97;j++){const theta=j/96*Math.PI*2,c=p.center,point=landSeaPoint(clamp(c.lat+Math.sin(theta)*c.sy*.65*size,-85,85),c.lon+Math.cos(theta)*c.sx*.7*size,5.17);a.setXYZ(j,point.x,point.y,point.z);}a.needsUpdate=true;line.geometry.computeBoundingSphere();line.material.color.set(color);line.material.opacity=.55*level*opacity;
  });
}
function createLandSeaStory(){
  const group=new THREE.Group();group.name='landsea-teaching-focus';landSeaGroup.add(group);group.add(new THREE.AmbientLight(0xffffff,.65));
  const patches=[lsGlobePatch(40,100,31,25,true),lsGlobePatch(36,155,20,20)];patches.forEach(p=>group.add(p));
  const columns=[lsMakeColumn(group,35,103),lsMakeColumn(group,35,153)],labels=[];
  for(const [kind,lat,lon,r]of [['land',20,99,5.3],['sea',20,158,5.3],['upperland',40,95,7.65],['uppersea',40,162,7.65],['mass',2,98,5.4],['oceanpressure',50,175,5.35],['band',64,144,5.3],['wind',12,128,5.3]])labels.push(lsGlobeLabel(group,kind,lat,lon,r));
  const upper=lsMakeFlow(group,'landsea-upper-adjustment',0x96e3ff),force=lsMakeFlow(group,'landsea-pressure-drive',0xffffff,true,true),wind=lsMakeFlow(group,'landsea-main-wind',0xffb660,true);
  const transfer=lsMakeFlow(group,'landsea-mass-transfer',0xe1faff),centers=[lsMakePressure(group),lsMakePressure(group)];
  const key=document.createElement('aside');key.id='landsea-flow-key';key.hidden=true;
  key.innerHTML='<b></b><span><i class="ls-force-key"></i>气压差推动：高压 → 低压</span><span><i class="ls-wind-key"></i>实际近地面风：北半球向右偏</span><small>位置过渡用于归纳，不表示真实迁移</small>';document.body.append(key);
  landSeaStory={group,patches,columns,labels,upper,force,wind,transfer,centers,month:null};syncLandSeaStory();
}
function syncLandSeaStory(){
  const s=landSeaStory;if(!s)return;
  const overview=landSeaOverviewBlend(),fade=1-overview;
  const active=STATE.step===3&&LANDSEA.surface==='real'&&LANDSEA.formation.view==='mechanism'&&overview<1;s.group.visible=active;
  const key=document.getElementById('landsea-flow-key');key.hidden=!active||!STATE.showLegend||formationLevel('landsea','wind')===0;
  key.querySelector('b').textContent=overview>0?'局部机制 → 完整分布':'先看推动方向，再看风向右偏';
  key.querySelector('small').hidden=overview===0;
  document.body.classList.toggle('landsea-story-mode',active);
  if(gridGroup)gridGroup.children.forEach(o=>{if(o.material){o.material.userData.storyOpacity??=o.material.opacity;o.material.opacity=active?o.material.userData.storyOpacity*.22:o.material.userData.storyOpacity;}});
  if(!active){s.labels.forEach(({obj})=>obj.visible=false);return;}
  const state=landSeaStoryState(),{q,winter,node,time}=state;
  const c=landSeaStoryCenters();s.centers.forEach((p,i)=>lsPressureGeometry(p,c[i]));
  s.patches.forEach((patch,i)=>{const response=i===0?q.heat:Math.pow(q.heat,1.7)*.65;patch.visible=STATE.showPressure&&response>0&&q.band<1;patch.material.color.set(i===0?(winter?LS_STORY_COLORS.cold:LS_STORY_COLORS.warm):(winter?LS_STORY_COLORS.warm:LS_STORY_COLORS.cold));patch.material.opacity=.55*response*(1-q.band);});
  s.columns.forEach((column,i)=>lsUpdateColumn(column,i,state));
  const transport=clamp((q.column-.15)/.85,0,1),upperPoints=winter?[[35,153,7.4],[35,130,7.4],[35,103,7.4]]:[[35,103,7.4],[35,130,7.4],[35,153,7.4]],upperCurve=lsStoryCurve(upperPoints);
  lsUpdateFlow(s.upper,upperCurve,transport,time,STATE.showPaths&&q.band<1);
  // The descending/ascending continuation shares the upper route's endpoint and changes mass visibly.
  const vertical=winter?[[35,103,7.4],[35,103,6.3],[35,103,5.2]]:[[35,103,5.2],[35,103,6.3],[35,103,7.4]];
  lsUpdateFlow(s.transfer,lsStoryCurve(vertical),clamp((q.column-.35)/.65,0,1),time,STATE.showPaths&&q.band<1);
  lsUpdatePressure(s.centers[0],q.pressure,winter?LS_STORY_COLORS.high:LS_STORY_COLORS.low,fade);
  lsUpdatePressure(s.centers[1],q.band,winter?LS_STORY_COLORS.low:LS_STORY_COLORS.high,fade);
  const centers=landSeaStoryCenters(),source=centers[winter?0:1],target=centers[winter?1:0],origin=[source.lat,source.lon],midLon=(source.lon+target.lon)/2,
    straight=[origin,[source.lat,midLon],[target.lat,target.lon]],bend=clamp((q.wind-.3)/.7,0,1),side=winter?-1:1,
    curved=[origin,[source.lat+side*3*bend,midLon],[target.lat+side*14*bend,lerp(target.lon,winter?143:116,bend)]];
  lsUpdateFlow(s.force,lsStoryCurve(straight),clamp(q.wind/.35,0,1),time,STATE.showPaths&&q.wind>0,fade*fade);
  const local=lsStoryCurve(curved),result=landSeaTravelers[winter?1:0]?.curve;
  const windCurve=result&&overview>0?{getPoint(t){return local.getPoint(t).lerp(result.getPoint(t),overview).setLength(5.20);}}:local;
  lsUpdateFlow(s.wind,windCurve,clamp((q.wind-.2)/.45,0,1),time,STATE.showPaths&&q.wind>.2,fade);
  s.wind.group.userData.deflection=bend;s.wind.group.userData.origin=origin;
  for(const {obj,kind}of s.labels){
    let title='',sub='',visible=false;
    if(kind==='land'){const center=centers[0];obj.position.copy(landSeaPoint(q.pressure>0?center.lat:20,q.pressure>0?center.lon:99,5.32));title=q.pressure>0?(winter?'H 大陆冷高压':'L 大陆热低压'):'亚洲大陆';sub=q.pressure>0?'':q.column>0?(winter?'下沉':'上升'):q.heat>0?(winter?'降温较快':'升温较快'):'';visible=q.bridge===1;}
    if(kind==='sea'){title='同纬度海洋';sub=q.pressure>0?(winter?'近地面相对低压':'近地面相对高压'):q.heat>0?(winter?'降温较慢':'升温较慢'):'';visible=q.bridge===1&&node<4;}
    if(kind==='upperland'){title=winter?'高空 L':'高空 H';sub=transport>.4?(winter?'高空补充':'高空外流'):'同一高度';visible=q.column>0&&node<4;}
    if(kind==='uppersea'){title=winter?'高空 H':'高空 L';sub='同一高度比较';visible=q.column>0&&node===2;}
    if(kind==='mass'){title=winter?'气柱质量增加':'气柱质量减少';sub='';visible=q.column>.65&&node<4;}
    if(kind==='oceanpressure'){title=winter?'L 海洋低压':'H 海洋高压';sub='';const c=centers[1];obj.position.copy(landSeaPoint(c.lat-9,c.lon,5.4));visible=q.band>.45;}
    if(kind==='band'){title=winter?'副极地低压带':'副热带高压带';sub=q.band>.6?'大陆中断 · 海洋保留':'原连续带 → 区域气压中心';obj.position.copy(landSeaPoint((winter?60:30)+landSeaSeasonShift(q.bridge)+6,143,5.28));visible=q.band>0&&node===4;}
    if(kind==='wind'){title=bend>.8?(winter?'东亚冬季风':'东亚夏季风'):bend>0?'北半球 · 向右偏':'气压差推动';sub=bend>.8?(winter?'偏北风':'偏南风'):bend>0?'相对气流前进方向':'高压 → 低压';visible=q.wind>0;}
    const columnNote=LS_COLUMN_CAMERA.saved&&node<=2&&(kind==='land'||kind==='sea');
    obj.center.set(.5,.5);
    if(columnNote){
      const column=s.columns[kind==='land'?0:1];obj.position.copy(landSeaPoint(column.lat,column.lon,5.16+column.root.userData.height+.3));
      const tip=s.group.localToWorld(obj.position.clone()).project(camera),base=column.root.getWorldPosition(new THREE.Vector3()).project(camera);
      // Anchor the box outside the column tip, rather than centering it over
      // the particles. Follow its screen direction when the globe is rotated.
      obj.center.x=tip.x<base.x?1.2:-.2;
    }
    else if(kind==='sea')obj.position.copy(landSeaPoint(20,158,5.3));
    const el=obj.element;el.querySelector('b').textContent=title;el.querySelector('span').textContent=sub;
    el.dataset.tone=(kind==='land'&&q.pressure>0)?(winter?'high':'low'):kind==='land'?(winter?'cold':'warm'):'';
    const p=obj.getWorldPosition(new THREE.Vector3()),facing=p.clone().sub(earthGroup.position).normalize().dot(camera.position.clone().sub(p));
    const sight=camera.position.clone().sub(p),near=clamp(earthGroup.position.clone().sub(p).dot(sight)/sight.lengthSq(),0,1);
    const columnVisible=p.clone().addScaledVector(sight,near).distanceTo(earthGroup.position)>5.02;
    const labelFade=1-smoothstep(clamp(overview/.5,0,1));
    el.style.opacity=String(labelFade);obj.visible=visible&&labelFade>0&&STATE.showLabels&&(columnNote?columnVisible:facing>.25);
  }
  // Keep the left stage selector in sync without rebuilding the controls each frame.
  const select=document.getElementById('landsea-stage');if(select)select.value=String(node);
}
