/* 第四步：经纬度固定的海陆气压与季风教学示意；不使用天气实测数据。 */
const LANDSEA = {month:1,surface:'real',reference:false,region:'asia',phase:0,entryShift:0,entrySeason:'',formation:{...newFormationState(),continuous:true}};
let landSeaGroup,landSeaPressure,landSeaContours,landSeaWinds,landSeaReference,landSeaIdeal,landSeaBandGuide,landSeaGeography;
let landSeaLabels=[],landSeaTravelers=[],landSeaReturnRotation=null,landSeaReturnView=null;
const LANDSEA_COLORS = [[988,'#64519e'],[996,'#527fb7'],[1004,'#58afce'],[1012,'#d3dabb'],[1020,'#f5cc56'],[1028,'#ed8540'],[1036,'#e34531']];
function landSeaSeasonShift(progress=1){return lerp(LANDSEA.entryShift,LANDSEA.month===7?8:-8,progress);}

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
  const shifted=lat-(month===7?8:-8),a=Math.abs(shifted);
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
  landSeaBandGuide=new THREE.Group();landSeaBandGuide.name='landsea-band-reference';landSeaGroup.add(landSeaBandGuide);
  const geographyMaterial=earthGroup.userData.surfaceMesh.material.clone();geographyMaterial.transparent=true;geographyMaterial.depthWrite=false;
  geographyMaterial.color.set(0xffffff);geographyMaterial.emissive.set(0);geographyMaterial.specular.set(0x222244);geographyMaterial.shininess=15;
  landSeaGeography=new THREE.Mesh(new THREE.SphereGeometry(5.015,96,64),geographyMaterial);landSeaGroup.add(landSeaGeography);
  landSeaGeography.name='landsea-geography-bridge';landSeaGeography.scale.copy(earthGroup.userData.surfaceMesh.scale);
  for(const lat of [-60,-30,0,30,60]){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(180*6*3),3));
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:Math.abs(lat)===30?0xffce67:0x78c4ef,side:THREE.DoubleSide,transparent:true,opacity:.35,depthWrite:false}));
    mesh.userData.latitude=lat;landSeaBandGuide.add(mesh);
  }
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
  // 形成机制使用温度—气压—风场，结果对照归纳为季风路径，两者共用贴球面箭头。
  createLandSeaMechanismVisual();
  createLandSeaStory();
  window.__landSeaDebug={state:LANDSEA,pressureAt:landSeaPressureAt,centers:landSeaCenters,setMonth:month=>setLandSeaOption('month',month),focus:focusLandSeaRegion,
    get group(){return landSeaGroup;},get labels(){return landSeaLabels;},get travelers(){return landSeaTravelers;},
    get formation(){return LANDSEA.formation;},get columnCamera(){return {active:LS_COLUMN_CAMERA.active,manual:LS_COLUMN_CAMERA.manual,saved:!!LS_COLUMN_CAMERA.saved};},stages:()=>formationStages('landsea'),level:key=>formationLevel('landsea',key),action:a=>formationAction('landsea',a),mechanism:landSeaMechanismDiagnostics};
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
  landSeaIdeal.userData.shift=undefined;landSeaBandGuide.userData.key=null;
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
// The same thin solid arrow follows a curved surface route or a local field vector.
function landSeaSurfaceArrow(curve,start=0,end=1,geometry=new THREE.BufferGeometry(),radius=5.20){
  const positions=[],indices=[],r=radius,point=t=>curve.getPoint(lerp(start,end,t));
  let length=0,previous=point(0);for(let i=1;i<=24;i++){const p=point(i/24);length+=p.distanceTo(previous);previous=p;}
  const neck=clamp(1-.23/Math.max(.01,length),.45,.94);
  for(const [a,b,n,width]of[[0,neck,32,()=>.033],[neck,1,8,u=>.115*(1-u)]]){
    const offset=positions.length/3;
    for(let i=0;i<=n;i++){
      const u=i/n,t=lerp(a,b,u),p=point(t),tangent=point(Math.min(1,t+.002)).sub(point(Math.max(0,t-.002))).normalize(),side=p.clone().normalize().cross(tangent).normalize();
      for(const sign of [-1,1])positions.push(...p.clone().addScaledVector(side,sign*width(u)).setLength(r).toArray());
      if(i<n){const k=offset+i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
  }
  if(!geometry.attributes.position){geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);}
  else{geometry.attributes.position.array.set(positions);geometry.attributes.position.needsUpdate=true;}
  geometry.computeBoundingSphere();return geometry;
}
function createLandSeaWinds(){
  const winter=LANDSEA.month===1;
  const routes=landSeaWindRoutes();
  for(const route of routes){
    const source=new THREE.CatmullRomCurve3(route.map(([lat,lon])=>landSeaPoint(lat,lon,5.19)));
    // 普通空间样条会穿过球体；逐点投影到球面，使整条路径保持贴地可见。
    const curve=new THREE.Curve();curve.getPoint=(t,target=new THREE.Vector3())=>target.copy(source.getPoint(t)).normalize().multiplyScalar(5.19);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),new THREE.LineBasicMaterial({color:0xffcc8a,transparent:true,opacity:.36,depthWrite:false}));landSeaWinds.add(line);
    const arrow=new THREE.Mesh(landSeaSurfaceArrow(curve,0,1),new THREE.MeshBasicMaterial({color:0xffcc8a,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}));arrow.name='landsea-result-wind-arrow';landSeaWinds.add(arrow);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.026,8,6),new THREE.MeshBasicMaterial({color:0xffe2b3,transparent:true,opacity:.85,depthWrite:false}));landSeaWinds.add(head);landSeaTravelers.push({head,curve,offset:landSeaTravelers.length*.13});
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
    if(STATE.step===2){
      LANDSEA.entryShift=STATE.seasonalShift||0;
      LANDSEA.entrySeason=Math.abs(LANDSEA.entryShift)<=1?'equinox':LANDSEA.entryShift>0?'summer':'winter';
      if(LANDSEA.entrySeason!=='equinox')LANDSEA.month=LANDSEA.entryShift>0?7:1;
      LANDSEA.surface='real';LANDSEA.region='asia';LANDSEA.formation.view='mechanism';
      resetFormation('landsea');rebuildLandSea();
    }
    landSeaReturnRotation=earthGroup.rotation.y;earthGroup.rotation.y=0;
    landSeaReturnView={position:camera.position.clone(),target:controls.target.clone()};
  }else if(newStep!==3&&STATE.step===3){
    releaseLandSeaColumnCamera();
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
  syncLandSeaLegend();
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
  landSeaLabels.forEach(o=>o.visible=active&&STATE.showLabels&&landSeaOverviewBlend()>0);
  drawLandSeaFormation();
  syncLandSeaMechanism();
  syncLandSeaStory();
}
function syncLandSeaLegend(){
  const overview=landSeaOverviewBlend(),legend=document.getElementById('landsea-legend');
  legend.hidden=STATE.step!==3||!STATE.showLegend||(LANDSEA.surface==='real'&&overview===0);
  legend.style.opacity=String(LANDSEA.surface==='real'?overview:1);
}
function updateLandSeaBandGuide(shift,band,mechanism){
  landSeaBandGuide.visible=STATE.showPressure&&(mechanism||LANDSEA.reference||LANDSEA.surface==='ideal');
  const target=LANDSEA.month===1?60:30,key=[shift,band,LANDSEA.month,mechanism].join(':');
  const fade=mechanism?1-landSeaOverviewBlend():1;
  landSeaBandGuide.visible&&=fade>0;
  for(const mesh of landSeaBandGuide.children)mesh.material.opacity=(mesh.userData.latitude===target?.58:mechanism?.08*(1-band):.20)*fade;
  if(landSeaBandGuide.userData.key===key)return;landSeaBandGuide.userData.key=key;
  if(landSeaIdeal.userData.shift!==shift){
    const canvas=landSeaIdeal.material.map.image,ctx=canvas.getContext('2d'),season=LANDSEA.month===7?8:-8;
    for(let y=0;y<canvas.height;y++){const c=landSeaColor(landSeaPressureAt(90-y+season-shift,0,LANDSEA.month,'ideal')).convertLinearToSRGB();ctx.fillStyle='#'+c.getHexString(THREE.LinearSRGBColorSpace);ctx.fillRect(0,y,canvas.width,1);}
    landSeaIdeal.material.map.needsUpdate=true;landSeaIdeal.userData.shift=shift;
  }
  for(const mesh of landSeaBandGuide.children){
    const lat=mesh.userData.latitude,selected=lat===target,pos=mesh.geometry.attributes.position;
    let i=0;
    for(let lon=-180;lon<180;lon+=2){
      // The continental interruption grows only at the band stage; ocean sectors remain traceable.
      const interrupted=selected&&lon>35&&lon<145,half=1.6*(interrupted?1-band:1);
      const at=(latitude,longitude)=>landSeaPoint(latitude+shift*clamp((90-Math.abs(latitude))/30,0,1),longitude,5.145);
      const a=at(lat-half,lon),b=at(lat+half,lon),c=at(lat-half,lon+2),d=at(lat+half,lon+2);
      for(const p of [a,b,c,b,d,c])pos.setXYZ(i++,p.x,p.y,p.z);
    }
    pos.needsUpdate=true;mesh.geometry.computeBoundingSphere();
  }
}
function applyLandSeaFormationVisual(){
  const f=LANDSEA.formation,mechanism=f.view==='mechanism'&&LANDSEA.surface==='real',band=formationLevel('landsea','band'),pressure=formationLevel('landsea','pressure'),bridge=formationLevel('landsea','bridge');
  const overview=mechanism?landSeaOverviewBlend():1;
  // 机制模式由动态压力场接管，避免静态终态色块覆盖形成过程。
  landSeaPressure.visible=STATE.showPressure&&overview>0;landSeaPressure.material.opacity=.38*overview;
  landSeaIdeal.visible=false;
  const surfaceStyle=LANDSEA.surface==='ideal'||(mechanism&&formationLevel('landsea','bridge')<1)?'smooth':'textured';
  if(STATE.step===3&&earthGroup.userData.surfaceStyle!==surfaceStyle)setEarthSurfaceStyle(surfaceStyle);
  if(STATE.step===3&&surfaceStyle==='textured')earthGroup.userData.surfaceMesh.material.color.set(0xa2afbc).lerp(new THREE.Color(0xffffff),overview);
  landSeaGeography.visible=mechanism&&bridge>0&&bridge<1;
  landSeaGeography.material.opacity=smoothstep(bridge);
  const surfaceMap=earthGroup.userData.originalSurfaceMap;
  if(surfaceMap&&landSeaGeography.material.map!==surfaceMap){landSeaGeography.material.map=surfaceMap;landSeaGeography.material.needsUpdate=true;}
  landSeaContours.visible=STATE.showPressure&&overview>0;landSeaContours.children.forEach(m=>m.material.opacity=(m.material.userData.baseOpacity??=m.material.opacity)*overview);
  landSeaWinds.visible=STATE.showPaths&&overview>0;
  landSeaWinds.children.forEach(m=>{m.material.opacity=(m.material.userData.baseOpacity??=m.material.opacity)*overview;});
  landSeaReference.visible=LANDSEA.reference||(mechanism&&band>0&&overview<1);
  for(const line of landSeaReference.children){line.visible=LANDSEA.reference||!mechanism||line.userData.latitude===(LANDSEA.month===1?60:30);line.material.opacity=.7*(LANDSEA.reference?1:1-overview);}
  syncLandSeaLegend();
  const shift=landSeaSeasonShift(mechanism?smoothstep(bridge):1);
  updateLandSeaBandGuide(shift,mechanism?band:LANDSEA.surface==='ideal'?0:1,mechanism);
  if(landSeaReference.userData.shift!==shift){for(const line of landSeaReference.children){const lat=clamp(line.userData.latitude+shift,-89,89),pos=line.geometry.attributes.position;for(let i=0;i<pos.count;i++){const p=landSeaPoint(lat,-180+i*2,5.16);pos.setXYZ(i,p.x,p.y,p.z);}pos.needsUpdate=true;line.computeLineDistances();}landSeaReference.userData.shift=shift;}
}
function updateLandSeaAnimation(dt){
  if(STATE.step!==3)return;
  advanceFormation('landsea',dt);
  updateLandSeaColumnCamera();
  if(STATE.playing&&!LESSON_STATE.open&&!document.hidden)LANDSEA.phase=(LANDSEA.phase+Math.min(dt,.05)*STATE.speed*.12)%1;
  applyLandSeaFormationVisual();
  for(const {head,curve,offset}of landSeaTravelers){
    const t=(LANDSEA.phase+offset)%1;head.visible=STATE.showParticles;head.position.copy(curve.getPoint(t));head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(t).normalize());
  }
  for(const obj of landSeaLabels){
    const overview=landSeaOverviewBlend(),windLabel=obj.element.classList.contains('landsea-wind-label'),center=obj.element.classList.contains('landsea-center');
    if(center){
      const c=landSeaCenters().find(c=>obj.element.textContent.includes(c.name));
      if(c){obj.element.querySelector('strong').textContent=c.symbol;obj.element.classList.toggle('high',c.symbol==='H');obj.element.classList.toggle('low',c.symbol==='L');}
    }
    const labelBlend=smoothstep(clamp((overview-.3)/.7,0,1));
    obj.element.style.opacity=String(labelBlend);
    const enabled=labelBlend>0&&STATE.showLabels&&(windLabel?STATE.showPaths:STATE.showPressure);
    const p=obj.getWorldPosition(new THREE.Vector3()),normal=p.clone().sub(earthGroup.position).normalize();
    // The globe animation supplies its own short pressure labels in mechanism view.
    obj.visible=enabled&&normal.dot(camera.position.clone().sub(p))>.15;
  }
  layoutLandSeaLabels();
  updateFormationUI('landsea');drawLandSeaFormation();
  updateLandSeaMechanism(dt);
  syncLandSeaStory();
}
function layoutLandSeaLabels(){
  const aux=document.getElementById('landsea-formation'),rect=aux.getBoundingClientRect(),occupied=[];
  const bounds=obj=>{
    const p=obj.getWorldPosition(new THREE.Vector3()).project(camera),el=obj.element,display=el.style.display;
    // CSS2DRenderer hides rejected labels with display:none. Measure their actual
    // size before collision checks so a hidden label cannot return with zero size.
    if(display==='none')el.style.display='';
    const w=el.offsetWidth,h=el.offsetHeight;el.style.display=display;
    return {left:(p.x+1)*innerWidth/2-w/2,right:(p.x+1)*innerWidth/2+w/2,top:(1-p.y)*innerHeight/2-h/2,bottom:(1-p.y)*innerHeight/2+h/2};
  };
  const intersects=(a,b,pad=5)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
  for(const obj of [...landSeaLabels].sort((a,b)=>Number(b.element.classList.contains('landsea-center'))-Number(a.element.classList.contains('landsea-center')))){
    if(!obj.visible)continue;
    const r=bounds(obj),number=obj.element.classList.contains('landsea-isobar');
    if((number&&innerWidth<=1100)||r.left<8||r.right>innerWidth-8||occupied.some(a=>intersects(a,r))||(!aux.hidden&&innerWidth>1100&&intersects(rect,r))){obj.visible=false;continue;}
    occupied.push(r);
  }
}
function focusLandSeaRegion(region){
  if(STATE.viewLocked)return;
  releaseLandSeaColumnCamera();
  LANDSEA.region=region;viewAnimation++;
  const [lat,lon]=region==='pacific'?[20,170]:region==='america'?[20,-100]:[26,125];
  controls.target.set(SCENE_OFFSET_X,0,0);
  camera.position.copy(controls.target).addScaledVector(landSeaPoint(lat,lon,1).normalize(),getSceneFraming().distance);
  camera.lookAt(controls.target);controls.update();frameScene();
}
function setLandSeaOption(key,value){
  if(key==='month'&&![1,7].includes(value))return;
  if(key==='month'&&LANDSEA.month===value)return;
  // Compare the same completed or partial stage in both months, with motion paused.
  const saved=key==='month'?{...LANDSEA.formation}:null;
  LANDSEA[key]=value;
  if(key==='month'||key==='surface'){LANDSEA.entryShift=LANDSEA.month===7?8:-8;LANDSEA.entrySeason='';resetFormation('landsea');if(saved)Object.assign(LANDSEA.formation,saved,{reveal:false,clock:0});if(key==='surface'&&value==='ideal')LANDSEA.formation.view='result';LANDSEA.phase=0;rebuildLandSea();}
  else if(key==='region'){resetFormation('landsea');if(value!=='asia')LANDSEA.formation.view='result';focusLandSeaRegion(value);}
  else syncLandSeaVisual();
  if(STATE.step===3)updateStepPanel(3);
}
function renderLandSeaPanel(body,controlsPanel,navigation){
  const winter=LANDSEA.month===1,real=LANDSEA.surface==='real';
  controlsPanel.innerHTML=`<div class="landsea-controls"><div class="landsea-month" role="group" aria-label="月份"><button class="btn ${winter?'active':''}" data-landsea-month="1">1月 · 北半球冬季</button><button class="btn ${!winter?'active':''}" data-landsea-month="7">7月 · 北半球夏季</button></div><label>地表模型<select id="landsea-surface"><option value="real">真实海陆 · 气压中心</option><option value="ideal">均匀地表 · 理想气压带</option></select></label><label>观察区域<select id="landsea-region"><option value="asia">亚洲与印度洋</option><option value="pacific">太平洋</option><option value="america">美洲与大西洋</option></select></label><label class="landsea-reference"><input type="checkbox" id="landsea-reference">叠加理想气压带参考</label><div class="mechanism-actions"><button class="btn" id="landsea-play">${STATE.playing?'暂停气流':'播放气流'}</button><button class="btn" id="landsea-focus">回到区域视角</button></div></div>`;
  body.innerHTML=`<div class="mechanism-question" id="landsea-formation-question"></div><p class="landsea-season-note">${winter?'1月 · 北半球冬季 · 气压带偏南':'7月 · 北半球夏季 · 气压带偏北'}<small>季节移动 → 加入海陆 → 气压中心 → 季风</small></p><div class="landsea-globe-guide" ${LANDSEA.formation.view==='result'?'hidden':''}><p id="landsea-field-readout"></p><small id="landsea-field-key"></small><p id="landsea-field-values"></p></div>${formationControls('landsea')}<details class="landsea-more"><summary>拓展与模型说明</summary><button class="btn btn-sm" id="landsea-globe-play">连续复习形成过程</button><p class="model-note">季节尺度教学示意。温度、气柱、气压和微粒共享进度；近地面气流受气压梯度、自转偏向及摩擦共同影响。海洋中心还包含动力背景。高度与时间经夸张，其他地区供结果对照。</p><button class="btn btn-sm" id="landsea-season-lesson">详细探究：季节移动</button><button class="btn btn-sm" id="landsea-related">读图练习：冬夏气压与季风</button>${formationDiagnosis()}</details>`;
  body.insertAdjacentHTML('afterbegin',`<div class="landsea-stage-controls"><div class="landsea-month"><button class="btn ${winter?'active':''}" data-stage-month="1">1月 · 冬季</button><button class="btn ${!winter?'active':''}" data-stage-month="7">7月 · 夏季</button></div>${LANDSEA.formation.view==='mechanism'?`<label>回看动画阶段<select id="landsea-stage">${formationStages('landsea').map((stage,i)=>`<option value="${i}">${i+1}. ${stage.title}</option>`).join('')}</select></label>`:''}</div>`);
  body.querySelectorAll('[data-stage-month]').forEach(b=>b.onclick=()=>setLandSeaOption('month',Number(b.dataset.stageMonth)));
  const stage=document.getElementById('landsea-stage');if(stage){stage.value=String(LANDSEA.formation.node);stage.onchange=e=>seekLandSeaStage(Number(e.target.value));}
  navigation.innerHTML='<button class="btn" id="landsea-prev">返回第三步</button><button class="btn" id="landsea-next">第五步：季风与气候</button>';
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
