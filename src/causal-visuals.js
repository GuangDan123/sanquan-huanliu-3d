/* 与主时间轴同步的局部图解；暂停、拖动进度时不另开时钟。 */
const CAUSAL_VISUALS={panel:null,canvas:null,signature:null,seasonRoot:null};
function causalText(ctx,text,x,y,color='#dce8f0',size=17,align='left'){
  formationText(ctx,text,x,y,color,size,align);
}
function causalDot(ctx,x,y,color='#ffe2aa',r=6){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function causalLine(ctx,points,color='#8195a5',dash=false){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash?[6,5]:[]);ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.restore();}
function causalDeflectionFrame(ctx,e){
  const p=smoothstep(clamp((e-4)/8,0,1));
  for(const [h,offset]of [[1,0],[-1,216]]){
    causalText(ctx,h===1?'北半球 · 向右偏':'南半球 · 向左偏',offset+108,25,'#f3d092',18,'center');
    for(const [direction,cy]of [[1,115],[-1,224]]){
      const x=offset+101,start=cy+direction*29,dy=-direction*52,dx=h*direction*42*p;
      causalLine(ctx,[[x,start],[x,start+dy]],'#92a3b1',true);
      const points=Array.from({length:31},(_,i)=>{const t=i/30;return [x+dx*t*t,start+dy*t];});
      formationPath(ctx,points,1,'#ffbd7d',3);
      const [px,py]=points[20],vx=dx*2*(20/30),vy=dy,n=Math.hypot(vx,vy),fx=-h*vy/n,fy=h*vx/n;
      causalDot(ctx,px,py);formationPath(ctx,[[px,py],[px+vx/n*28,py+vy/n*28]],1,'#ffbd7d',3);formationPath(ctx,[[px,py],[px+fx*30,py+fy*30]],1,'#6ce3ec',3);
      causalText(ctx,direction===1?'向北运动':'向南运动',offset+108,cy-49,'#dce8f0',16,'center');
    }
  }
  causalText(ctx,'北 ↑  东 →　虚线：原经线方向',216,279,'#b3c9da',16,'center');
  causalText(ctx,'橙：前进　青：水平偏向（垂直于前进）',216,305,'#b3c9da',16,'center');
  return '水平偏转改变方向，不直接造成下沉';
}
function causalSubtropicalFrame(ctx,e){
  const influx=clamp((e-12)/3,0,1),sink=clamp((e-15)/4,0,1),out=clamp((e-19)/4,0,1);
  causalText(ctx,'30°附近 · 高空与近地面分开观察',216,27,'#f3d092',18,'center');
  causalText(ctx,'高空',24,75);formationPath(ctx,[[90,75],[250,75]],1,'#ffbd7d',3);
  for(let i=0;i<Math.round(4+12*influx);i++)causalDot(ctx,280+(i%4)*14,53+Math.floor(i/4)*13,'#d9eead',4);
  causalText(ctx,'持续流入、积聚',216,118,'#d9eead',17,'center');
  formationPath(ctx,[[301,112],[301,219]],sink,'#c6df82',4);
  causalLine(ctx,[[72,237],[375,237]]);causalText(ctx,'近地面',22,264);
  if(sink>0){causalText(ctx,'柱内空气增多 → H',257,263,'#c6df82',18,'center');}
  formationPath(ctx,[[301,222],[130,222]],out,'#ffbd7d',3);
  formationPath(ctx,[[310,222],[390,222]],out,'#ffbd7d',3);
  causalText(ctx,out>0?'近地面向赤道与高纬两侧分流':'积聚与大尺度下沉相联系',216,305,'#b3c9da',17,'center');
  return '水平偏转 → 高空输送改变 → 下沉与分流';
}
function causalFrontFrame(ctx,e){
  const lift=clamp((e-27)/3,0,1),mean=e>=31;
  causalText(ctx,mean?'三圈图：长期平均的环流结构':'60°附近：局部锋面侧视',216,26,'#f3d092',18,'center');
  ctx.fillStyle='#24557a';ctx.beginPath();ctx.moveTo(187,241);ctx.lineTo(353,92);ctx.lineTo(410,241);ctx.closePath();ctx.fill();
  causalLine(ctx,[[25,243],[410,243]]);
  formationPath(ctx,[[394,229],[270,229]],1,'#72bafa',4);
  const warm=[[40,226],[161,226],[235,166],[318,92]];
  formationPath(ctx,warm,clamp((e-23)/4,0,1)*.33+lift*.67,'#ffba79',4);
  causalText(ctx,'暖空气',64,195,'#ffba79');causalText(ctx,'冷空气在下方',306,267,'#85c8ff',18,'center');
  causalText(ctx,'暖空气沿冷空气上方抬升',216,62,'#ffce9d',18,'center');
  causalText(ctx,mean?'两条上升支表示平均辐合上升区':'剖面高度为示意，冷空气不沿坡一起爬升',216,305,'#b3c9da',16,'center');
  return mean?'平均环流线用于归纳，局部剖面用于解释抬升':'先看冷暖空气相遇，再归纳平均三圈';
}
function causalSeasonFrame(ctx){
  const shift=STATE.seasonalShift||0,declination=shift/8*23.44,y=lat=>219-lat*2.25;
  causalText(ctx,'直射点 → 热力中心 → 气压带响应',216,24,'#f3d092',18,'center');
  for(const lat of [60,40,20,0,-20]){causalLine(ctx,[[54,y(lat)],[402,y(lat)]],'#355066',true);causalText(ctx,lat===0?'赤道':Math.abs(lat)+'°'+(lat>0?'N':'S'),48,y(lat),'#a9bfce',14,'right');}
  causalText(ctx,'太阳直射点',117,54,'#ffce7b',16,'center');
  causalText(ctx,'热力中心',221,54,'#ffa378',16,'center');
  causalText(ctx,'带的分布',340,54,'#b8df8c',16,'center');
  causalLine(ctx,[[117,y(-1)],[117,y(25)]],'#796848');
  causalDot(ctx,117,y(declination),'#ffd16b',9);
  causalText(ctx,Math.abs(declination).toFixed(1)+'°'+(declination>=0?'N':'S'),117,y(declination)-22,'#ffce7b',15,'center');
  ctx.fillStyle='#e9845638';ctx.fillRect(189,y(shift+4),64,8*2.25);causalDot(ctx,221,y(shift),'#ffac7c',6);
  ctx.fillStyle='#4597cf44';ctx.fillRect(290,y(57.5+shift),112,25*2.25);
  ctx.fillStyle='#7fc650aa';ctx.fillRect(290,y(32.5+shift),112,5*2.25);
  causalText(ctx,'西风带',346,y(45+shift),'#8bcaff',16,'center');
  causalText(ctx,'副热带高压',346,y(30+shift)+23,'#b8df8c',15,'center');
  ctx.fillStyle='#f3c94f88';ctx.fillRect(290,y(shift+2.5),112,5*2.25);causalText(ctx,'赤道低压',346,y(shift)+19,'#eadb97',15,'center');
  causalLine(ctx,[[267,y(37)],[419,y(37)]],'#fff0c2',true);causalDot(ctx,278,y(37),'#fff0c2',5);
  const control=37>=27.5+shift&&37<=32.5+shift?'副热带高压':37>32.5+shift?'西风带':'信风带';
  causalText(ctx,'固定37°N参照点：'+control,216,294,'#fff0c2',17,'center');
  causalText(ctx,'直射纬度与带的位移不等比例',216,317,'#a9bfce',15,'center');
  CAUSAL_VISUALS.season={declination,shift,observerLatitude:37,control};
  return '站在同一纬度，看夏季高压与冬季西风交替影响';
}
function updateCausalSeasonMarkers(active){
  const s=CAUSAL_VISUALS;
  if(active&&!s.seasonRoot){
    const root=new THREE.Group();root.position.x=SCENE_OFFSET_X;scene.add(root);s.seasonRoot=root;
    const make=(name,color)=>{const marker=new THREE.Mesh(new THREE.SphereGeometry(.09,16,10),new THREE.MeshBasicMaterial({color}));root.add(marker);marker.name=name;return marker;};
    s.sunMarker=make('season-subsolar-point',0xffd16b);s.observerMarker=make('season-fixed-observer',0xfff0c2);
    for(const [marker,text]of [[s.sunMarker,'☀ 直射纬度'],[s.observerMarker,'固定37°N']]){
      const el=document.createElement('span');el.className='sequence-label';el.textContent=text;
      el.style.marginLeft=marker===s.sunMarker?'-90px':'-95px';
      if(marker===s.sunMarker)el.style.color='#ffda85';else el.style.marginTop='-24px';
      const label=new CSS2DObject(el);label.position.set(.2,.17,0);marker.add(label);
    }
  }
  if(!s.seasonRoot)return;s.seasonRoot.visible=active;
  s.seasonRoot.traverse(o=>{if(o.isCSS2DObject)o.visible=active;});if(!active)return;
  // 固定纬度参照不随带移动；标记在朝向观察者的经线上投影，便于比较。
  const lon=-Math.atan2(camera.position.z,camera.position.x-SCENE_OFFSET_X)*180/Math.PI;
  s.sunMarker.position.copy(sequencePoint((STATE.seasonalShift||0)/8*23.44,lon-22,.16));
  s.observerMarker.position.copy(sequencePoint(37,lon+22,.16));
}
function causalLandSeaFrame(ctx){
  const {q,winter}=landSeaStoryState(),budget=landSeaStoryMassBudget(q.column,winter),ground=220;
  causalText(ctx,winter?'冬季：大陆冷却收缩':'夏季：大陆受热膨胀',216,24,'#f3d092',19,'center');
  causalText(ctx,'虚线处：同一高空高度比较气压',216,49,'#a9d5ed',16,'center');
  for(const [land,x,count]of [[true,106,budget.land],[false,326,budget.sea]]){
    const height=lerp(136,land?(winter?112:158):140,q.heat),color=land?(winter?'#76c9ff':'#ffac7c'):(winter?'#ffac7c':'#76c9ff');
    ctx.fillStyle=color+'24';ctx.fillRect(x-36,ground-height,72,height);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x-36,ground-height,72,height);
    // 柱高改变只重新分布原有粒子，输送开始后才改变数量。
    if(STATE.showParticles)for(let i=0;i<count;i++)causalDot(ctx,x-25+(i%6)*10,ground-9-Math.floor(i/6)*(height-22)/5,'#e5f4ff',3);
    causalText(ctx,land?'大陆':'海洋',x,241,color,18,'center');
    causalText(ctx,'空气份额 '+count,x,266,'#dce8f0',16,'center');
    const delta=count-24,width=48*delta/12;
    ctx.fillStyle='#344b5f';ctx.fillRect(x-48,287,96,7);ctx.fillStyle=delta>=0?'#ffd36f':'#70cbff';ctx.fillRect(width>=0?x:x+width,287,Math.abs(width),7);
    causalText(ctx,delta===0?'地面：尚无质量差':delta>0?'地面 H · 空气增多':'地面 L · 空气减少',x,311,delta>=0?'#ffd36f':'#70cbff',15,'center');
    if(q.column>0)causalText(ctx,(land===winter?'L':'H'),x,112,'#a9e4ff',21,'center');
    causalText(ctx,land?(winter?'柱高 ↓':'柱高 ↑'):'柱高变化较小',x,73,color,15,'center');
  }
  causalLine(ctx,[[42,127],[390,127]],'#a9d5ed',true);
  if(q.column>0){
    const path=winter?[[287,127],[146,127]]:[[146,127],[287,127]];
    formationPath(ctx,path,clamp((q.column-.15)/.25,0,1),'#96e3ff',3);
    if(STATE.showParticles)for(const p of budget.packets)if(p>0&&p<1)causalDot(ctx,lerp(path[0][0],path[1][0],p),127,'#ffe7a9',5);
  }
  causalText(ctx,'输送中 '+budget.inTransit,216,163,'#ffe7a9',16,'center');
  causalText(ctx,'柱高 ≠ 空气量',216,197,'#dce8f0',16,'center');
  CAUSAL_VISUALS.budget=budget;
  return '先改变柱高，再追踪高空输送与地面气压；粒子份额为示意';
}
function causalSingleFrame(ctx){
  const t=STATE.singleDemo.elapsed,upper=clamp((t-5.2)/3.3,0,1),sink=clamp((t-8.5)/3.3,0,1),surface=clamp((t-11.8)/4.2,0,1);
  causalText(ctx,'两层分别在同一高度比较气压',216,25,'#f3d092',19,'center');
  causalText(ctx,'赤道 · 暖',111,62,'#ffbd7d',18,'center');causalText(ctx,'极地 · 冷',328,62,'#8fcaff',18,'center');
  causalLine(ctx,[[35,111],[404,111]],'#637d90',true);causalLine(ctx,[[35,233],[404,233]],'#637d90',true);
  causalText(ctx,'高空',35,88,'#adc5d5',16);causalText(ctx,'近地面',35,261,'#adc5d5',16);
  causalText(ctx,'H',111,111,'#ffbd7d',24,'center');causalText(ctx,'L',328,111,'#8fcaff',24,'center');
  formationPath(ctx,[[137,111],[302,111]],upper,'#ffbd7d',4);
  formationPath(ctx,[[111,212],[111,135]],1,'#ffbd7d',3);formationPath(ctx,[[328,136],[328,211]],sink,'#8fcaff',3);
  if(upper>0){
    causalText(ctx,'L',111,233,'#8fcaff',24,'center');causalText(ctx,'H',328,233,'#ffbd7d',24,'center');
    if(STATE.showParticles)for(const [x,delta]of [[111,-1],[328,1]])for(let i=0;i<Math.round(12+delta*6*upper);i++)causalDot(ctx,x-22+(i%6)*9,185-Math.floor(i/6)*11,'#dce8f0',3);
    causalText(ctx,'高空输出 → 质量减少',111,289,'#b8d7e9',15,'center');causalText(ctx,'质量增加',328,289,'#b8d7e9',15,'center');
  }
  formationPath(ctx,[[300,233],[139,233]],surface,'#8fcaff',4);
  causalText(ctx,'每层均由相对高压 H → 相对低压 L',216,316,'#b8d7e9',16,'center');
  return '高空向两极输送，近地面由两极返回；H/L为同层相对气压';
}
function updateCausalVisuals(){
  const s=CAUSAL_VISUALS;
  if(!s.panel){
    s.panel=document.createElement('details');s.panel.id='causal-visual';s.panel.open=true;s.panel.hidden=true;
    s.panel.innerHTML='<summary>局部图解 · 与主动画同步</summary><canvas width="432" height="324" role="img"></canvas><p></p>';
    document.body.append(s.panel);s.canvas=s.panel.querySelector('canvas');
  }
  const landsea=STATE.step===3&&LANDSEA.surface==='real'&&LANDSEA.formation.view==='mechanism'&&[1,2,3].includes(LANDSEA.formation.node);
  const single=STATE.step===0&&STATE.singleDemo.elapsed>=5.2;
  const active=(single||[1,2].includes(STATE.step)||landsea)&&!document.body.classList.contains('ui-hidden')&&!LESSON_STATE.open&&STATE.showLabels;
  updateCausalSeasonMarkers(active&&STATE.step===2);
  s.panel.hidden=!active;if(!active)return;
  const compact=innerWidth<=760;
  if(s.compact!==compact){s.compact=compact;s.panel.open=!compact;}
  const e=sequenceElapsed(),time=single?STATE.singleDemo.elapsed:landsea?[LANDSEA.month,LANDSEA.formation.node,LANDSEA.formation.progress]:STATE.step===2?STATE.seasonalShift:e;
  const signature=[STATE.step,time,STATE.showParticles].join(':');if(s.signature===signature)return;s.signature=signature;
  const ctx=s.canvas.getContext('2d');ctx.clearRect(0,0,432,324);ctx.fillStyle='#101e2d';ctx.fillRect(0,0,432,324);
  const caption=single?causalSingleFrame(ctx):landsea?causalLandSeaFrame(ctx):STATE.step===2?causalSeasonFrame(ctx):e<12?causalDeflectionFrame(ctx,e):e<23?causalSubtropicalFrame(ctx,e):causalFrontFrame(ctx,e);
  s.canvas.setAttribute('aria-label',caption);s.panel.querySelector('p').textContent=caption;
}
window.__causalVisualsDebug={state:()=>({step:STATE.step,visible:!CAUSAL_VISUALS.panel?.hidden,season:CAUSAL_VISUALS.season,budget:CAUSAL_VISUALS.budget,markers:CAUSAL_VISUALS.seasonRoot?.children.filter(o=>o.isMesh).map(o=>({name:o.name,lat:Math.asin(o.position.y/o.position.length())*180/Math.PI,visible:CAUSAL_VISUALS.seasonRoot.visible}))}),massBudget:landSeaStoryMassBudget,parcel:climateParcelVisual,rainX:climateRainX};
