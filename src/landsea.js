/* 第四步：经纬度固定的海陆气压与季风教学示意；不使用天气实测数据。 */
const LANDSEA = {month:1,surface:'real',reference:false,region:'asia',phase:0,formation:newFormationState()};
let landSeaGroup,landSeaPressure,landSeaContours,landSeaWinds,landSeaReference,landSeaIdeal;
let landSeaLabels=[],landSeaTravelers=[],landSeaReturnRotation=null,landSeaReturnView=null;
const LANDSEA_COLORS = [[988,'#64519e'],[996,'#527fb7'],[1004,'#58afce'],[1012,'#d3dabb'],[1020,'#f5cc56'],[1028,'#ed8540'],[1036,'#e34531']];

function landSeaPoint(lat,lon,r=CONFIG.earth.radius+.10){
  const a=degToRad(lat),b=degToRad(lon);
  return new THREE.Vector3(r*Math.cos(a)*Math.cos(b),r*Math.sin(a),-r*Math.cos(a)*Math.sin(b));
}
function landSeaCenters(month=LANDSEA.month){
  return month===1 ? [
    {lat:50,lon:95,sx:34,sy:20,amp:26,name:'亚洲高压',symbol:'H'},
    {lat:52,lon:-170,sx:27,sy:17,amp:-20,name:'阿留申低压',symbol:'L'},
    {lat:62,lon:-30,sx:22,sy:14,amp:-15,name:'冰岛低压',symbol:'L'},
    {lat:45,lon:-105,sx:26,sy:17,amp:15,name:'北美高压',symbol:'H'},
    {lat:-23,lon:135,sx:24,sy:15,amp:-17,name:'澳大利亚低压',symbol:'L'}
  ] : [
    {lat:28,lon:75,sx:36,sy:19,amp:-28,name:'亚洲低压（印度低压）',symbol:'L'},
    {lat:32,lon:-155,sx:30,sy:17,amp:13,name:'夏威夷高压',symbol:'H'},
    {lat:32,lon:-35,sx:27,sy:17,amp:12,name:'亚速尔高压',symbol:'H'},
    {lat:35,lon:-105,sx:23,sy:18,amp:-17,name:'北美低压',symbol:'L'},
    {lat:-28,lon:135,sx:25,sy:15,amp:15,name:'澳大利亚高压',symbol:'H'}
  ];
}
function landSeaPressureAt(lat,lon,month=LANDSEA.month,surface=LANDSEA.surface){
  const shifted=lat-(month===7?5:-5),a=Math.abs(shifted);
  const g=(x,s)=>Math.exp(-.5*(x/s)**2);
  let p=1012-8*g(shifted,11)+9*g(a-30,12)-9*g(a-60,12)+12*g(a-90,13);
  if(surface==='real')for(const c of landSeaCenters(month)){
    const dl=((lon-c.lon+540)%360)-180;
    p+=c.amp*g(dl,c.sx)*g(lat-c.lat,c.sy);
  }
  return p;
}
function landSeaColor(p){
  const index=clamp(Math.floor((p-988)/8),0,LANDSEA_COLORS.length-2);
  const a=LANDSEA_COLORS[index],b=LANDSEA_COLORS[index+1];
  return new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),clamp((p-a[0])/8,0,1));
}
function clearLandSeaObjects(group){
  group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of [o.material].flat())m.dispose();}if(o.isCSS2DObject)o.element.remove();});
  group.clear();
}
function addLandSeaLabel(lat,lon,html,className='landsea-label'){
  const el=document.createElement('div');el.className=className;el.innerHTML=html;
  const obj=new CSS2DObject(el);obj.position.copy(landSeaPoint(lat,lon,5.18));
  landSeaGroup.add(obj);landSeaLabels.push(obj);return obj;
}
function createLandSeaVisual(){
  landSeaGroup=new THREE.Group();landSeaGroup.name='landsea';landSeaGroup.visible=false;earthGroup.add(landSeaGroup);
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=360;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  landSeaPressure=new THREE.Mesh(new THREE.SphereGeometry(5.07,96,64),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.38,depthWrite:false}));
  landSeaContours=new THREE.Group();landSeaWinds=new THREE.Group();landSeaReference=new THREE.Group();
  landSeaGroup.add(landSeaPressure,landSeaContours,landSeaWinds,landSeaReference);
  const idealCanvas=document.createElement('canvas');idealCanvas.width=360;idealCanvas.height=180;
  const idealTexture=new THREE.CanvasTexture(idealCanvas);idealTexture.colorSpace=THREE.SRGBColorSpace;
  landSeaIdeal=new THREE.Mesh(new THREE.SphereGeometry(5.065,64,48),new THREE.MeshBasicMaterial({map:idealTexture,transparent:true,opacity:.38,depthWrite:false}));landSeaGroup.add(landSeaIdeal);
  for(const lat of [-60,-30,0,30,60]){
    const points=Array.from({length:181},(_,i)=>landSeaPoint(lat,-180+i*2,5.16));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:Math.abs(lat)===30?0xffd166:0x8fd4f2,dashSize:.16,gapSize:.12,transparent:true,opacity:.7,depthWrite:false}));
    line.computeLineDistances();line.userData.latitude=lat;landSeaReference.add(line);
  }
  const legend=document.createElement('aside');legend.id='landsea-legend';legend.hidden=true;
  legend.innerHTML=`<h3>海平面气压 <small>hPa</small></h3><div class="landsea-scale"><div class="landsea-scale-bar"></div><div>${[...LANDSEA_COLORS].reverse().map(([p])=>`<span>${p}</span>`).join('')}</div></div><p>H 高压 · L 低压<br>色块、等压线为教学示意</p><div class="landsea-wind-key"><i></i> 近地面风向</div>`;
  document.body.append(legend);
  createLandSeaFormation();
  rebuildLandSea();
  // 形成机制模式使用独立的温度—气压—风场粒子层；结果模式继续保留原有等压线与风线。
  createLandSeaMechanismVisual();
  window.__landSeaDebug={state:LANDSEA,pressureAt:landSeaPressureAt,centers:landSeaCenters,setMonth:month=>setLandSeaOption('month',month),focus:focusLandSeaRegion,
    get group(){return landSeaGroup;},get labels(){return landSeaLabels;},get travelers(){return landSeaTravelers;},
    get formation(){return LANDSEA.formation;},stages:()=>formationStages('landsea'),level:key=>formationLevel('landsea',key),action:a=>formationAction('landsea',a),mechanism:landSeaMechanismDiagnostics};
}
function rebuildLandSea(){
  if(!landSeaGroup)return;
  const canvas=landSeaPressure.material.map.image,ctx=canvas.getContext('2d'),pixels=ctx.createImageData(canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const p=landSeaPressureAt(90-(y+.5)/canvas.height*180,(x+.5)/canvas.width*360-180),color=landSeaColor(p),i=(y*canvas.width+x)*4;
    // Color 内部为线性空间；CanvasTexture 声明 sRGB，所以写入前转回 sRGB。
    color.convertLinearToSRGB();pixels.data[i]=color.r*255;pixels.data[i+1]=color.g*255;pixels.data[i+2]=color.b*255;
    pixels.data[i+3]=clamp(50+Math.abs(p-1012)*7,50,210);
  }
  ctx.putImageData(pixels,0,0);landSeaPressure.material.map.needsUpdate=true;
  const idealCanvas=landSeaIdeal.material.map.image,ic=idealCanvas.getContext('2d');
  for(let y=0;y<idealCanvas.height;y++){const c=landSeaColor(landSeaPressureAt(90-y,0,LANDSEA.month,'ideal')).convertLinearToSRGB();ic.fillStyle='#'+c.getHexString(THREE.LinearSRGBColorSpace);ic.fillRect(0,y,idealCanvas.width,1);}
  landSeaIdeal.material.map.needsUpdate=true;
  clearLandSeaObjects(landSeaContours);clearLandSeaObjects(landSeaWinds);
  landSeaLabels.forEach(o=>{o.element.remove();landSeaGroup.remove(o);});landSeaLabels=[];landSeaTravelers=[];
  // Marching squares：在同一气压场上提取每隔4hPa的等压线，再贴到地球球面。
  const nx=180,ny=90,field=Array.from({length:ny+1},(_,y)=>Array.from({length:nx+1},(_,x)=>landSeaPressureAt(90-y*2,-180+x*2)));
  for(let level=988;level<=1036;level+=4){
    const vertices=[];let candidate=null,candidateScore=Infinity;
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],hits=[];
      for(let e=0;e<4;e++){
        const a=corners[e],b=corners[(e+1)%4],va=field[a[1]][a[0]],vb=field[b[1]][b[0]];
        if((va<level)===(vb<level))continue;
        const t=(level-va)/(vb-va);hits.push([90-lerp(a[1],b[1],t)*2,-180+lerp(a[0],b[0],t)*2]);
      }
      if(hits.length===4){
        // 鞍点按中心值选连接方式，避免等压线交叉。
        const middle=corners.reduce((sum,[xx,yy])=>sum+field[yy][xx],0)/4;
        if((middle<level)!==(field[y][x]<level))hits.push(hits.shift());
      }
      for(let i=0;i+1<hits.length;i+=2){
        for(const [lat,lon]of[hits[i],hits[i+1]])vertices.push(...landSeaPoint(lat,lon,5.11).toArray());
        const [lat,lon]=hits[i],nearCenter=landSeaCenters().some(c=>Math.hypot((lon-c.lon)*Math.cos(degToRad(lat)),lat-c.lat)<10),score=Math.abs(lon-110)+Math.abs(lat-35)*.35+(nearCenter?150:0);
        if(score<candidateScore&&lat>-45&&lat<70){candidate=hits[i];candidateScore=score;}
      }
    }
    if(vertices.length){
      landSeaContours.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)),new THREE.LineBasicMaterial({color:0xfff2cd,transparent:true,opacity:level%8===4?.52:.28,depthWrite:false})));
      if(level%8===4&&candidate)addLandSeaLabel(...candidate,String(level),'landsea-isobar');
    }
  }
  if(LANDSEA.surface==='real'){
    for(const c of landSeaCenters())addLandSeaLabel(c.lat,c.lon,`<strong>${c.symbol}</strong><span>${c.name}</span>`,'landsea-center '+(c.symbol==='H'?'high':'low'));
    createLandSeaWinds();
  }
  syncLandSeaVisual();
}
function landSeaWindRoutes(month=LANDSEA.month){
  return month===1 ? [
    [[49,108],[39,118],[26,134]],[[40,103],[29,116],[16,124]],[[31,109],[20,118],[8,121]],
    [[27,88],[19,80],[10,73]],[[24,94],[16,87],[6,81]],[[18,108],[9,103],[2,98]],
    [[-2,116],[-7,124],[-13,133]],[[33,151],[40,161],[48,174]],[[35,166],[42,179],[50,192]]
  ] : [
    [[15,144],[24,135],[35,123]],[[10,132],[20,124],[31,117]],[[5,121],[14,115],[23,108]],
    [[-15,70],[-6,60],[0,57],[9,66],[20,76]], [[-12,86],[-4,75],[1,73],[9,81],[19,89]],
    [[27,145],[31,134],[33,124]], [[-26,127],[-18,119],[-8,108]],[[36,171],[42,170],[48,163]]
  ];
}
function createLandSeaWinds(){
  const winter=LANDSEA.month===1;
  const routes=landSeaWindRoutes();
  for(const route of routes){
    const source=new THREE.CatmullRomCurve3(route.map(([lat,lon])=>landSeaPoint(lat,lon,5.19)));
    // 普通空间样条会穿过球体；逐点投影到球面，使整条路径保持贴地可见。
    const curve=new THREE.Curve();curve.getPoint=(t,target=new THREE.Vector3())=>target.copy(source.getPoint(t)).normalize().multiplyScalar(5.19);
    const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.018,5,false),new THREE.MeshBasicMaterial({color:0xffdf9f,transparent:true,opacity:.8,depthWrite:false}));landSeaWinds.add(tube);
    const makeHead=(t,color,radius,height)=>{
      const head=new THREE.Mesh(new THREE.ConeGeometry(radius,height,8),new THREE.MeshBasicMaterial({color}));
      head.position.copy(curve.getPoint(t));head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(t).normalize());landSeaWinds.add(head);return head;
    };
    makeHead(.94,0xff785c,.07,.23).userData.fixedWindHead=true;tube.userData.windTube=true;
    const head=makeHead(.35,0xffbd6e,.055,.17);landSeaTravelers.push({head,curve,offset:landSeaTravelers.length*.13});
  }
  if(winter){
    addLandSeaLabel(32,127,'西北季风','landsea-wind-label');addLandSeaLabel(15,75,'东北季风','landsea-wind-label');
  }else{
    addLandSeaLabel(25,133,'东南季风','landsea-wind-label');addLandSeaLabel(10,68,'西南季风','landsea-wind-label');
  }
  addLandSeaLabel(-2,57,'0° 赤道','landsea-isobar');
}
function prepareLandSeaStep(newStep){
  if(newStep===3&&STATE.step!==3){
    landSeaReturnRotation=earthGroup.rotation.y;earthGroup.rotation.y=0;
    landSeaReturnView={position:camera.position.clone(),target:controls.target.clone()};
  }else if(newStep!==3&&STATE.step===3){
    if(landSeaReturnRotation!==null)earthGroup.rotation.y=landSeaReturnRotation;
    if(landSeaReturnView){viewAnimation++;camera.position.copy(landSeaReturnView.position);controls.target.copy(landSeaReturnView.target);camera.lookAt(controls.target);controls.update();}
    landSeaReturnRotation=null;landSeaReturnView=null;
  }
}
function syncLandSeaVisual(){
  if(!landSeaGroup)return;
  const active=STATE.step===3;
  const regional=STATE.step>=3;
  landSeaGroup.visible=active;document.body.classList.toggle('landsea-active',active);
  document.getElementById('landsea-legend').hidden=!active||!STATE.showLegend||(LANDSEA.formation.view==='mechanism'&&!formationFinished('landsea'));
  updateSunStyle();
  document.getElementById('legend').style.display=regional?'none':STATE.showLegend?'block':'none';
  // 只在第四步调整球体外的大范围辉光，退出即恢复原透明度。
  for(const mesh of earthGroup.children){
    if(mesh.isMesh&&mesh.geometry.type==='SphereGeometry'&&mesh.geometry.parameters.radius>6){
      if(mesh.userData.landSeaOpacity===undefined)mesh.userData.landSeaOpacity=mesh.material.opacity;
      mesh.material.opacity=active?0:mesh.userData.landSeaOpacity;
    }
  }
  if(regional){
    singleCellGroup.visible=false;Object.values(threeCellGroups).forEach(g=>g.visible=false);
    latLabels.forEach(l=>{l.obj.userData.baseVisible=false;l.obj.visible=false;});
    pressureLabels.forEach(l=>{l.obj.userData.baseVisible=false;l.obj.visible=false;});
    windLabels.forEach(l=>{l.obj.userData.baseVisible=false;l.obj.visible=false;});
    pressureBeltMeshes.forEach(m=>m.visible=false);windArrowMeshes.forEach(m=>m.visible=false);
    applyLandSeaFormationVisual();
  }
  landSeaLabels.forEach(o=>o.visible=active&&STATE.showLabels);
  drawLandSeaFormation();
  syncLandSeaMechanism();
}
function applyLandSeaFormationVisual(){
  const f=LANDSEA.formation,mechanism=f.view==='mechanism'&&LANDSEA.surface==='real',band=formationLevel('landsea','band'),pressure=formationLevel('landsea','pressure'),wind=formationLevel('landsea','wind');
  const blend=mechanism?pressure*(.35+.65*band):1;
  // 机制模式由动态压力场接管，避免静态终态色块覆盖形成过程。
  landSeaPressure.visible=STATE.showPressure&&!mechanism;landSeaPressure.material.opacity=.38;
  landSeaIdeal.visible=STATE.showPressure&&mechanism&&blend<1;landSeaIdeal.material.opacity=.28*(1-blend);
  landSeaContours.visible=STATE.showPressure&&!mechanism;landSeaContours.children.forEach(m=>m.material.opacity=(m.material.userData.baseOpacity??=m.material.opacity));
  landSeaWinds.visible=STATE.showPaths&&!mechanism;
  for(const mesh of landSeaWinds.children){if(mesh.userData.windTube)mesh.geometry.setDrawRange(0,Math.floor(mesh.geometry.index.count*(mechanism?wind:1)/3)*3);if(mesh.userData.fixedWindHead)mesh.visible=!mechanism||wind>.94;}
  landSeaReference.visible=LANDSEA.reference||(mechanism&&band<1);
  document.getElementById('landsea-legend').hidden=STATE.step!==3||!STATE.showLegend||mechanism&&!formationFinished('landsea');
  const shift=(LANDSEA.month===7?5:-5)*(mechanism?formationLevel('landsea','bridge'):1);
  if(landSeaReference.userData.shift!==shift){for(const line of landSeaReference.children){const lat=clamp(line.userData.latitude+shift,-89,89),pos=line.geometry.attributes.position;for(let i=0;i<pos.count;i++){const p=landSeaPoint(lat,-180+i*2,5.16);pos.setXYZ(i,p.x,p.y,p.z);}pos.needsUpdate=true;line.computeLineDistances();}landSeaReference.userData.shift=shift;}
}
function updateLandSeaAnimation(dt){
  if(STATE.step!==3)return;
  advanceFormation('landsea',dt);
  if(STATE.playing&&!LESSON_STATE.open&&!document.hidden)LANDSEA.phase=(LANDSEA.phase+Math.min(dt,.05)*STATE.speed*.12)%1;
  applyLandSeaFormationVisual();
  for(const {head,curve,offset}of landSeaTravelers){
    const t=(LANDSEA.phase+offset)%1;head.visible=STATE.showParticles&&(LANDSEA.formation.view==='result'||t<=formationLevel('landsea','wind'));head.position.copy(curve.getPoint(t));head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(t).normalize());
  }
  for(const obj of landSeaLabels){
    const mechanism=LANDSEA.formation.view==='mechanism',windLabel=obj.element.classList.contains('landsea-wind-label'),center=obj.element.classList.contains('landsea-center');
    const reached=!mechanism||(windLabel?formationLevel('landsea','wind')===1:center?(obj.element.textContent.includes('亚洲')?formationLevel('landsea','pressure')>0:formationLevel('landsea','band')>0):formationLevel('landsea','band')>0);
    const fieldTime=lsTimeline();
    if(mechanism&&center){
      const c=landSeaCenters().find(c=>obj.element.textContent.includes(c.name));
      if(c){const p=lsPressure(c.lat,c.lon,fieldTime);obj.element.querySelector('strong').textContent=p>1012?'H':'L';obj.element.style.opacity=String(Math.min(1,(c.name.includes('亚洲')?formationLevel('landsea','pressure'):formationLevel('landsea','band'))));}
    }else obj.element.style.opacity='';
    const enabled=reached&&STATE.showLabels&&(windLabel?STATE.showPaths:STATE.showPressure)&&(!mechanism||center||windLabel);
    const p=obj.getWorldPosition(new THREE.Vector3()),normal=p.clone().sub(earthGroup.position).normalize();
    obj.visible=enabled&&normal.dot(camera.position.clone().sub(p))>.15;
  }
  updateFormationUI('landsea');drawLandSeaFormation();
  updateLandSeaMechanism(dt);
}
function focusLandSeaRegion(region){
  if(STATE.viewLocked)return;
  LANDSEA.region=region;viewAnimation++;
  const [lat,lon]=region==='pacific'?[20,170]:region==='america'?[20,-100]:[18,110];
  controls.target.set(SCENE_OFFSET_X,0,0);
  camera.position.copy(controls.target).addScaledVector(landSeaPoint(lat,lon,1).normalize(),getSceneFraming().distance);
  camera.lookAt(controls.target);controls.update();frameScene();
}
function setLandSeaOption(key,value){
  if(key==='month'&&![1,7].includes(value))return;
  LANDSEA[key]=value;
  if(key==='month'||key==='surface'){resetFormation('landsea');if(key==='surface'&&value==='ideal')LANDSEA.formation.view='result';LANDSEA.phase=0;rebuildLandSea();}
  else if(key==='region'){resetFormation('landsea');if(value!=='asia')LANDSEA.formation.view='result';focusLandSeaRegion(value);}
  else syncLandSeaVisual();
  if(STATE.step===3)updateStepPanel(3);
}
function renderLandSeaPanel(body,controlsPanel,navigation){
  const winter=LANDSEA.month===1,real=LANDSEA.surface==='real';
  controlsPanel.innerHTML=`<div class="landsea-controls"><div class="landsea-month" role="group" aria-label="月份"><button class="btn ${winter?'active':''}" data-landsea-month="1">1月 · 北半球冬季</button><button class="btn ${!winter?'active':''}" data-landsea-month="7">7月 · 北半球夏季</button></div><label>地表模型<select id="landsea-surface"><option value="real">真实海陆 · 气压中心</option><option value="ideal">均匀地表 · 理想气压带</option></select></label><label>观察区域<select id="landsea-region"><option value="asia">亚洲与印度洋</option><option value="pacific">太平洋</option><option value="america">美洲与大西洋</option></select></label><label class="landsea-reference"><input type="checkbox" id="landsea-reference">叠加理想气压带参考</label><div class="mechanism-actions"><button class="btn" id="landsea-play">${STATE.playing?'暂停气流':'播放气流'}</button><button class="btn" id="landsea-focus">回到区域视角</button></div></div>`;
  body.innerHTML=`<div class="mechanism-question" id="landsea-formation-question"></div><div class="landsea-globe-guide" ${LANDSEA.formation.view==='result'?'hidden':''}><button class="btn" id="landsea-globe-play">播放地球形成过程</button><p id="landsea-field-readout"></p><small id="landsea-field-key"></small><p id="landsea-field-values"></p></div>${formationControls('landsea')}<p class="model-note">温度响应、气柱调整、气压与微粒共享同一进度。近地面微粒随局地压力梯度、自转偏向和摩擦连续运动；海洋中心另含动力背景。季节尺度教学模型，非天气预报；高度和时间经夸张，辅助剖面可展开。其他区域用于结果对照。</p><button class="btn btn-sm" id="landsea-season-lesson">详细探究：季节移动</button><button class="btn btn-sm" id="landsea-related">读图练习：冬夏气压与季风</button>${formationDiagnosis()}`;
  navigation.innerHTML='<button class="btn" id="landsea-prev">第三步：理想三圈</button><button class="btn" id="landsea-next">第五步：季风与气候</button>';
  controlsPanel.querySelectorAll('[data-landsea-month]').forEach(b=>b.onclick=()=>setLandSeaOption('month',Number(b.dataset.landseaMonth)));
  for(const key of ['surface','region']){const el=document.getElementById('landsea-'+key);el.value=LANDSEA[key];el.onchange=()=>setLandSeaOption(key,el.value);}
  const reference=document.getElementById('landsea-reference');reference.checked=LANDSEA.reference;reference.onchange=()=>setLandSeaOption('reference',reference.checked);
  document.getElementById('landsea-play').onclick=()=>formationAction('landsea','play');
  document.getElementById('landsea-focus').onclick=()=>focusLandSeaRegion(LANDSEA.region);
  document.getElementById('landsea-prev').onclick=()=>transitionToStep(2);
  document.getElementById('landsea-next').onclick=()=>transitionToStep(4);
  document.getElementById('landsea-related').onclick=()=>{LESSON_STATE.surface=LANDSEA.surface;LESSON_STATE.monsoonSeason=winter?'winter':'summer';openLesson('monsoon');};
  document.getElementById('landsea-season-lesson').onclick=()=>openLesson('season');
  bindFormationControls('landsea');
  document.getElementById('landsea-globe-play').onclick=()=>{LANDSEA.formation.continuous=true;formationAction('landsea',formationFinished('landsea')?'restart':'play');};
  syncLandSeaMechanism();
}
