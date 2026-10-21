/* Seasonal teaching model: temperature relaxation -> column mass -> pressure
   -> local velocity. u east, v north; NH Coriolis: (f*v,-f*u).
   Result mode summarizes the seasonal routes with the same surface arrow shape. */
let landSeaMechanism=null;
const LS_FIELD={nx:41,ny:29,west:45,east:165,south:-15,north:69,count:220,tail:10,windSeconds:8000,travelSeconds:22000};
const LS_COASTS=[
 [[40,70],[160,70],[160,60],[144,50],[140,46],[134,43],[129,40],[129,35],[121,39],[122,31],[120,25],[113,22],[109,18],[108,12],[104,9],[101,1],[98,5],[98,17],[93,21],[90,22],[86,20],[80,8],[76,9],[73,20],[67,25],[58,26],[52,30],[45,30]],
 [[130,31],[132,34],[136,35],[140,40],[142,43],[145,44],[143,39],[139,35],[136,33]],
 [[80,6],[82,6],[82,9],[80,10]],[[120,23],[122,24],[122,26],[121,25]]
];
function lsInside(lon,lat,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];
  if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;}
 return inside;
}
function landSeaMechanismLand(lat,lon){
 let land=0;for(const dx of [-.6,.6])for(const dy of [-.6,.6])
  if(LS_COASTS.some(p=>lsInside(lon+dx,lat+dy,p)))land+=.25;
 return land;
}
function lsTimeline(){const f=LANDSEA.formation,s=formationStages('landsea');
 return s.slice(0,f.node).reduce((sum,x)=>sum+x.duration,0)+f.progress*s[f.node].duration;}
function lsLevels(t){const q={};let start=0;for(const s of formationStages('landsea')){
 q[s.key]=smoothstep(clamp((t-start)/s.duration,0,1));start+=s.duration;}return q;}
function lsResponse(t,tau){
 const ramp=LS_STAGE_SECONDS.heat;
 t=Math.max(0,t);return t<=ramp?(t-tau*(1-Math.exp(-t/tau)))/ramp:
  1-tau/ramp*(1-Math.exp(-ramp/tau))*Math.exp(-(t-ramp)/tau);
}
function lsHeatingTime(t){return t-LS_STAGE_SECONDS.bridge;}
function lsTemperature(lat,lon,t){
 const land=landSeaMechanismLand(lat,lon),sign=LANDSEA.month===7?1:-1;
 return sign*Math.max(.15,Math.sin(degToRad(lat)))*
  (24*land*lsResponse(lsHeatingTime(t),1.1)+10*(1-land)*lsResponse(lsHeatingTime(t),5.2));
}
function lsPressure(lat,lon,t){
 const q=lsLevels(t),shift=landSeaSeasonShift(q.bridge),a=Math.abs(lat-shift),
  g=(x,s)=>Math.exp(-.5*(x/s)**2);
 let p=1012-8*g(lat-shift,11)+9*g(a-30,12)-9*g(a-60,12)+12*g(a-90,13);
 for(const c of landSeaCenters()){
  const continental=/亚洲|北美|澳大利亚/.test(c.name);
  // Continental mass anomaly follows the delayed thermal response. Ocean dynamic forcing is independent.
  const weight=continental?q.pressure*lsResponse(lsHeatingTime(t),1.1):q.band,dl=((lon-c.lon+540)%360)-180;
  p+=c.amp*weight*g(dl,c.sx)*g(lat-c.lat,c.sy);}
 return p;
}
function lsUpperPressure(lat,lon,t){
 const q=lsLevels(t),c=landSeaCenters()[0],dl=((lon-c.lon+540)%360)-180;
 // Thermal thickness: warming raises pressure at the same upper height; cooling lowers it.
 return 550+(LANDSEA.month===7?1:-1)*16*lsResponse(lsHeatingTime(t),1.1)*q.column*
  Math.exp(-.5*((dl/32)**2+((lat-c.lat)/20)**2));
}
function lsAcceleration(u,v,aE,aN,lat,drag,coriolis=1){
 const f=1.458e-4*Math.sin(degToRad(lat))*coriolis;
 return {u:aE+f*v-drag*u,v:aN-f*u-drag*v};
}
function lsMomentum(u,v,aE,aN,lat,drag,seconds){
 // Exact local integration of the pressure force + Coriolis + drag linear system.
 const f=1.458e-4*Math.sin(degToRad(lat)),den=drag*drag+f*f,
  ue=(drag*aE+f*aN)/den,ve=(drag*aN-f*aE)/den,
  decay=Math.exp(-drag*seconds),angle=f*seconds,du=u-ue,dv=v-ve,c=Math.cos(angle),s=Math.sin(angle);
 return {u:ue+decay*(du*c+dv*s),v:ve+decay*(dv*c-du*s)};
}
function lsGradient(lat,lon,t,layer='surface'){
 const field=layer==='upper'?lsUpperPressure:lsPressure,h=.65,cos=Math.max(.23,Math.cos(degToRad(lat)));
 // hPa / degree -> acceleration m/s² at representative near-surface density.
 return {u:-(field(lat,lon+h,t)-field(lat,lon-h,t))/(2*h*cos)*.000748,
  v:-(field(lat+h,lon,t)-field(lat-h,lon,t))/(2*h)*.000748};
}
function lsGrid(){const n=LS_FIELD.nx*LS_FIELD.ny;return {u:new Float64Array(n),v:new Float64Array(n)};}
function lsStepField(m,t,dt){
 const q=lsLevels(t);
 for(let y=0;y<LS_FIELD.ny;y++)for(let x=0;x<LS_FIELD.nx;x++){
  const lat=lerp(LS_FIELD.south,LS_FIELD.north,y/(LS_FIELD.ny-1)),
   lon=lerp(LS_FIELD.west,LS_FIELD.east,x/(LS_FIELD.nx-1)),i=y*LS_FIELD.nx+x;
  for(const layer of ['surface','upper']){
   const grid=m[layer],grad=lsGradient(lat,lon,t,layer),drag=layer==='surface'?1.2e-4:5e-5,
    drive=layer==='surface'?q.wind:q.column,background=lat>30?3:-2;
   const aE=grad.u*drive+drag*background*.18*q.band*drive,aN=grad.v*drive;
   const w=lsMomentum(grid.u[i],grid.v[i],aE,aN,lat,drag,dt*LS_FIELD.windSeconds);
   grid.u[i]=w.u;grid.v[i]=w.v;}
 }
}
function lsSampleGrid(grid,lat,lon){
 const gx=clamp((lon-LS_FIELD.west)/(LS_FIELD.east-LS_FIELD.west)*(LS_FIELD.nx-1),0,LS_FIELD.nx-1.001),
  gy=clamp((lat-LS_FIELD.south)/(LS_FIELD.north-LS_FIELD.south)*(LS_FIELD.ny-1),0,LS_FIELD.ny-1.001),
  x=Math.floor(gx),y=Math.floor(gy),fx=gx-x,fy=gy-y,i=y*LS_FIELD.nx+x;
 const sample=a=>lerp(lerp(a[i],a[i+1],fx),lerp(a[i+LS_FIELD.nx],a[i+LS_FIELD.nx+1],fx),fy);
 return {u:sample(grid.u),v:sample(grid.v)};
}
function lsRandom(i,j){const n=Math.sin((i+1)*127.1+(j+1)*311.7)*43758.5453;return n-Math.floor(n);}
function lsSeedParticle(i,generation=0){
 const layer=i<160?'surface':i<196?'upper':'column',
  lat=layer==='column'?28+lsRandom(i,generation+2)*22:-4+lsRandom(i,generation+2)*65,
  lon=layer==='column'?93+lsRandom(i,generation+3)*18:52+lsRandom(i,generation+3)*106,
  r=layer==='upper'?5.66:layer==='column'?5.20+lsRandom(i,generation+4)*.47:5.20;
 return {i,generation,layer,lat,lon,r,age:lsRandom(i,generation+5)*4,
  history:Array.from({length:LS_FIELD.tail},()=>({lat,lon,r})),trailClock:0};
}
function lsRate(m,p,lat,lon){
 const w=lsSampleGrid(m[p.layer==='upper'?'upper':'surface'],lat,lon);
 return {lat:w.v/111320,lon:w.u/(111320*Math.max(.23,Math.cos(degToRad(lat))))};
}
function lsStepParticles(m,t,dt){
 const q=lsLevels(t),sign=LANDSEA.month===7?1:-1;
 for(const i of m.activeParticleIndices){
  let p=m.particles[i];
  if(p.layer==='column')p.r+=sign*q.column*dt*.21;
  else{
   // RK2 midpoint sampling of the evolving local velocity field.
   const step=dt*LS_FIELD.travelSeconds,k1=lsRate(m,p,p.lat,p.lon),
    k2=lsRate(m,p,p.lat+k1.lat*step*.5,p.lon+k1.lon*step*.5);
   p.lat+=k2.lat*step;p.lon+=k2.lon*step;
  }
  p.age+=dt;
  if(p.lon<LS_FIELD.west||p.lon>LS_FIELD.east||p.lat<LS_FIELD.south||
   p.lat>LS_FIELD.north||p.r<5.19||p.r>5.72||(p.layer!=='column'&&p.age>10)){
   // Vertical tracers stay in the same local column. A lifetime reset used to
   // teleport them across the continent, obscuring the radial motion.
   const previous=p;
   p=lsSeedParticle(i,p.generation+1);
   if(p.layer==='column'){p.lat=previous.lat;p.lon=previous.lon;p.r=sign>0?5.20:5.70;p.age=0;}
   p.history=Array.from({length:LS_FIELD.tail},()=>({lat:p.lat,lon:p.lon,r:p.r}));
   m.particles[i]=p;
  }
  p.trailClock+=dt;
  if(p.trailClock>=.055){p.history.unshift({lat:p.lat,lon:p.lon,r:p.r});p.history.length=LS_FIELD.tail;p.trailClock=0;}
 }
}
function lsSeek(m,t){
 m.surface=lsGrid();m.upper=lsGrid();m.particles=Array.from({length:LS_FIELD.count},(_,i)=>lsSeedParticle(i));
 // Scrubs reconstruct the requested stage from one deterministic history.
 let cursor=0;while(cursor<t-1e-7){const dt=Math.min(.12,t-cursor);cursor+=dt;
  lsStepField(m,cursor,dt);lsStepParticles(m,cursor,dt);}
 m.t=t;m.renderT=-1;m.month=LANDSEA.month;
}
function lsStepTo(m,t){
 if(m.month!==LANDSEA.month||t<m.t-1e-7||m.t<0){lsSeek(m,t);return;}
 let cursor=m.t;while(cursor<t-1e-7){const dt=Math.min(.05,t-cursor);cursor+=dt;
  lsStepField(m,cursor,dt);lsStepParticles(m,cursor,dt);}m.t=t;
}
function lsPaint(m,t){
 for(const [kind,mesh]of [['temperature',m.tempMesh],['pressure',m.pressureMesh]]){
  const canvas=mesh.material.map.image,ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,data=ctx.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const lat=90-(y+.5)/h*180,lon=(x+.5)/w*360-180,i=(y*w+x)*4;let color,alpha;
   if(kind==='temperature'){
    const a=lsTemperature(lat,lon,t),fade=clamp((lon-45)/10,0,1)*clamp((165-lon)/10,0,1)*
     clamp((lat+10)/10,0,1)*clamp((70-lat)/10,0,1);
    color=new THREE.Color(a<0?'#58baff':'#ff9567');alpha=Math.min(110,Math.abs(a)*9)*fade;
   }else{const p=lsPressure(lat,lon,t);color=landSeaColor(p);alpha=clamp(40+Math.abs(p-1012)*5,40,160);}
   color.convertLinearToSRGB();data.data[i]=color.r*255;data.data[i+1]=color.g*255;data.data[i+2]=color.b*255;data.data[i+3]=alpha;
  }
  ctx.putImageData(data,0,0);mesh.material.map.needsUpdate=true;
 }
 // Marching squares shares the pressure function used for advection; buffers are reused.
 const nx=90,ny=45,field=new Float64Array((nx+1)*(ny+1));
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)field[y*(nx+1)+x]=lsPressure(90-y*4,-180+x*4,t);
 const pos=m.contours.geometry.attributes.position;let count=0;
 for(let level=988;level<=1040;level+=4)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],hits=[];
  for(let e=0;e<4;e++){const a=corners[e],b=corners[(e+1)%4],
   va=field[a[1]*(nx+1)+a[0]],vb=field[b[1]*(nx+1)+b[0]];
   if((va<level)===(vb<level))continue;const k=(level-va)/(vb-va);
   hits.push([90-lerp(a[1],b[1],k)*4,-180+lerp(a[0],b[0],k)*4]);}
  if(hits.length===4){const mid=corners.reduce((s,[xx,yy])=>s+field[yy*(nx+1)+xx],0)/4;
   if((mid<level)!==(field[y*(nx+1)+x]<level))hits.push(hits.shift());}
  for(let j=0;j+1<hits.length;j+=2)for(const hit of [hits[j],hits[j+1]]){
   if(count>=pos.count)break;const p=landSeaPoint(hit[0],hit[1],5.13);pos.setXYZ(count++,p.x,p.y,p.z);}
 }
 pos.needsUpdate=true;m.contours.geometry.setDrawRange(0,count);m.contourVertices=count;m.renderT=t;m.fieldFrames++;
}
function lsRenderParticles(m){
 const points=m.points.geometry.attributes.position,trails=m.trails.geometry.attributes.position;
 for(const i of m.activeParticleIndices){
  let lineIndex=i*(LS_FIELD.tail-1)*2;
  const p=m.particles[i],v=landSeaPoint(p.lat,p.lon,p.r);points.setXYZ(i,v.x,v.y,v.z);
  for(let j=0;j<LS_FIELD.tail-1;j++)for(const a of [p.history[j],p.history[j+1]]){
   const v=landSeaPoint(a.lat,a.lon,a.r);trails.setXYZ(lineIndex++,v.x,v.y,v.z);}
 }
 points.needsUpdate=true;trails.needsUpdate=true;
}
function lsAlphaMaterial(material){
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float particleAlpha;\nvarying float vParticleAlpha;')
   .replace('#include <color_vertex>','#include <color_vertex>\nvParticleAlpha = particleAlpha;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vParticleAlpha;')
   .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vParticleAlpha;');
  if(material.isPointsMaterial){
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float columnMarker;\nvarying float vColumnMarker;')
    .replace('gl_PointSize = size;','vColumnMarker = columnMarker;\ngl_PointSize = size * mix(1.0, 1.65, columnMarker);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vColumnMarker;')
    .replace('#include <color_fragment>',`#include <color_fragment>
     if(vColumnMarker > 0.5){
      float radius = length(gl_PointCoord - vec2(0.5));
      diffuseColor.rgb = mix(vec3(1.0), vec3(0.025, 0.065, 0.10), smoothstep(0.28, 0.35, radius));
      diffuseColor.a = opacity * (1.0 - smoothstep(0.44, 0.50, radius));
     }`);
  }
 };
 material.customProgramCacheKey=()=> 'landsea-particle-alpha-column-v2';
 return material;
}
function applyLandSeaParticleSettings(){
 const m=landSeaMechanism;if(!m)return;
 const key=STATE.density+':'+STATE.lowPerf;if(m.particleSettings===key)return;
 const factor=(STATE.density==='sparse'?.5:STATE.density==='dense'?1:.75)*(STATE.lowPerf?.4:1);
 m.activeParticleIndices=[];
 for(const [start,count] of [[0,160],[160,36],[196,24]]){
  const budget=Math.max(1,Math.floor(count*factor));
  for(let j=0;j<budget;j++)m.activeParticleIndices.push(start+Math.floor(j*count/budget));
 }
 m.points.geometry.setIndex(m.activeParticleIndices);
 const trailIndices=[];
 for(const i of m.activeParticleIndices)for(let j=0;j<(LS_FIELD.tail-1)*2;j++)trailIndices.push(i*(LS_FIELD.tail-1)*2+j);
 m.trails.geometry.setIndex(trailIndices);
 m.points.geometry.setDrawRange(0,m.activeParticleIndices.length);
 m.trails.geometry.setDrawRange(0,trailIndices.length);
 m.points.material.size=STATE.lowPerf?.19:.15;
 m.particleSettings=key;m.t=-1;
}
function createLandSeaMechanismVisual(){
 if(landSeaMechanism)return;
 const group=new THREE.Group();group.name='landsea-mechanism-field';landSeaGroup.add(group);
 function sphere(r){const canvas=document.createElement('canvas');canvas.width=240;canvas.height=120;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,72,48),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.30,depthWrite:false}));
  group.add(mesh);return mesh;}
 const tempMesh=sphere(5.075),pressureMesh=sphere(5.09),n=LS_FIELD.count,
  pointGeo=new THREE.BufferGeometry(),trailGeo=new THREE.BufferGeometry();
 pointGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));
 pointGeo.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));
 pointGeo.setAttribute('particleAlpha',new THREE.Float32BufferAttribute(new Float32Array(n),1));
 pointGeo.setAttribute('columnMarker',new THREE.Float32BufferAttribute(Array.from({length:n},(_,i)=>i>=196?1:0),1));
 trailGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(n*(LS_FIELD.tail-1)*6),3));
 trailGeo.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(n*(LS_FIELD.tail-1)*6),3));
 trailGeo.setAttribute('particleAlpha',new THREE.Float32BufferAttribute(new Float32Array(n*(LS_FIELD.tail-1)*2),1));
 const sprite=document.createElement('canvas');sprite.width=sprite.height=32;
 const ctx=sprite.getContext('2d'),gradient=ctx.createRadialGradient(16,16,0,16,16,16);
 gradient.addColorStop(0,'white');gradient.addColorStop(.3,'#ffffffdd');gradient.addColorStop(1,'#ffffff00');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
 const points=new THREE.Points(pointGeo,lsAlphaMaterial(new THREE.PointsMaterial({vertexColors:true,map:new THREE.CanvasTexture(sprite),
  size:.15,transparent:true,opacity:.9,depthWrite:false}))),
  trails=new THREE.LineSegments(trailGeo,lsAlphaMaterial(new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65,depthWrite:false})));
 points.frustumCulled=trails.frustumCulled=false;group.add(points,trails);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(50000*3),3));geo.setDrawRange(0,0);
 const contours=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xfff0c9,transparent:true,opacity:.33,depthWrite:false}));
 contours.frustumCulled=false;group.add(contours);
 landSeaMechanism={group,tempMesh,pressureMesh,points,trails,contours,surface:lsGrid(),upper:lsGrid(),particles:[],
  t:-1,month:LANDSEA.month,renderT:-1,fieldFrames:0,contourVertices:0,activeParticleIndices:[]};
 landSeaMechanism.arrows=[];
 for(const lat of [12,26,40])for(const lon of [80,105,130,150]){
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0xffcc8a,side:THREE.DoubleSide,transparent:true,depthWrite:false}));
  mesh.name='landsea-field-wind-arrow';
  mesh.frustumCulled=false;mesh.visible=false;group.add(mesh);landSeaMechanism.arrows.push({lat,lon,mesh});
 }
 applyLandSeaParticleSettings();
 createLandSeaColumnInset();
 syncLandSeaMechanism();
}
function resetLandSeaMechanism(){if(landSeaMechanism)landSeaMechanism.t=-1;}
function syncLandSeaMechanism(){
 const m=landSeaMechanism;if(!m)return;
 const active=STATE.step===3&&LANDSEA.surface==='real'&&LANDSEA.formation.view==='mechanism';m.group.visible=active;
 if(!active){drawLandSeaColumnInset(m,false);return;}
 const t=lsTimeline();lsStepTo(m,t);const q=lsLevels(t);
 if(t!==m.renderT&&(Math.abs(t-m.renderT)>.10||t===0||LANDSEA.formation.progress===1))lsPaint(m,t);
 lsRenderParticles(m);
 // The main lesson uses two marked comparison areas and a few explanatory arrows.
 // Numerical textures and particle integration remain available to the detailed diagrams.
 m.tempMesh.visible=m.pressureMesh.visible=m.contours.visible=m.points.visible=m.trails.visible=false;
 m.arrows.forEach(({mesh})=>mesh.visible=false);
 const colors=m.points.geometry.attributes.color,trailColors=m.trails.geometry.attributes.color,
  alpha=m.points.geometry.attributes.particleAlpha,trailAlpha=m.trails.geometry.attributes.particleAlpha;
 for(const i of m.activeParticleIndices){
  const visible=i<160?q.wind>0:q.column>0,c=new THREE.Color(i<160?'#ffcd8a':i<196?'#80d9fa':'#e8fbff');
  alpha.setX(i,visible?1:0);
  colors.setXYZ(i,c.r,c.g,c.b);
  for(let j=0;j<LS_FIELD.tail-1;j++)for(let k=0;k<2;k++){
   const opacity=visible?(1-j/(LS_FIELD.tail-1))*.7:0;
   const index=i*(LS_FIELD.tail-1)*2+j*2+k;
   trailColors.setXYZ(index,c.r,c.g,c.b);trailAlpha.setX(index,opacity);}
 }
 colors.needsUpdate=true;trailColors.needsUpdate=true;alpha.needsUpdate=true;trailAlpha.needsUpdate=true;updateLandSeaFieldCopy(t,q);
 drawLandSeaColumnInset(m,q.column>0);
}
function syncLandSeaFieldArrows(m,q){
 const key=[m.t,STATE.showPaths].join(':');if(m.arrowFrame===key)return;m.arrowFrame=key;
 for(const {lat,lon,mesh}of m.arrows){
  const velocity=lsSampleGrid(m.surface,lat,lon),speed=Math.hypot(velocity.u,velocity.v);
  mesh.visible=STATE.showPaths&&q.wind>0&&speed>.15;if(!mesh.visible)continue;
  const center=landSeaPoint(lat,lon,5.20),east=landSeaPoint(lat,lon+.1,5.20).sub(center).normalize(),north=landSeaPoint(lat+.1,lon,5.20).sub(center).normalize();
  const tangent=east.multiplyScalar(velocity.u).addScaledVector(north,velocity.v).normalize(),length=.58+.22*clamp(speed/8,0,1);
  landSeaSurfaceArrow({getPoint:t=>center.clone().addScaledVector(tangent,(t-.5)*length).setLength(5.20)},0,1,mesh.geometry);mesh.material.opacity=q.wind;
 }
}
function createLandSeaColumnInset(){
 const panel=document.getElementById('landsea-formation');if(!panel)return;
 const inset=document.createElement('div');inset.id='landsea-column-inset';inset.hidden=true;
 inset.innerHTML='<div class="column-inset-title"><b>大陆局部侧视 · 垂直运动放大</b><span id="landsea-column-direction"></span></div><canvas id="landsea-column-canvas" width="720" height="220" role="img" aria-label="与地球白色粒子同步的大陆垂直运动侧视图"></canvas><small>当地竖直 = 垂直于地表；高度与时间为示意</small>';
 panel.querySelector('.landsea-aux-content').prepend(inset);
}
function drawLandSeaColumnInset(m,visible){
 const inset=document.getElementById('landsea-column-inset');if(!inset)return;
 inset.hidden=!visible;document.getElementById('landsea-formation').classList.toggle('column-active',visible);if(!visible)return;
 const signature=[m.t,LANDSEA.month,STATE.showParticles,STATE.showPaths,m.activeParticleIndices.length].join(':');
 if(inset.dataset.frame===signature)return;inset.dataset.frame=signature;
 const winter=LANDSEA.month===1,canvas=document.getElementById('landsea-column-canvas'),ctx=canvas.getContext('2d');
 document.getElementById('landsea-column-direction').textContent=winter?'冬季 ↓ 下沉':'夏季 ↑ 上升';
 ctx.clearRect(0,0,720,220);ctx.fillStyle='#0c1e2e';ctx.fillRect(0,0,720,220);
 const top=25,ground=185;
 ctx.fillStyle=winter?'#284e65':'#794c38';ctx.fillRect(95,ground,610,35);
 formationText(ctx,'高空',48,top,'#9fc1d8',21,'center');formationText(ctx,'近地面',48,ground,'#9fc1d8',21,'center');
 ctx.strokeStyle='#4c6c80';ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(95,top);ctx.lineTo(705,top);ctx.stroke();ctx.setLineDash([]);
 const columns=m.activeParticleIndices.filter(i=>i>=196),count=Math.min(6,columns.length),y=r=>ground-clamp((r-5.2)/.5,0,1)*(ground-top);
 for(let j=0;j<count;j++){
  const p=m.particles[columns[Math.floor(j*columns.length/count)]],x=140+j*104;
  if(STATE.showPaths){
   ctx.strokeStyle='#38586d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,ground);ctx.stroke();
   const a=winter?top+28:ground-28,b=winter?ground-20:top+20,sign=winter?1:-1;
   ctx.strokeStyle='#d9eef9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+20,a);ctx.lineTo(x+20,b);ctx.stroke();
   ctx.fillStyle='#d9eef9';ctx.beginPath();ctx.moveTo(x+20,b);ctx.lineTo(x+13,b-sign*12);ctx.lineTo(x+27,b-sign*12);ctx.closePath();ctx.fill();
  }
  if(STATE.showParticles){
   if(STATE.showPaths){ctx.strokeStyle='#9cb9cc';ctx.lineWidth=4;ctx.beginPath();p.history.forEach((h,k)=>k?ctx.lineTo(x,y(h.r)):ctx.moveTo(x,y(h.r)));ctx.stroke();}
   ctx.fillStyle='#fff';ctx.strokeStyle='#06121b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y(p.r),8,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
 }
}
function updateLandSeaMechanism(){syncLandSeaMechanism();}
function updateLandSeaFieldCopy(t,q){
 const el=document.getElementById('landsea-field-readout');if(!el)return;
 const winter=LANDSEA.month===1,stage=formationStages('landsea')[LANDSEA.formation.node].key;
 el.textContent={
  bridge:LANDSEA.entrySeason==='equinox'?`从春秋分附近移至${LANDSEA.month}月；本节点完成后加入海陆。`:`保留${LANDSEA.month===7?'偏北的夏季':'偏南的冬季'}气压带，本节点完成后加入海陆。`,
  heat:'地表蓝色表示降温，橙色表示升温。陆地响应快，海洋响应慢。',
  column:winter?'白色标记下沉，蓝色高空气流向大陆补充 → 气柱质量增加。':'白色标记上升，蓝色高空气流向外输送 → 气柱质量减少。',
  pressure:winter?'大陆气柱质量增加，冷高压逐渐形成。':'大陆气柱质量减少，热低压逐渐形成。',
  band:winter?'蓝色副极地低压带在大陆处逐渐中断，海洋保留低压中心。':'黄色副热带高压带在大陆处逐渐中断，海洋保留高压中心。',
  wind:'白色虚线表示气压差推动；橙色实线表示近地面风，在自转和摩擦作用下逐渐转向。',
  overview:'从局部机制示意归纳到大尺度气压、等压线与季风分布；过渡不表示气压中心在短时间内真实移动。'
 }[stage];
 const key=document.getElementById('landsea-field-key'),data=document.getElementById('landsea-field-values');
 if(key)key.textContent=q.heat===0?'参考带：蓝色为低压带，黄色为高压带':(q.pressure>0?'地表色块按右侧气压色标读取，H / L 表示局地高低压中心':'地表蓝：冷 · 橙：暖，颜色表示温度变化')+(q.column>0?'；蓝微粒：高空 · 白微粒：垂直调整':'');
 if(data)data.textContent=q.heat>0&&q.pressure<1?
  '同纬度温度变化：大陆 '+lsTemperature(35,105,t).toFixed(1)+' K · 海洋 '+lsTemperature(35,145,t).toFixed(1)+' K':
  q.pressure>0?'大陆中心 '+lsPressure(landSeaCenters()[0].lat,landSeaCenters()[0].lon,t).toFixed(1)+' hPa · 季节尺度教学示意':
  '直接观察地球上的过程；可展开辅助剖面。';
}
function landSeaMechanismDiagnostics(){
 const m=landSeaMechanism;if(!m)return {exists:false};
 const sample=m.particles[0];
 return {exists:true,temperatureField:true,pressureField:true,particleIntegration:true,
  windModel:'integrated pressure-gradient + latitude Coriolis + drag; RK2 advection',
  time:m.t,fieldFrames:m.fieldFrames,contourVertices:m.contourVertices,particleCount:m.particles.length,
  activeParticleCount:m.activeParticleIndices.length,pointDrawCount:m.points.geometry.drawRange.count,
  trailDrawCount:m.trails.geometry.drawRange.count,
  columnSamples:m.activeParticleIndices.filter(i=>i>=196).map(i=>{const p=m.particles[i];return {i,lat:p.lat,lon:p.lon,r:p.r,previousR:p.history[1].r};}),
  particleSample:sample?{lat:sample.lat,lon:sample.lon,r:sample.r,layer:sample.layer}:null,
  temperatures:[lsTemperature(35,105,m.t),lsTemperature(35,145,m.t)],
  pressures:[lsPressure(50,95,m.t),lsPressure(35,140,m.t)],
  surface:lsSampleGrid(m.surface,35,120),upper:lsSampleGrid(m.upper,35,120)};
}
