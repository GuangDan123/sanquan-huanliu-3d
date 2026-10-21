/* 季节、海陆与气候的分步机制。时间与数值均为教学示意。 */
function newFormationState(){return {view:'mechanism',node:0,progress:0,continuous:false,reveal:false,clock:0,cross:true};}
const LS_STAGE_SECONDS={bridge:4,heat:6,column:7,pressure:5,band:7,wind:7,overview:7};
function formationState(kind){return (kind==='landsea'?LANDSEA:MONSOON_CLIMATE).formation;}
function formationStages(kind){
  if(kind==='landsea'){
    const winter=LANDSEA.month===1;
    return [
      {key:'bridge',title:'承接季节，加入海陆',question:LANDSEA.entrySeason==='equinox'?`承接第三步的春秋分附近，先移至${LANDSEA.month}月，再加入海陆差异。`:`保持第三步的${winter?'偏南冬季':'偏北夏季'}背景：加入海陆后，气压带还会连续吗？`,answer:`第三步用6月、12月表示带的季节移动；本步用7月、1月代表海陆差异明显的夏季、冬季。${LANDSEA.entrySeason==='equinox'?'先从春秋分附近移至选定季节，再加入海陆差异。':'保留同一季节的偏移，再加入海陆差异。'}`,duration:LS_STAGE_SECONDS.bridge},
      {key:'heat',title:'海陆温度响应',question:'进入同一季节，大陆与海洋哪一侧升温或降温更快？',answer:winter?'冬季陆地降温比海洋快，大陆相对更冷；海洋温度变化较缓慢。':'夏季陆地升温比海洋快，大陆相对更暖；海洋温度变化较缓慢。',duration:LS_STAGE_SECONDS.heat},
      {key:'column',title:'气柱响应与空气调整',question:'温度差如何引起垂直运动和高空空气调整？',answer:winter?'大陆气柱冷却收缩；同一高空高度，大陆气压相对较低，空气向冷端补充。近地面高压与气柱质量增加相联系，不能只凭体积收缩判断地面气压。':'大陆气柱受热膨胀；同一高空高度，大陆气压相对较高，空气向外输送。近地面低压与气柱质量减少相联系，不能只凭体积膨胀判断地面气压。',duration:LS_STAGE_SECONDS.column},
      {key:'pressure',title:'大陆气压中心',question:'在同一近地面高度比较，哪一侧气压较高？',answer:winter?'大陆冷高压形成，邻近海洋气压相对较低。气压取决于上方空气柱重量，不能仅用冷热直接替代空气质量调整。':'大陆热低压形成，邻近海洋气压相对较高。海洋副热带高压还有动力作用，并非都由海水较冷形成。',duration:LS_STAGE_SECONDS.pressure},
      {key:'band',title:'连续气压带被改变',question:'大陆气压中心怎样改变理想的连续气压带？',answer:winter?'亚洲冷高压使北半球副极地低压带呈间断分布；海洋低压中心包含大尺度动力作用。':'亚洲热低压使北半球副热带高压带呈间断分布；南半球海洋占优势，气压带相对连续。',duration:LS_STAGE_SECONDS.band},
      {key:'wind',title:'推动、偏转与季风',question:'高压到低压的推动方向与实际近地面风向有什么区别？',answer:winter?'气压梯度推动气流由大陆高压流向海洋；北半球右偏及摩擦共同影响近地面风，东亚常见偏北冬季风。':'气压梯度推动气流由海洋流向大陆低压；北半球右偏及摩擦共同影响近地面风，东亚常见偏南夏季风。',duration:LS_STAGE_SECONDS.wind},
      {key:'overview',title:'归纳完整气压与季风分布',question:'把局部海陆对照放回大尺度分布：亚洲、海洋和澳大利亚怎样联系？',answer:'局部图解释海陆差异如何组织季风；随后扩大观察范围，显现大尺度气压中心、等压线和各区域季风。位置过渡表示从局部示意到分布图的归纳，不表示气压中心在这几秒内真实迁移。',duration:LS_STAGE_SECONDS.overview}
    ];
  }
  const s=monsoonSite(),wet=formationLocalSummer(),south=s.id==='mumbai'&&MONSOON_CLIMATE.month===7;
  const stages=[
    {key:'source',title:'气流来源与路径',question:`${s.name}${MONSOON_CLIMATE.month}月的气流主要来自大陆还是海洋？`,answer:MONSOON_CLIMATE.month===1?s.winter:s.summer,duration:4},
    {key:'moisture',title:'水汽输送',question:'气流路线怎样影响水汽来源？有水汽就一定下雨吗？',answer:wet?'海洋气流输送水汽，提供降水的水汽条件；水汽到达不等于立即降雨。':'这些案例的当地冬季气流水汽条件相对较弱，并不意味着完全无降水。',duration:4},
    {key:'lift',title:wet?'抬升、冷却与凝结':'比较降水条件',question:wet?'空气怎样抬升？抬升以后为什么可能形成云？':'水汽条件较弱时，降水为什么通常较少？',answer:wet?(s.id==='mumbai'?'湿润气流遇西高止山迎风坡抬升，冷却达到凝结条件后形成云。':s.id==='darwin'?'当地夏季，湿润气流辐合并上升，冷却达到凝结条件后形成云。':'湿润气流可在锋面等系统作用下抬升，冷却达到凝结条件后形成云；夏季降雨也受台风、地形等影响。'):'水汽较少使降水条件较弱。仍可能有锋面等天气系统产生降雨；上海冬季有雨，不能画成完全无雨。',duration:5},
    {key:'rain',title:'降水与气候年变化',question:'比较冬夏，这些过程能解释气候图的哪些特征？',answer:s.annual+'。'+climateDataDescription()+'；温度还受纬度与太阳辐射等因素影响，图表不是动画计算结果。',duration:4}
  ];
  if(south&&MONSOON_CLIMATE.formation.cross)stages.unshift(
    {key:'shift',title:'南亚：气压带北移',question:'北半球夏季，低压背景与赤道附近气压带怎样变化？',answer:'气压带北移与南亚低压背景共同组织季风环流；海陆热力差异也参与作用。',duration:3},
    {key:'trade',title:'东南信风趋向赤道',question:'南半球的东南信风从哪一侧接近赤道？',answer:'气流由南半球副热带高压向北运动，东南信风逐渐接近并越过赤道。',duration:4},
    {key:'cross',title:'跨赤道后向右偏转',question:'进入北半球后，运动气流向哪一侧偏转？',answer:'气流跨赤道后在北半球向运动方向右侧偏转，成为西南气流。图示为方向推导，真实轨迹受多种因素影响。',duration:4}
  );
  return stages;
}
function formationLocalSummer(){return monsoonSite().lat>0?MONSOON_CLIMATE.month===7:MONSOON_CLIMATE.month===1;}
function formationLevel(kind,key){const f=formationState(kind);if(f.view==='result')return 1;const i=formationStages(kind).findIndex(s=>s.key===key);return i<0?0:f.node>i?1:f.node===i?f.progress:0;}
function formationFinished(kind){const f=formationState(kind);return f.view==='result'||(f.node===formationStages(kind).length-1&&f.progress===1);}
function resetFormation(kind){const f=formationState(kind);f.node=0;f.progress=0;f.clock=0;f.reveal=false;STATE.playing=false;if(kind==='landsea')resetLandSeaMechanism();}
function formationAction(kind,action){
  const f=formationState(kind),last=formationStages(kind).length-1;
  if(action==='prev'){f.node=Math.max(0,f.node-1);f.progress=1;STATE.playing=false;}
  if(action==='next'){if(f.progress===1){if(f.node===last)return;f.node++;f.progress=0;}STATE.playing=true;}
  if(action==='replay'){f.progress=0;f.clock=0;STATE.playing=true;}
  if(action==='restart'){resetFormation(kind);STATE.playing=true;}
  if(action==='play'){if(f.view==='result')STATE.playing=!STATE.playing;else if(STATE.playing)STATE.playing=false;else if(kind==='landsea'&&formationFinished(kind))formationAction(kind,'restart');else if(f.progress===1)formationAction(kind,'next');else STATE.playing=true;}
  if(kind==='landsea'&&['prev','replay','restart'].includes(action)){resetLandSeaMechanism();viewAnimation++;}
  f.reveal=false;refreshFormation(kind);
}
function advanceFormation(kind,dt){
  const f=formationState(kind);if(!STATE.playing||LESSON_STATE.open||document.hidden)return;
  f.clock+=Math.min(dt,.05)*STATE.speed;
  if(f.view==='result')return;
  const stages=formationStages(kind);f.progress=Math.min(1,f.progress+Math.min(dt,.05)*STATE.speed/stages[f.node].duration);
  if(f.progress===1){if(f.continuous&&f.node<stages.length-1){f.node++;f.progress=0;f.reveal=false;refreshFormation(kind);}else STATE.playing=false;}
}
function formationControls(kind){
  const f=formationState(kind);
  return `<div class="formation-controls"><label>展示方式<select id="${kind}-formation-view"><option value="mechanism">形成机制</option><option value="result">结果对照</option></select></label><div id="${kind}-formation-nodes" ${f.view==='result'?'hidden':''}><label>播放方式<select id="${kind}-formation-mode"><option value="step">讲课：每节点停顿</option><option value="continuous">复习：连续演示</option></select></label><div id="${kind}-formation-status" class="formation-status" aria-live="polite"></div><progress id="${kind}-formation-progress" max="1" value="${f.progress}" aria-label="本节点进度"></progress><div class="formation-buttons">${[['prev','上一节点'],['next','下一节点'],['replay','重播本节点'],['restart','从头重播']].map(([a,t])=>`<button class="btn" id="${kind}-formation-${a}">${t}</button>`).join('')}</div></div><button class="btn" id="${kind}-formation-reveal">${f.reveal?'收起当前解释':'显示当前解释'}</button><p id="${kind}-formation-answer" class="formation-answer" hidden></p></div>`;
}
function bindFormationControls(kind){
  const f=formationState(kind),view=document.getElementById(kind+'-formation-view'),mode=document.getElementById(kind+'-formation-mode');view.value=f.view;mode.value=f.continuous?'continuous':'step';
  if(kind==='landsea')mode.innerHTML='<option value="continuous">连续播放</option><option value="step">逐段讲解 · 阶段末停顿</option>';
  mode.value=f.continuous?'continuous':'step';
  view.onchange=()=>{f.view=view.value;if(kind==='landsea'&&f.view==='mechanism'&&LANDSEA.surface!=='real'){LANDSEA.surface='real';LANDSEA.region='asia';rebuildLandSea();}STATE.playing=false;f.reveal=false;refreshFormation(kind);if(kind!=='landsea')frameScene(true);};
  mode.onchange=()=>{f.continuous=mode.value==='continuous';resetFormation(kind);refreshFormation(kind);};
  for(const a of ['prev','next','replay','restart'])document.getElementById(kind+'-formation-'+a).onclick=()=>formationAction(kind,a);
  document.getElementById(kind+'-formation-reveal').onclick=()=>{f.reveal=!f.reveal;updateFormationUI(kind);if(kind==='climate'){updateMonsoonClimateCopy();drawMonsoonClimateChart();}};
  updateFormationUI(kind);
}
function updateFormationUI(kind){
  const f=formationState(kind),stages=formationStages(kind),s=stages[f.node],status=document.getElementById(kind+'-formation-status');if(!status)return;
  status.textContent=kind==='landsea'?`${f.node+1} / ${stages.length} · ${s.title} · ${STATE.playing?(f.continuous?'连续播放中':'本阶段播放中'):formationFinished(kind)?'播放完成':f.progress===1?'本阶段完成':'等待播放 / 已暂停'}`:`${f.node+1} / ${stages.length} · ${s.title} · ${STATE.playing?'演示中':f.progress===1?'本节点完成':'等待开始 / 已暂停'}`;
  const progress=document.getElementById(kind+'-formation-progress');
  progress.value=kind==='landsea'?(stages.slice(0,f.node).reduce((sum,s)=>sum+s.duration,0)+f.progress*s.duration)/stages.reduce((sum,s)=>sum+s.duration,0):f.progress;
  if(kind==='landsea')progress.setAttribute('aria-label','形成过程总进度');
  document.getElementById(kind+'-formation-prev').disabled=f.node===0;
  document.getElementById(kind+'-formation-next').disabled=f.node===stages.length-1&&f.progress===1;
  const question=document.getElementById(kind+'-formation-question');if(question)question.textContent=f.view==='result'?'结果对照：比较冬夏气压、风向和气候，解释变化的原因。':s.question;
  const answer=document.getElementById(kind+'-formation-answer');answer.textContent=f.view==='result'?stages.map(s=>s.answer).join(' '):s.answer;answer.hidden=!f.reveal;
  document.getElementById(kind+'-formation-reveal').textContent=f.reveal?'收起当前解释':'显示当前解释';
  const play=document.getElementById(kind==='landsea'?'landsea-play':'mc-play');if(play)play.textContent=STATE.playing?'暂停过程':f.view==='result'?'播放气流':formationFinished(kind)?'机制已完成':f.progress===1?'继续下一节点':'播放本节点';
  if(play)play.disabled=f.view==='mechanism'&&formationFinished(kind);
  if(kind==='landsea'&&play){play.disabled=false;play.textContent=STATE.playing?'暂停查看':f.view==='result'?'播放气流':formationFinished(kind)?'重新播放':f.progress===1?'继续下一阶段':f.node>0||f.progress>0?'继续播放':f.continuous?'连续播放':'播放本阶段';}
  // Node buttons are moved into the fixed dock by the classroom layout.
  if(kind==='landsea')for(const a of ['prev','next','replay','restart'])document.getElementById(kind+'-formation-'+a).hidden=f.view==='result'||a!=='restart';
}
function refreshFormation(kind){
  if(kind==='landsea'){syncLandSeaVisual();if(STATE.step===3)updateStepPanel(3);drawLandSeaFormation();}
  else if(STATE.step===4){updateStepPanel(4);syncMonsoonClimateVisual();}
}
function formationText(ctx,text,x,y,color='#d9e7ed',size=18,align='left'){ctx.fillStyle=color;ctx.font=`${size}px "Microsoft YaHei",sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(text,x,y);}
function formationPath(ctx,points,p,color='#ffbb78',width=4,dashed=false){
  if(p<=0)return;ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[10,7]:[]);ctx.beginPath();ctx.moveTo(...points[0]);const count=(points.length-1)*Math.min(p,1),end=Math.floor(count);for(let i=1;i<=end;i++)ctx.lineTo(...points[i]);const a=points[Math.min(end,points.length-2)],b=points[Math.min(end+1,points.length-1)],t=count-end,q=end===points.length-1?points.at(-1):[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];ctx.lineTo(...q);ctx.stroke();ctx.setLineDash([]);const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.translate(...q);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-6);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.restore();
}
function formationParticles(ctx,points,clock,count,color='#75daff',radius=4,p=1){
  if(!STATE.showParticles)return;ctx.fillStyle=color;for(let j=0;j<count;j++){const t=(clock*.15+j/count)%1;if(t>p)continue;const q=t*(points.length-1),i=Math.min(points.length-2,Math.floor(q)),u=q-i;ctx.beginPath();ctx.arc(lerp(points[i][0],points[i+1][0],u),lerp(points[i][1],points[i+1][1],u),radius,0,Math.PI*2);ctx.fill();}
}
function createLandSeaFormation(){
  const panel=document.createElement('section');panel.id='landsea-formation';panel.hidden=true;panel.innerHTML='<details><summary>辅助海陆热力剖面 · 点击展开</summary><canvas id="landsea-formation-canvas" width="760" height="500" role="img" aria-label="海陆温差、气柱调整、气压与季风的分步剖面"></canvas></details><div class="formation-footnote">季节尺度示意 · 同一高度比较气压<br>局部热力作用与全球动力环流共同影响季风</div><div id="landsea-season-compare" hidden><canvas id="landsea-comparison-canvas" width="760" height="250" role="img" aria-label="东亚冬夏并排对照：冬季大陆冷高压偏北风，夏季大陆热低压偏南风"></canvas></div>';document.body.append(panel);
  panel.querySelector('details').id='landsea-thermal';
  panel.insertAdjacentHTML('beforeend','<details id="landsea-plan"><summary>水平俯视：推动、偏转与风向</summary><canvas id="landsea-plan-canvas" width="760" height="330" role="img" aria-label="北半球水平面内的气压梯度力、风向、偏向力和摩擦力"></canvas><p class="landsea-plan-note">上下表示南北，左右表示东西；与上方剖面的高度轴分开。北半球向前进方向右偏，摩擦力与风向相反。力箭头长度仅为示意。</p></details>');
  panel.querySelector('details').insertAdjacentHTML('beforeend','<p id="landsea-mass-explanation" hidden></p>');
  const content=document.createElement('div');content.className='landsea-aux-content';content.append(...panel.childNodes);
  const aux=document.createElement('details');aux.id='landsea-aux';aux.innerHTML='<summary>辅助图解 <span>剖面 · 气柱 · 风向</span></summary>';aux.append(content);panel.append(aux);
  panel.addEventListener('toggle',()=>requestAnimationFrame(()=>frameScene(true)),true);
  // Retain optional reference diagrams off-screen; the teaching process is on the globe.
  const legend=document.getElementById('landsea-legend');if(legend)document.body.append(legend);
  matchMedia('(max-width:1100px)').addEventListener('change',()=>{placeLandSeaAux();frameScene(true);});
}
function placeLandSeaAux(){
  const panel=document.getElementById('landsea-formation');if(!panel)return;
  const host=STATE.step===3&&innerWidth<=1100?document.getElementById('sp-body'):document.body;
  if(panel.parentElement!==host){if(host===document.body)host.append(panel);else host.prepend(panel);}
}
function drawLandSeaFormation(){
  const panel=document.getElementById('landsea-formation');if(panel)panel.hidden=true;
}
function drawLandSeaComparison(){
  const ctx=document.getElementById('landsea-comparison-canvas').getContext('2d');ctx.clearRect(0,0,760,250);
  for(const[winter,offset]of[[true,0],[false,380]]){ctx.save();ctx.translate(offset,0);formationText(ctx,winter?'1月 · 冬季':'7月 · 夏季',190,28,'#e9dfb9',23,'center');ctx.fillStyle='#5d4b38';ctx.fillRect(30,140,135,30);ctx.fillStyle='#214b63';ctx.fillRect(215,140,135,30);formationText(ctx,'大陆',98,157,'#f2d8ae',20,'center');formationText(ctx,'海洋',282,157,'#b5dcf2',20,'center');formationText(ctx,winter?'H 冷高压':'L 热低压',98,116,winter?'#eed69b':'#a4d9fa',20,'center');formationText(ctx,winter?'相对低压':'相对高压',282,116,'#d4e4eb',20,'center');formationPath(ctx,winter?[[98,70],[98,99]]:[[98,99],[98,70]],1,winter?'#83c8fa':'#ffa977',3);formationPath(ctx,winter?[[98,190],[282,210]]:[[282,210],[98,190]],1,'#ffc387',3);formationText(ctx,winter?'大陆 → 海洋 · 偏北风':'海洋 → 大陆 · 偏南风',190,238,'#c2d8e3',19,'center');ctx.restore();}
}
function createClimateFormation(){
  const box=document.createElement('section');box.className='mc-mechanism-card';box.innerHTML='<header><h3 id="climate-mechanism-heading">气流与降水机制</h3><span>橙箭头：风 · 蓝圆点：水汽 · 蓝短线：雨</span></header><canvas id="climate-formation-canvas" width="960" height="300" role="img" aria-label="气流来源、水汽输送、抬升冷却、凝结降雨的分步机制"></canvas><p>教学示意：动画时间、粒子数量不对应真实时长和雨量；真实月常值是独立统计资料，非动画计算结果。</p>';
  monsoonStage.querySelector('.mc-climate-card').before(box);
}
function drawClimateFormation(){
  if(!monsoonStage||STATE.step!==4)return;
  const f=MONSOON_CLIMATE.formation,s=monsoonSite(),wet=formationLocalSummer(),ctx=document.getElementById('climate-formation-canvas').getContext('2d');ctx.clearRect(0,0,960,300);ctx.fillStyle='#101e2d';ctx.fillRect(0,0,960,300);
  document.getElementById('climate-mechanism-heading').textContent=f.view==='result'?`${s.name} · 机制结果对照`:formationStages('climate')[f.node].title;
  const stage=formationStages('climate')[f.node].key;
  if(f.view==='mechanism'&&['shift','trade','cross'].includes(stage)){
    const shift=formationLevel('climate','shift'),trade=formationLevel('climate','trade'),cross=formationLevel('climate','cross');
    ctx.strokeStyle='#8bafc9';ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(100,160);ctx.lineTo(840,160);ctx.stroke();ctx.setLineDash([]);formationText(ctx,'0° 赤道',110,145,'#e6d69c');formationText(ctx,'北半球 ↑',800,45);formationText(ctx,'南半球 ↓',800,265);
    ctx.fillStyle='#cc9c6433';ctx.fillRect(180,210,540,30);formationText(ctx,'南半球副热带高压',300,230,'#f0dba3',20);ctx.fillStyle='#7cb7db33';ctx.fillRect(180,130-65*shift,540,30);formationText(ctx,'低压背景北移 · 南亚低压',300,145-65*shift,'#9edbff',20);
    const south=[[580,255],[540,213],[500,165]],north=[[500,165],[505,133],[555,101],[620,75]];formationPath(ctx,south,trade,'#ffd09b',5);formationParticles(ctx,south,f.clock,6,'#ffd09b',5,trade);formationPath(ctx,north,cross,'#ffa477',5);formationParticles(ctx,north,f.clock,6,'#ffa477',5,cross);
    if(cross>.35){formationPath(ctx,[[522,119],[560,145]],1,'#68e7f0');formationText(ctx,'运动方向右侧',655,134,'#68e7f0',20);}
    if(trade>0)formationText(ctx,'东南信风',665,205,'#ffd09b',22);if(cross>0)formationText(ctx,'西南气流',670,85,'#ffa477',22);return;
  }
  const source=formationLevel('climate','source'),moisture=formationLevel('climate','moisture'),lift=formationLevel('climate','lift'),rain=formationLevel('climate','rain');
  const mountain=wet&&s.id==='mumbai',front=wet&&['beijing','shanghai'].includes(s.id),path=wet?[[100,240],[260,240],[420,220],[500,145],[570,95]]:[[100,240],[280,240],[490,240],[720,240]];
  ctx.fillStyle=wet?'#174862':'#5c4d39';ctx.fillRect(55,250,355,35);ctx.fillStyle='#594b39';ctx.fillRect(410,250,495,35);
  formationText(ctx,wet?'海洋源区':'大陆源区',220,269,wet?'#a9e4ff':'#e6d2ac',23,'center');formationText(ctx,`${s.name} · ${MONSOON_CLIMATE.month}月 · 当地${wet?'夏':'冬'}季`,670,270,'#e6d2ac',23,'center');
  if(source>0){formationPath(ctx,path.slice(0,3),source,'#ffba79',4);formationText(ctx,wet?'来自海洋的气流':'来自大陆的气流',110,203,'#ffce9a',22);}
  if(moisture>0){formationParticles(ctx,path.slice(0,3),f.clock,wet?16:3,'#71d9ff',5,moisture);formationText(ctx,wet?'水汽随气流输送':'水汽条件相对较弱',110,60,'#86dcff',24);}
  if(lift>0&&wet){
    if(mountain){ctx.fillStyle='#9a8466';ctx.beginPath();ctx.moveTo(430,250);ctx.lineTo(610,120);ctx.lineTo(770,250);ctx.closePath();ctx.fill();formationText(ctx,'迎风坡',504,236,'#ffe1aa',19,'center');formationText(ctx,'背风坡',705,236,'#d5c8b6',19,'center');formationText(ctx,'西高止山',683,192,'#e2cfb3',18,'center');formationPath(ctx,[[320,176],[410,176]],1,'#ffba79',3);formationText(ctx,'风向',363,155,'#ffce9a',17,'center');}
    if(front){ctx.fillStyle='#669abe33';ctx.beginPath();ctx.moveTo(450,250);ctx.lineTo(680,130);ctx.lineTo(860,250);ctx.closePath();ctx.fill();formationText(ctx,'锋面等抬升条件',730,210,'#b4d8ee',21);}
    if(s.id==='darwin')formationText(ctx,'湿润气流辐合 / 上升',720,212,'#b4d8ee',21);
    formationPath(ctx,path.slice(2),lift,'#ffba79',4);formationParticles(ctx,path.slice(2),f.clock,8,'#71d9ff',4,lift);
    // 同一气团随阶段进度抬升，颜色与温度柱同步变化；不使用虚构温度数值。
    const parcel=climateParcelVisual(lift),color=`rgb(${Math.round(255-133*parcel.cooling)},${Math.round(178+34*parcel.cooling)},${Math.round(110+145*parcel.cooling)})`;
    if(STATE.showParticles){ctx.fillStyle=color;ctx.strokeStyle='#fff5d9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(parcel.x,parcel.y,10,0,Math.PI*2);ctx.fill();ctx.stroke();}
    formationText(ctx,'同一气团：上升 → 温度降低',450,33,'#f5d398',20);
    ctx.strokeStyle='#65859d';ctx.lineWidth=2;ctx.strokeRect(855,80,22,96);ctx.fillStyle=color;ctx.fillRect(858,173-(82-50*parcel.cooling),16,82-50*parcel.cooling);
    formationText(ctx,'温度',866,59,'#dce8f0',18,'center');formationText(ctx,'高',894,85,'#ffba79',16);formationText(ctx,'低',894,170,'#89d8ff',16);formationText(ctx,'示意',866,195,'#a7c3d4',15,'center');
    formationText(ctx,parcel.condensed?'达到凝结条件':'尚未凝结',685,63,parcel.condensed?'#b9e6ff':'#f5d398',18,'center');
    if(parcel.condensed){ctx.fillStyle='#d7eaf2';for(const[x,y,r]of[[510,85,22],[540,68,28],[575,82,25]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}formationText(ctx,'凝结 → 云',680,96,'#d7eaf2',20,'center');}
  }else if(lift>0){formationText(ctx,'水汽较少，降水通常较少',480,112,'#c9dce7',24);formationText(ctx,'仍可能有锋面降雨，冬季并非完全无雨',480,151,'#a7c3d4',19);}
  if(rain>0&&wet){ctx.strokeStyle='#75caff';ctx.lineWidth=3;for(let j=0;j<10;j++){const x=climateRainX(j),floor=mountain?250-(x-430)*130/180:240,y=108+((f.clock*45+j*17)%Math.max(8,floor-128));ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,Math.min(floor-4,y+13*rain));ctx.stroke();}formationText(ctx,mountain?'迎风坡降水较多':'水汽 + 抬升 → 降雨',700,137,'#86dcff',19,'center');}
  if(rain>0&&!wet)formationText(ctx,'少雨对照 ≠ 无雨',710,85,'#c4dde9',25);
}
function climateParcelVisual(lift){
  const t=clamp(lift,0,1),points=[[420,220],[500,145],[570,95]],q=t*2,i=Math.min(1,Math.floor(q)),u=q-i;
  return {x:lerp(points[i][0],points[i+1][0],u),y:lerp(points[i][1],points[i+1][1],u),cooling:t,condensed:t>=.75};
}
function climateRainX(index){return 490+index*10;}
function formationDiagnosis(){
  return '<details class="formation-diagnosis"><summary>独立解释与迁移任务</summary><ol><li>补画冬夏海陆近地面高低压与风向，解释空气柱质量的变化。</li><li>在陌生气压图上区分推动方向与两半球近地面风向。</li><li>为什么有海洋水汽还要判断抬升条件？用孟买解释雨季。</li><li>达尔文1月与7月分别是什么季节？怎样解释湿季？</li></ol><p>开放解释与作图由教师评议；可进入气候练习或标准剖面作图。</p></details>';
}
