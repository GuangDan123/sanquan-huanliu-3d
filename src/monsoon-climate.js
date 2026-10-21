/* 第五步：地图气压、风线为教学示意；图表可切换独立气候常值与示意资料。 */
const MONSOON_CLIMATE={month:1,site:'shanghai',phase:0,reveal:false,dataMode:'observed',evidenceFirst:false,formation:newFormationState()};
const MONSOON_SITES=[
  {id:'beijing',name:'北京',lat:40,lon:116,type:'温带季风气候',temperature:[-3,0,7,15,21,25,27,26,21,14,5,-1],rain:[3,5,8,20,35,80,180,160,50,20,8,3],annual:'夏季高温多雨，冬季寒冷干燥',winter:'偏北冬季风由大陆吹来，低温、少雨。',summer:'偏南夏季风带来暖湿气流，夏季降水集中。'},
  {id:'shanghai',name:'上海',lat:31,lon:121,type:'亚热带季风气候',temperature:[5,7,11,16,21,25,29,28,24,18,12,7],rain:[50,60,85,100,110,170,140,140,130,70,55,40],annual:'夏季高温多雨，冬季温和少雨',winter:'偏北冬季风由大陆吹来，气温较低、降水较少。',summer:'夏季风输送海洋水汽，高温多雨；还受锋面、台风等天气系统影响。'},
  {id:'mumbai',name:'孟买',lat:19,lon:73,type:'热带季风气候',temperature:[24,25,27,29,30,29,28,28,28,28,27,25],rain:[1,0,0,2,15,500,700,450,300,60,15,5],annual:'全年高温，旱雨两季明显',winter:'东北季风来自大陆，西海岸通常较干燥，处于旱季。',summer:'东南信风跨赤道后右偏成西南季风，印度洋水汽与迎风地形共同促成雨季。'},
  {id:'darwin',name:'达尔文',lat:-12,lon:131,type:'热带季风影响区',temperature:[28,28,28,28,27,25,25,26,28,29,29,29],rain:[400,350,300,100,20,5,2,5,15,70,150,250],annual:'全年高温，南半球夏季湿、冬季干',winter:'1月是当地夏季，西北季风输送水汽，处于湿季。',summer:'7月是当地冬季，偏东南的干燥气流较常见，处于干季。'}
];
let monsoonStage,monsoonMapBase,monsoonMapImage,monsoonMapReady=false,monsoonMapSignature='';
let monsoonFrameSignature='';
const MONSOON_MAP={width:1440,height:620,left:-30,top:85,bottom:-70};
function monsoonMapPoint(lat,lon){
  const wrapped=((lon-MONSOON_MAP.left)%360+360)%360;
  return [wrapped/360*MONSOON_MAP.width,(MONSOON_MAP.top-lat)/(MONSOON_MAP.top-MONSOON_MAP.bottom)*MONSOON_MAP.height];
}
function monsoonSite(){return MONSOON_SITES.find(s=>s.id===MONSOON_CLIMATE.site);}
function monsoonClimateData(){return MONSOON_CLIMATE.dataMode==='observed'?CLIMATE_NORMALS[MONSOON_CLIMATE.site]:monsoonSite();}
function climateDataDescription(){return MONSOON_CLIMATE.dataMode==='observed'?'月资料来自JMA/TCC，1991—2020年气候常值':'月资料为预设教学示意';}
function monsoonMapCenters(){
  const winter=MONSOON_CLIMATE.month===1;
  return [...landSeaCenters(MONSOON_CLIMATE.month),
    ...(winter?[{lat:25,lon:-155,symbol:'H',name:'北太平洋高压'},{lat:25,lon:-35,symbol:'H',name:'北大西洋高压'}]:[]),
    {lat:-32,lon:65,symbol:'H',name:'南印度洋高压'},{lat:-32,lon:-110,symbol:'H',name:'南太平洋高压'},{lat:-32,lon:-10,symbol:'H',name:'南大西洋高压'},
    {lat:-60,lon:155,symbol:'L',name:'南半球副极地低压带'}];
}
function createMonsoonClimateVisual(){
  monsoonStage=document.createElement('section');monsoonStage.id='monsoon-climate-stage';monsoonStage.hidden=true;monsoonStage.setAttribute('aria-label','第五步：季风环流与气候');
  monsoonStage.innerHTML=`<header class="mc-heading"><div><span>从全球环流到区域气候</span><h2>季风环流与气候</h2></div><div id="mc-month-badge"></div></header><div class="mc-map-card"><div class="mc-map-scroll"><div class="mc-map-wrap"><canvas id="monsoon-world-map" width="1440" height="620" role="img" aria-label="全球冬夏气压中心和近地面风向展开图"></canvas><div class="mc-sites">${MONSOON_SITES.map(s=>{const[x,y]=monsoonMapPoint(s.lat,s.lon);return `<button class="mc-site" data-mc-site="${s.id}" style="left:${x/1440*100}%;top:${y/620*100}%" title="查看${s.name}的气候" aria-label="查看${s.name}的气候"><i></i><span>${s.name}</span></button>`;}).join('')}</div></div></div><div class="mc-map-footer"><span>H 高压　L 低压　<span class="mc-arrow-key">→</span> 箭头表示吹向</span><span>气压与风线为教学示意 · 地图可横向滚动</span></div></div><div class="mc-climate-card"><div class="mc-chart-pane"><div class="mc-chart-heading"><h3 id="mc-city-heading"></h3><span>月资料为教学示意</span></div><canvas id="monsoon-climate-chart" width="720" height="240" role="img" aria-label="典型地区的气温折线与降水柱状图"></canvas></div><article class="mc-explanation"><span class="mc-section-label">环流 → 水汽 → 气候</span><h3 id="mc-climate-type"></h3><p id="mc-season-summary"></p><div id="mc-cause-chain"></div><p id="mc-annual-summary"></p></article></div>`;
  document.body.append(monsoonStage);
  monsoonStage.querySelector('.mc-chart-heading span').remove();
  monsoonStage.querySelector('.mc-chart-heading').insertAdjacentHTML('beforeend','<label>图表资料<select id="mc-data-mode"><option value="observed">真实月常值</option><option value="schematic">教学示意</option></select></label>');
  document.getElementById('monsoon-climate-chart').insertAdjacentHTML('afterend','<p id="mc-process-statistics" class="mc-process-statistics"></p><p class="mc-data-source" id="mc-data-source"></p><details class="mc-reading"><summary>先读资料，再写解释</summary><p>从图中找出降水较多的月份，判断当地季节。用气流来源、水汽及抬升条件解释，并说明图表不能单独证明什么。</p><textarea id="mc-reading-answer" rows="3" aria-label="独立解释气候资料"></textarea></details>');
  document.getElementById('mc-data-mode').onchange=e=>{MONSOON_CLIMATE.dataMode=e.target.value;drawMonsoonClimateChart();updateMonsoonClimateCopy();};
  document.getElementById('mc-reading-answer').oninput=e=>{learningRecord().answers['climateReading-'+MONSOON_CLIMATE.site]=e.target.value;saveLearningEvidence();};
  createClimateFormation();
  const bridge=document.createElement('div');bridge.className='mc-evidence-bridge';bridge.innerHTML='<span>动画：水汽与抬升</span><b>→</b><span>冬夏条件对照</span><b>→</b><span>资料：多年各月统计</span>';monsoonStage.querySelector('.mc-climate-card').prepend(bridge);
  monsoonStage.querySelectorAll('[data-mc-site]').forEach(b=>b.onclick=()=>setMonsoonClimateOption('site',b.dataset.mcSite));
  monsoonMapBase=document.createElement('canvas');monsoonMapBase.width=1440;monsoonMapBase.height=620;
  monsoonMapImage=new Image();monsoonMapImage.onload=()=>{monsoonMapReady=true;monsoonMapSignature='';if(STATE.step===4)drawMonsoonClimateMap();};
  monsoonMapImage.src=EARTH_TEXTURE_B64;
  window.__monsoonClimateDebug={state:MONSOON_CLIMATE,sites:MONSOON_SITES,centers:monsoonMapCenters,point:monsoonMapPoint,setOption:setMonsoonClimateOption,
    get ready(){return monsoonMapReady;},routes:monsoonMapWindRoutes,get formation(){return MONSOON_CLIMATE.formation;},
    stages:()=>formationStages('climate'),level:key=>formationLevel('climate',key),action:a=>formationAction('climate',a)};
}
function syncMonsoonClimateVisual(){
  if(!monsoonStage)return;
  const active=STATE.step===4;monsoonStage.hidden=!active;document.body.classList.toggle('monsoon-climate-active',active);
  document.getElementById('scene-container').style.visibility=active?'hidden':'';
  document.querySelectorAll('[data-view]').forEach(b=>{b.disabled=active;});
  document.getElementById('rotation-slider').disabled=active;
  if(active){
    latLabels.forEach(l=>{l.obj.userData.baseVisible=false;l.obj.visible=false;});
    verticalLabels.forEach(l=>{l.obj.userData.baseVisible=false;l.obj.visible=false;});
    if(STATE.showDiagram)toggleDiagramPanel(false);
    drawMonsoonClimateMap();drawMonsoonClimateChart();updateMonsoonClimateCopy();drawClimateFormation();
  }
}
function rebuildMonsoonMapBase(){
  const ctx=monsoonMapBase.getContext('2d'),{width:w,height:h}=MONSOON_MAP;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#12283a';ctx.fillRect(0,0,w,h);
  if(monsoonMapReady){
    const iw=monsoonMapImage.width,ih=monsoonMapImage.height,sourceX=150/360*iw,sourceY=5/180*ih,sourceH=155/180*ih;
    // 经度从30°W开始，使非洲—亚洲—太平洋—美洲连续展开，与参考图的阅读顺序一致。
    ctx.filter='brightness(1.35) saturate(.85)';
    ctx.drawImage(monsoonMapImage,sourceX,sourceY,iw-sourceX,sourceH,0,0,w*(iw-sourceX)/iw,h);
    ctx.drawImage(monsoonMapImage,0,sourceY,sourceX,sourceH,w*(iw-sourceX)/iw,0,w*sourceX/iw,h);ctx.filter='none';
  }
  if(STATE.showPressure){
    const overlay=document.createElement('canvas');overlay.width=360;overlay.height=155;
    const oc=overlay.getContext('2d'),data=oc.createImageData(360,155);
    for(let y=0;y<155;y++)for(let x=0;x<360;x++){
      const p=landSeaPressureAt(85-y-.5,-30+x+.5,MONSOON_CLIMATE.month,'real'),c=landSeaColor(p).convertLinearToSRGB(),i=(y*360+x)*4;
      data.data[i]=c.r*255;data.data[i+1]=c.g*255;data.data[i+2]=c.b*255;data.data[i+3]=clamp(18+Math.abs(p-1012)*2,18,70);
    }
    oc.putImageData(data,0,0);ctx.drawImage(overlay,0,0,w,h);
    drawMonsoonIsobars(ctx);
  }
  if(STATE.showGrid){
    ctx.lineWidth=1;ctx.font='15px "Microsoft YaHei",sans-serif';
    for(const lat of [-60,-30,0,30,60]){
      const y=monsoonMapPoint(lat,0)[1];ctx.strokeStyle=lat===0?'rgba(255,219,117,.55)':'rgba(184,211,224,.24)';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
      ctx.fillStyle='#e9e5c8';ctx.fillText(lat===0?'0°':`${Math.abs(lat)}°${lat>0?'N':'S'}`,72,y-6);
    }
  }
  const site=monsoonSite(),[sx,sy]=monsoonMapPoint(site.lat,site.lon);
  ctx.save();ctx.strokeStyle='#b8ed97';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.beginPath();ctx.ellipse(sx,sy,site.id==='mumbai'?57:site.id==='darwin'?60:48,45,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  if(STATE.showPressure&&STATE.showLabels)for(const c of monsoonMapCenters()){
    const [x,y]=monsoonMapPoint(c.lat,c.lon);
    monsoonMapText(ctx,c.symbol,x,y,c.symbol==='H'?'#ffe7a0':'#cae8ff',26);
    monsoonMapText(ctx,c.name,x,y+23,'#f7eac0',16);
  }
}
function monsoonMapText(ctx,text,x,y,color='#ffe1a0',size=16){
  ctx.save();ctx.font=`600 ${size}px "Microsoft YaHei",sans-serif`;const halfWidth=ctx.measureText(text).width/2+6;x=clamp(x,halfWidth,1440-halfWidth);y=clamp(y,size/2+5,620-size/2-5);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=4;ctx.strokeStyle='rgba(4,12,20,.82)';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function drawMonsoonIsobars(ctx){
  const nx=120,ny=52,dy=155/ny,field=Array.from({length:ny+1},(_,y)=>Array.from({length:nx+1},(_,x)=>landSeaPressureAt(85-y*dy,-30+x*3,MONSOON_CLIMATE.month,'real')));
  ctx.save();ctx.strokeStyle='rgba(255,238,187,.26)';ctx.lineWidth=1;
  for(let level=988;level<=1036;level+=8){
    ctx.beginPath();for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],hits=[];
      for(let e=0;e<4;e++){
        const [ax,ay]=corners[e],[bx,by]=corners[(e+1)%4],va=field[ay][ax],vb=field[by][bx];
        if((va<level)===(vb<level))continue;const t=(level-va)/(vb-va);
        hits.push([lerp(ax,bx,t)/nx*1440,lerp(ay,by,t)/ny*620]);
      }
      for(let i=0;i+1<hits.length;i+=2){ctx.moveTo(...hits[i]);ctx.lineTo(...hits[i+1]);}
    }ctx.stroke();
  }ctx.restore();
}
function monsoonMapWindRoutes(){
  const shift=MONSOON_CLIMATE.month===7?5:-5,routes=landSeaWindRoutes(MONSOON_CLIMATE.month).map(points=>({points,kind:'monsoon'}));
  if(MONSOON_CLIMATE.month===1)routes[6]={points:[[-2,116],[-7,124],[-13,133]],kind:'monsoon'};
  else routes[6]={points:[[-25,141],[-18,136],[-12,131]],kind:'monsoon'};
  // 全球平均风带用于比较；亚洲季风区由季风路径覆盖，避免同时显示相冲突的风向。
  for(const lon of [0,35,170,215,255,300]){
    routes.push({points:[[22+shift,lon+8],[15+shift,lon],[8+shift,lon-9]],kind:'trade'});
    if(lon!==35)routes.push({points:[[-22+shift,lon+8],[-15+shift,lon],[-8+shift,lon-9]],kind:'trade'});
  }
  for(const lon of [0,35,150,205,255,295]){
    if(lon!==35)routes.push({points:[[38+shift,lon],[44+shift,lon+9],[49+shift,lon+21]],kind:'west'});
    routes.push({points:[[-38+shift,lon],[-44+shift,lon+9],[-49+shift,lon+21]],kind:'west'});
  }
  for(const lon of [10,65,120,175,230,285]){
    routes.push({points:[[75,lon+12],[70,lon+4],[65,lon-5]],kind:'polar'});
    routes.push({points:[[-75,lon+12],[-70,lon+4],[-65,lon-5]],kind:'polar'});
  }
  for(const c of monsoonMapCenters().filter(c=>c.lat>40&&Math.abs(c.lon)>140)){
    routes.push({points:[[c.lat-6,c.lon-14],[c.lat-14,c.lon],[c.lat-8,c.lon+14],[c.lat+5,c.lon+8]],kind:'center'});
  }
  return routes;
}
function monsoonMapRoutePoint(route,t){
  const pts=route.points,scaled=t*(pts.length-1),i=Math.min(pts.length-2,Math.floor(scaled)),a=pts[i],b=pts[i+1],u=scaled-i;
  const p0=pts[Math.max(0,i-1)],p3=pts[Math.min(pts.length-1,i+2)];
  const sample=k=>.5*((2*a[k])+(-p0[k]+b[k])*u+(2*p0[k]-5*a[k]+4*b[k]-p3[k])*u*u+(-p0[k]+3*a[k]-3*b[k]+p3[k])*u*u*u);
  return monsoonMapPoint(sample(0),sample(1));
}
function drawMonsoonClimateMap(){
  if(!monsoonStage||STATE.step!==4)return;
  const signature=[MONSOON_CLIMATE.month,MONSOON_CLIMATE.site,monsoonMapReady,STATE.showPressure,STATE.showGrid,STATE.showLabels].join(':');
  if(signature!==monsoonMapSignature){rebuildMonsoonMapBase();monsoonMapSignature=signature;}
  const canvas=document.getElementById('monsoon-world-map'),ctx=canvas.getContext('2d');ctx.drawImage(monsoonMapBase,0,0);
  if(STATE.showPaths){
    const routes=monsoonMapWindRoutes();
    for(let index=0;index<routes.length;index++){
      const route=routes[index],monsoon=route.kind==='monsoon',mechanism=MONSOON_CLIMATE.formation.view==='mechanism',selected=monsoon&&monsoonRelevantRoutes().includes(index);
      let reached=1;if(mechanism){reached=selected?formationLevel('climate','source'):0;if(selected&&monsoonSite().id==='mumbai'&&MONSOON_CLIMATE.month===7&&MONSOON_CLIMATE.formation.cross)reached=Math.max(reached,formationLevel('climate','trade')*.48,formationLevel('climate','cross')>.0?.48+.52*formationLevel('climate','cross'):0);}
      if(mechanism&&selected&&reached===0)continue;
      ctx.save();ctx.globalAlpha=mechanism&&!selected ? .16 : 1;ctx.lineWidth=selected?3.5:monsoon?2.5:1.5;ctx.strokeStyle=selected?'#ffe3a2':monsoon?'rgba(255,226,160,.9)':'rgba(255,194,116,.55)';ctx.beginPath();let last=null;
      const extent=mechanism&&selected?reached:1;
      for(let i=0;i<=40;i++){const p=monsoonMapRoutePoint(route,i/40*extent);if(!last||Math.abs(p[0]-last[0])>720)ctx.moveTo(...p);else ctx.lineTo(...p);last=p;}ctx.stroke();
      if(extent>0)drawMonsoonMapArrow(ctx,route,Math.min(.86,extent),monsoon?'#ff9771':'#ffc982',monsoon?9:6);
      const t=(MONSOON_CLIMATE.phase+index*.071)%1;if(STATE.showParticles&&(!mechanism||selected&&t<extent))drawMonsoonMapArrow(ctx,route,t,'#ffe2a0',monsoon?7:4);
      if(selected&&formationLocalSummer()&&formationLevel('climate','moisture')>0&&STATE.showParticles){ctx.fillStyle='#74ddff';for(let j=0;j<9;j++){const u=(MONSOON_CLIMATE.formation.clock*.12+j/9)%1;if(u>extent)continue;const p=monsoonMapRoutePoint(route,u);ctx.beginPath();ctx.arc(...p,4,0,Math.PI*2);ctx.fill();}}
      ctx.restore();
    }
    if(STATE.showLabels&&(MONSOON_CLIMATE.formation.view==='result'||formationLevel('climate','source')===1)){
      const winter=MONSOON_CLIMATE.month===1;
      for(const[lat,lon,label]of[[34,132,winter?'西北季风':'东南季风'],[10,65,winter?'东北季风':'西南季风'],[-4,135,winter?'西北季风':'东南气流'],[12,225,'东北信风'],[-12,215,'东南信风'],[45,235,'西风'],[-47,80,'西风']])monsoonMapText(ctx,label,...monsoonMapPoint(lat,lon),'#ffe2a0',16);
    }
  }
  monsoonStage.querySelectorAll('[data-mc-site]').forEach(b=>{b.classList.toggle('active',b.dataset.mcSite===MONSOON_CLIMATE.site);b.setAttribute('aria-pressed',String(b.dataset.mcSite===MONSOON_CLIMATE.site));});
}
function monsoonRelevantRoutes(){const s=monsoonSite().id;return s==='mumbai'?[3,4]:s==='darwin'?[6]:MONSOON_CLIMATE.month===7?[0,1,2,5]:[0,1,2];}
function drawMonsoonMapArrow(ctx,route,t,color,size){
  const a=monsoonMapRoutePoint(route,Math.max(0,t-.012)),p=monsoonMapRoutePoint(route,t);if(Math.abs(p[0]-a[0])>720)return;
  const angle=Math.atan2(p[1]-a[1],p[0]-a[0]);ctx.save();ctx.translate(...p);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(-size*.65,-size*.5);ctx.lineTo(-size*.65,size*.5);ctx.closePath();ctx.fill();ctx.restore();
}
function drawMonsoonClimateChart(){
  if(!monsoonStage)return;const canvas=document.getElementById('monsoon-climate-chart'),ctx=canvas.getContext('2d'),s=monsoonClimateData();ctx.clearRect(0,0,720,240);
  const f=MONSOON_CLIMATE.formation;if(!MONSOON_CLIMATE.evidenceFirst&&f.view==='mechanism'&&formationLevel('climate','rain')<.7&&!(f.reveal&&formationStages('climate')[f.node].key==='rain'))return;
  const left=44,right=660,top=32,bottom=208,rainMax=Math.ceil(Math.max(...s.rain)/100)*100,tempMin=-10,tempMax=40,dx=(right-left)/12;
  ctx.fillStyle='rgba(184,217,137,.12)';ctx.fillRect(left+dx*(MONSOON_CLIMATE.month-1),top,dx,bottom-top);
  ctx.strokeStyle='#355065';ctx.lineWidth=1;ctx.fillStyle='#a2becd';ctx.font='13px "Microsoft YaHei",sans-serif';ctx.textAlign='right';
  for(let i=0;i<=4;i++){const y=lerp(bottom,top,i/4);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.fillText(String(Math.round(rainMax*i/4)),left-8,y+4);ctx.textAlign='left';ctx.fillText(String(Math.round(lerp(tempMin,tempMax,i/4))),right+8,y+4);ctx.textAlign='right';}
  ctx.textAlign='left';ctx.fillStyle='#70c4f0';ctx.fillText('降水 / mm',left,16);ctx.fillStyle='#ffb282';ctx.fillText('气温 / °C',right-20,16);
  for(let i=0;i<12;i++){const x=left+dx*(i+.5),height=s.rain[i]/rainMax*(bottom-top);ctx.fillStyle=i===MONSOON_CLIMATE.month-1?'#9ce0ff':'#4e9fc8';ctx.fillRect(x-11,bottom-height,22,height);ctx.fillStyle='#c0d4df';ctx.textAlign='center';ctx.fillText(String(i+1),x,228);}
  ctx.strokeStyle='#ffab78';ctx.lineWidth=2.5;ctx.beginPath();s.temperature.forEach((v,i)=>{const p=[left+dx*(i+.5),bottom-(v-tempMin)/(tempMax-tempMin)*(bottom-top)];i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.stroke();
  const i=MONSOON_CLIMATE.month-1,x=left+dx*(i+.5),y=bottom-(s.temperature[i]-tempMin)/(tempMax-tempMin)*(bottom-top);ctx.fillStyle='#ffdabd';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#b7e6ff';ctx.lineWidth=2;ctx.strokeRect(x-14,bottom-s.rain[i]/rainMax*(bottom-top)-3,28,s.rain[i]/rainMax*(bottom-top)+3);
  document.getElementById('mc-process-statistics').textContent=`当前${MONSOON_CLIMATE.month}月：蓝柱降水 ${s.rain[i]} mm。动画解释水汽与抬升条件；全年柱线来自月统计资料。橙色气温线还需结合纬度、太阳辐射等因素理解。`;
}
function updateMonsoonClimateCopy(){
  if(!monsoonStage)return;const s=monsoonSite(),winter=MONSOON_CLIMATE.month===1,north=s.lat>0,localSummer=north?!winter:winter;
  document.getElementById('mc-month-badge').textContent=winter?'1月 · 北半球冬季 / 南半球夏季':'7月 · 北半球夏季 / 南半球冬季';
  document.getElementById('mc-city-heading').textContent=`${s.name} · 气温与降水年变化`;
  const observed=MONSOON_CLIMATE.dataMode==='observed',normal=CLIMATE_NORMALS[s.id],source=document.getElementById('mc-data-source');
  document.getElementById('mc-data-mode').value=MONSOON_CLIMATE.dataMode;
  source.innerHTML=observed?`JMA/TCC ClimatView · ${normal.period}年月常值 · 站号${normal.station}<br><a href="${normal.url}" target="_blank" rel="noopener">${normal.name} · 查看来源</a><br>蓝柱：月降水量（mm）；橙线：月平均气温（°C）。0.0为显示精度，不代表每年该月无雨。`:'预设教学示意，非观测统计；蓝柱：降水（mm），橙线：气温（°C）。';
  const input=document.getElementById('mc-reading-answer');if(document.activeElement!==input)input.value=learningRecord().answers['climateReading-'+MONSOON_CLIMATE.site]||'';
  const f=MONSOON_CLIMATE.formation,result=f.view==='result',rain=formationLevel('climate','rain'),showConclusion=formationFinished('climate')||f.reveal&&formationStages('climate')[f.node].key==='rain';
  document.getElementById('mc-climate-type').textContent=showConclusion?s.type:'根据过程解释气候';
  document.getElementById('mc-season-summary').textContent=showConclusion?`${MONSOON_CLIMATE.month}月 · 当地${localSummer?'夏季':'冬季'}：${winter?s.winter:s.summer}`:'';
  const chain=document.getElementById('mc-cause-chain');chain.hidden=!showConclusion;
  chain.innerHTML=showConclusion?(localSummer?'<span>海洋水汽</span><b>→</b><span>抬升、冷却、凝结</span><b>→</b><span>季节降雨</span>':'<span>大陆气流</span><b>→</b><span>水汽条件较弱</span><b>→</b><span>相对少雨（并非无雨）</span>'):'';
  document.getElementById('mc-annual-summary').textContent=showConclusion?s.annual:'';
  monsoonStage.querySelector('.mc-climate-card').hidden=!MONSOON_CLIMATE.evidenceFirst&&!result&&rain<.7&&!showConclusion;
  document.getElementById('mc-season-summary').hidden=!showConclusion;document.getElementById('mc-annual-summary').hidden=!showConclusion;
  monsoonStage.querySelector('.mc-sites').hidden=!STATE.showLabels;
  monsoonStage.querySelector('.mc-map-footer').hidden=!STATE.showLegend;
  updateFormationUI('climate');
}
function setMonsoonClimateOption(key,value){
  if(key==='month'&&![1,7].includes(value))return;if(key==='site'&&!MONSOON_SITES.some(s=>s.id===value))return;
  MONSOON_CLIMATE[key]=value;MONSOON_CLIMATE.reveal=false;MONSOON_CLIMATE.phase=0;MONSOON_CLIMATE.evidenceFirst=false;resetFormation('climate');
  if(STATE.step===4){updateStepPanel(4);syncMonsoonClimateVisual();}
}
function updateMonsoonClimateAnimation(dt){
  if(STATE.step!==4)return;
  advanceFormation('climate',dt);
  if(STATE.playing&&!LESSON_STATE.open&&!document.hidden)MONSOON_CLIMATE.phase=(MONSOON_CLIMATE.phase+Math.min(dt,.05)*STATE.speed*.12)%1;
  const signature=JSON.stringify([MONSOON_CLIMATE,STATE.playing,STATE.showPressure,STATE.showPaths,STATE.showParticles,STATE.showLabels,STATE.showLegend,monsoonMapReady,document.body.classList.contains('projection')]);
  if(signature===monsoonFrameSignature)return;
  monsoonFrameSignature=signature;
  drawMonsoonClimateMap();drawClimateFormation();drawMonsoonClimateChart();updateMonsoonClimateCopy();
}
function renderMonsoonClimatePanel(body,controlsPanel,navigation){
  const winter=MONSOON_CLIMATE.month===1,s=monsoonSite();
  controlsPanel.innerHTML=`<div class="mc-controls"><div class="mc-month-buttons" role="group" aria-label="季风月份"><button class="btn ${winter?'active':''}" data-mc-month="1">1月 · 冬夏对照</button><button class="btn ${!winter?'active':''}" data-mc-month="7">7月 · 冬夏对照</button></div><label>典型地区<select id="mc-site-select">${MONSOON_SITES.map(s=>`<option value="${s.id}">${s.name}${s.id==='darwin'?' · 南半球':''}</option>`).join('')}</select></label><button class="btn" id="mc-play">播放本节点</button></div>`;
  body.innerHTML=`<div class="mechanism-question" id="climate-formation-question"></div>${formationControls('climate')}${s.id==='mumbai'&&!winter?'<label class="model-note"><input type="checkbox" id="climate-cross"> 分段推导南亚跨赤道季风</label>':''}<p class="model-note">先预测，再逐段观察。水汽到达后还需抬升、冷却与凝结条件。气压和路径为教学示意；图表可切换真实月常值与示意资料，均非动画计算结果。温度还受纬度与太阳辐射等因素影响。蓝柱为降水、橙线为气温。</p><button class="btn btn-sm" id="mc-lesson">继续：气候应用练习</button>${formationDiagnosis()}`;
  navigation.innerHTML='<button class="btn" id="mc-prev">第四步：海陆分布</button>';
  controlsPanel.querySelectorAll('[data-mc-month]').forEach(b=>b.onclick=()=>setMonsoonClimateOption('month',Number(b.dataset.mcMonth)));
  const select=document.getElementById('mc-site-select');select.value=MONSOON_CLIMATE.site;select.onchange=()=>setMonsoonClimateOption('site',select.value);
  document.getElementById('mc-play').onclick=()=>formationAction('climate','play');
  document.getElementById('mc-prev').onclick=()=>transitionToStep(3);
  document.getElementById('mc-lesson').onclick=()=>openLesson('climate');
  const cross=document.getElementById('climate-cross');if(cross){cross.checked=MONSOON_CLIMATE.formation.cross;cross.onchange=()=>{MONSOON_CLIMATE.formation.cross=cross.checked;resetFormation('climate');refreshFormation('climate');};}
  body.insertAdjacentHTML('afterbegin','<button class="btn btn-sm" id="mc-read-evidence">先读真实资料，暂不显示结论</button>');
  document.getElementById('mc-read-evidence').onclick=()=>{MONSOON_CLIMATE.dataMode='observed';MONSOON_CLIMATE.evidenceFirst=true;drawMonsoonClimateChart();updateMonsoonClimateCopy();monsoonStage.querySelector('.mc-climate-card').scrollIntoView({block:'start'});};
  bindFormationControls('climate');
  updateMonsoonClimateCopy();
}
