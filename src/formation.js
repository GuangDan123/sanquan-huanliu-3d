/* 季节、海陆与气候的分步机制。时间与数值均为教学示意。 */
function newFormationState(){return {view:'mechanism',node:0,progress:0,continuous:false,reveal:false,clock:0,cross:true};}
function formationState(kind){return (kind==='landsea'?LANDSEA:MONSOON_CLIMATE).formation;}
function formationStages(kind){
  if(kind==='landsea'){
    const winter=LANDSEA.month===1;
    return [
      {key:'bridge',title:'引入季节与海陆',question:'保留自转，先改变季节：理想气压带向哪一侧移动？',answer:'气压带随直射点季节移动：1月偏南、7月偏北。接着在相同季节加入海陆差异，区分两个条件的作用。',duration:3},
      {key:'heat',title:'海陆温度响应',question:'进入同一季节，大陆与海洋哪一侧升温或降温更快？',answer:winter?'冬季陆地降温比海洋快，大陆相对更冷；海洋温度变化较缓慢。':'夏季陆地升温比海洋快，大陆相对更暖；海洋温度变化较缓慢。',duration:4},
      {key:'column',title:'气柱响应与空气调整',question:'温度差如何引起垂直运动和高空空气调整？',answer:winter?'大陆气柱冷却收缩；同一高空高度，大陆气压相对较低，空气向冷端补充。近地面高压与气柱质量增加相联系，不能只凭体积收缩判断地面气压。':'大陆气柱受热膨胀；同一高空高度，大陆气压相对较高，空气向外输送。近地面低压与气柱质量减少相联系，不能只凭体积膨胀判断地面气压。',duration:4},
      {key:'pressure',title:'大陆气压中心',question:'在同一近地面高度比较，哪一侧气压较高？',answer:winter?'大陆冷高压形成，邻近海洋气压相对较低。气压取决于上方空气柱重量，不能仅用冷热直接替代空气质量调整。':'大陆热低压形成，邻近海洋气压相对较高。海洋副热带高压还有动力作用，并非都由海水较冷形成。',duration:4},
      {key:'band',title:'连续气压带被改变',question:'大陆气压中心怎样改变理想的连续气压带？',answer:winter?'亚洲冷高压使北半球副极地低压带呈间断分布；海洋低压中心包含大尺度动力作用。':'亚洲热低压使北半球副热带高压带呈间断分布；南半球海洋占优势，气压带相对连续。',duration:4},
      {key:'wind',title:'推动、偏转与季风',question:'高压到低压的推动方向与实际近地面风向有什么区别？',answer:winter?'气压梯度推动气流由大陆高压流向海洋；北半球右偏及摩擦共同影响近地面风，东亚常见偏北冬季风。':'气压梯度推动气流由海洋流向大陆低压；北半球右偏及摩擦共同影响近地面风，东亚常见偏南夏季风。',duration:5}
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
  if(action==='play'){if(f.view==='result')STATE.playing=!STATE.playing;else if(STATE.playing)STATE.playing=false;else if(f.progress===1)formationAction(kind,'next');else STATE.playing=true;}
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
  view.onchange=()=>{f.view=view.value;if(kind==='landsea'&&f.view==='mechanism'){LANDSEA.surface='real';LANDSEA.region='asia';rebuildLandSea();focusLandSeaRegion('asia');}STATE.playing=false;f.reveal=false;refreshFormation(kind);frameScene(true);};
  mode.onchange=()=>{f.continuous=mode.value==='continuous';resetFormation(kind);refreshFormation(kind);};
  for(const a of ['prev','next','replay','restart'])document.getElementById(kind+'-formation-'+a).onclick=()=>formationAction(kind,a);
  document.getElementById(kind+'-formation-reveal').onclick=()=>{f.reveal=!f.reveal;updateFormationUI(kind);if(kind==='climate'){updateMonsoonClimateCopy();drawMonsoonClimateChart();}};
  updateFormationUI(kind);
}
function updateFormationUI(kind){
  const f=formationState(kind),stages=formationStages(kind),s=stages[f.node],status=document.getElementById(kind+'-formation-status');if(!status)return;
  status.textContent=`${f.node+1} / ${stages.length} · ${s.title} · ${STATE.playing?'演示中':f.progress===1?'本节点完成':'等待开始 / 已暂停'}`;
  document.getElementById(kind+'-formation-progress').value=f.progress;
  document.getElementById(kind+'-formation-prev').disabled=f.node===0;
  document.getElementById(kind+'-formation-next').disabled=f.node===stages.length-1&&f.progress===1;
  const question=document.getElementById(kind+'-formation-question');if(question)question.textContent=f.view==='result'?'结果对照：比较冬夏气压、风向和气候，解释变化的原因。':s.question;
  const answer=document.getElementById(kind+'-formation-answer');answer.textContent=f.view==='result'?stages.map(s=>s.answer).join(' '):s.answer;answer.hidden=!f.reveal;
  document.getElementById(kind+'-formation-reveal').textContent=f.reveal?'收起当前解释':'显示当前解释';
  const play=document.getElementById(kind==='landsea'?'landsea-play':'mc-play');if(play)play.textContent=STATE.playing?'暂停过程':f.view==='result'?'播放气流':formationFinished(kind)?'机制已完成':f.progress===1?'继续下一节点':'播放本节点';
  if(play)play.disabled=f.view==='mechanism'&&formationFinished(kind);
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
  panel.querySelector('details').ontoggle=()=>frameScene(true);
  panel.insertAdjacentHTML('beforeend','<details id="landsea-plan"><summary>水平俯视：推动、偏转与风向</summary><canvas id="landsea-plan-canvas" width="760" height="330" role="img" aria-label="北半球水平面内的气压梯度力、风向、偏向力和摩擦力"></canvas><p class="landsea-plan-note">上下表示南北，左右表示东西；与上方剖面的高度轴分开。北半球向前进方向右偏，摩擦力与风向相反。力箭头长度仅为示意。</p></details>');
  panel.querySelector('details').insertAdjacentHTML('beforeend','<p id="landsea-mass-explanation" hidden></p>');
  const legend=document.getElementById('landsea-legend');if(legend)panel.append(legend);
}
function drawLandSeaFormation(){
  const panel=document.getElementById('landsea-formation');if(!panel)return;panel.hidden=STATE.step!==3;if(panel.hidden)return;
  const f=LANDSEA.formation,winter=LANDSEA.month===1,ctx=document.getElementById('landsea-formation-canvas').getContext('2d');ctx.clearRect(0,0,760,500);ctx.fillStyle='#101e2d';ctx.fillRect(0,0,760,500);
  drawLandSeaPlan();
  const mass=document.getElementById('landsea-mass-explanation');mass.hidden=formationLevel('landsea','column')===0;
  mass.textContent=winter?'在同一高空高度比较，大陆冷端气压相对较低，空气向大陆补充。气柱质量增加，近地面气压升高。体积收缩本身不等于质量增加。':'在同一高空高度比较，大陆暖端气压相对较高，空气向外输送。气柱质量减少，近地面气压降低。体积膨胀本身不等于质量减少。';
  panel.querySelector('summary').textContent=LANDSEA.surface==='ideal'?'均匀地表对照 · 点击展开':'辅助海陆热力剖面 · 点击展开';
  document.getElementById('landsea-season-compare').hidden=!formationFinished('landsea')||LANDSEA.surface==='ideal';
  if(formationFinished('landsea')&&LANDSEA.surface==='real')drawLandSeaComparison();
  if(LANDSEA.surface==='ideal'){formationText(ctx,'理想条件：均匀地表',380,120,'#e9efc8',30,'center');formationText(ctx,'近地面气压按纬度连续分布',380,210,'#c4dfed',25,'center');formationText(ctx,'先切换相同月份，再加入真实海陆比较',380,310,'#c4dfed',23,'center');return;}
  const heat=formationLevel('landsea','heat'),column=formationLevel('landsea','column'),pressure=formationLevel('landsea','pressure'),wind=formationLevel('landsea','wind');
  if(f.view==='mechanism'&&f.node===0){
    formationText(ctx,'先改变季节，再加入海陆差异',380,40,'#e9efc8',24,'center');
    const p=formationLevel('landsea','bridge'),shift=(winter?-1:1)*40*p;
    for(const [y,label,c]of[[170,'副热带高压带','#efd895'],[260,'赤道低压带','#eea398'],[350,'副热带高压带','#efd895']]){
      ctx.fillStyle=c+'33';ctx.fillRect(80,y-12,600,24);ctx.fillStyle=c+'88';ctx.fillRect(80,y-shift-12,600,24);formationText(ctx,label,380,y-shift,c,22,'center');
    }
    formationPath(ctx,[[705,270],[705,270-shift]],p,'#7dd9ee');formationText(ctx,'北 ↑',700,100,'#aacad9');formationText(ctx,'南 ↓',700,400,'#aacad9');
    formationText(ctx,winter?'1月：理想带偏南（位移为示意）':'7月：理想带偏北（位移为示意）',380,440,'#b9d4de',22,'center');
    formationText(ctx,'保留自转 · 接着比较同季节的均匀地表与真实海陆',380,475,'#b9d4de',18,'center');return;
  }
  formationText(ctx,`${LANDSEA.month}月 · 北半球${winter?'冬':'夏'}季`,380,27,'#e9efc8',24,'center');
  ctx.fillStyle='#614e38';ctx.fillRect(80,315,275,35);ctx.fillStyle='#174b64';ctx.fillRect(405,315,275,35);formationText(ctx,'大陆',217,334,'#ffdeab',22,'center');formationText(ctx,'邻近海洋',542,334,'#b9eaff',22,'center');
  ctx.save();ctx.strokeStyle='#61748b';ctx.setLineDash([8,7]);for(const y of [120,280]){ctx.beginPath();ctx.moveTo(70,y);ctx.lineTo(690,y);ctx.stroke();}ctx.restore();formationText(ctx,'高空同一高度',80,95,'#9ebccd',18);formationText(ctx,'近地面同一高度',80,303,'#9ebccd',18);
  if(heat>0){
    const color=winter?'#83c8fa':'#ff9f73',height=110+(winter?-45:45)*column;ctx.globalAlpha=heat;ctx.fillStyle=color+'55';ctx.fillRect(170,310-height,95,height);ctx.fillStyle='#89bcd733';ctx.fillRect(495,195,95,115);ctx.globalAlpha=1;
    formationText(ctx,winter?'降温快 · 相对冷':'升温快 · 相对暖',217,372,color,21,'center');formationText(ctx,'温度变化较缓慢',542,372,'#a7d8eb',21,'center');
    ctx.fillStyle=color;ctx.fillRect(170,386,95*heat,5);ctx.fillStyle='#9dcde0';ctx.fillRect(495,386,35*heat,5);
  }
  if(column>0){
    const pts=winter?[[220,150],[220,260]]:[[220,260],[220,150]],upper=winter?[[550,140],[390,140],[250,140]]:[[250,140],[390,140],[550,140]];
    formationPath(ctx,pts,column,winter?'#8bc8ff':'#ffaa7c');formationParticles(ctx,pts,f.clock,4,winter?'#8bc8ff':'#ffaa7c',5,column);
    formationPath(ctx,upper,column,'#ffd69b');formationParticles(ctx,upper,f.clock,6,'#ffd69b',4,column);
    formationText(ctx,winter?'收缩 / 下沉':'膨胀 / 上升',285,215,winter?'#8bc8ff':'#ffaa7c',20);
    formationText(ctx,winter?'高空空气补充':'高空空气外流',470,170,'#ffd69b',18,'center');
  }
  if(pressure>0){ctx.globalAlpha=pressure;formationText(ctx,winter?'H 冷高压':'L 热低压',217,280,winter?'#ffe3a2':'#a0dcff',27,'center');formationText(ctx,winter?'相对较低压':'相对较高压',542,280,'#dae8dc',22,'center');formationText(ctx,winter?'气柱质量增加':'气柱质量减少',217,400,'#dae8dc',18,'center');ctx.globalAlpha=1;}
  if(column>0){
    formationText(ctx,winter?'相对低压':'相对高压',217,116,'#d9e7ed',18,'center');
    formationText(ctx,winter?'相对高压':'相对低压',542,116,'#d9e7ed',18,'center');
    const change=Math.round(pressure*3),land=8+(winter?change:-change),sea=16-land;
    for(const [x,count,c]of[[110,land,'#ffca8b'],[435,sea,'#9cd8f4']])for(let i=0;i<count;i++){ctx.fillStyle=c;ctx.fillRect(x+i*18,433,13,15);}
    formationText(ctx,`大陆气柱：${land}格`,217,418,'#ffca8b',18,'center');formationText(ctx,`海洋气柱：${sea}格`,542,418,'#9cd8f4',18,'center');
    formationText(ctx,'格数仅表示质量收支关系，非实测值或守恒数值模拟',380,470,'#b9d4de',18,'center');
    formationText(ctx,'温差 → 高空调整 → 气柱质量改变 → 近地面气压变化',380,492,'#b9d4de',17,'center');
  }
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
  const mountain=wet&&s.id==='mumbai',front=wet&&['beijing','shanghai'].includes(s.id),path=wet?[[100,240],[260,240],[420,220],[520,130],[620,90]]:[[100,240],[280,240],[490,240],[720,240]];
  ctx.fillStyle=wet?'#174862':'#5c4d39';ctx.fillRect(55,250,355,35);ctx.fillStyle='#594b39';ctx.fillRect(410,250,495,35);
  formationText(ctx,wet?'海洋源区':'大陆源区',220,269,wet?'#a9e4ff':'#e6d2ac',23,'center');formationText(ctx,`${s.name} · ${MONSOON_CLIMATE.month}月 · 当地${wet?'夏':'冬'}季`,670,270,'#e6d2ac',23,'center');
  if(source>0){formationPath(ctx,path.slice(0,3),source,'#ffba79',4);formationText(ctx,wet?'来自海洋的气流':'来自大陆的气流',110,203,'#ffce9a',22);}
  if(moisture>0){formationParticles(ctx,path.slice(0,3),f.clock,wet?16:3,'#71d9ff',5,moisture);formationText(ctx,wet?'水汽随气流输送':'水汽条件相对较弱',110,60,'#86dcff',24);}
  if(lift>0&&wet){
    if(mountain){ctx.fillStyle='#9a8466';ctx.beginPath();ctx.moveTo(430,250);ctx.lineTo(565,120);ctx.lineTo(680,250);ctx.closePath();ctx.fill();formationText(ctx,'西高止山迎风坡',640,213,'#e2cfb3',21);}
    if(front){ctx.fillStyle='#669abe33';ctx.beginPath();ctx.moveTo(450,250);ctx.lineTo(680,130);ctx.lineTo(860,250);ctx.closePath();ctx.fill();formationText(ctx,'锋面等抬升条件',730,210,'#b4d8ee',21);}
    if(s.id==='darwin')formationText(ctx,'湿润气流辐合 / 上升',720,212,'#b4d8ee',21);
    formationPath(ctx,path.slice(2),lift,'#ffba79',4);formationParticles(ctx,path.slice(2),f.clock,8,'#71d9ff',4,lift);
    if(lift>.45)formationText(ctx,'上升 → 冷却',480,44,'#f5d398',23);
    if(lift>.75){ctx.fillStyle='#d7eaf2';for(const[x,y,r]of[[590,85,22],[620,68,28],[655,82,25]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}formationText(ctx,'达到凝结条件 → 云',710,75,'#d7eaf2',21);}
  }else if(lift>0){formationText(ctx,'水汽较少，降水通常较少',480,112,'#c9dce7',24);formationText(ctx,'仍可能有锋面降雨，冬季并非完全无雨',480,151,'#a7c3d4',19);}
  if(rain>0&&wet){ctx.strokeStyle='#75caff';ctx.lineWidth=3;for(let j=0;j<10;j++){const x=570+j*11,y=115+((f.clock*45+j*17)%115);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+13*rain);ctx.stroke();}formationText(ctx,'水汽 + 抬升条件 → 降雨',710,155,'#86dcff',22);}
  if(rain>0&&!wet)formationText(ctx,'少雨对照 ≠ 无雨',710,85,'#c4dde9',25);
}
function formationDiagnosis(){
  return '<details class="formation-diagnosis"><summary>独立解释与迁移任务</summary><ol><li>补画冬夏海陆近地面高低压与风向，解释空气柱质量的变化。</li><li>在陌生气压图上区分推动方向与两半球近地面风向。</li><li>为什么有海洋水汽还要判断抬升条件？用孟买解释雨季。</li><li>达尔文1月与7月分别是什么季节？怎样解释湿季？</li></ol><p>开放解释与作图由教师评议；可进入气候练习或标准剖面作图。</p></details>';
}
