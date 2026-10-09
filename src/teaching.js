/* 教师讲课、教材读图与无提示作图。随构建内联，所有资料为离线概念示意。 */
const TEACHING = {route:'all',sectionMode:'full',tool:'arrow',sectionStrokes:[],windStrokes:[],sectionChecked:false,monsoonView:'monsoon',pressureReference:false,siteHemisphere:'north',quizLevel:'all'};
STATE.demoMode='step';
LESSON_QUIZ.push(
  {id:'upperWind',q:'忽略摩擦、达到理想稳定状态时，高空风与等压线怎样相交？',options:['近似平行','垂直相交','始终斜穿'],correct:0,reason:'气压梯度力与地转偏向力平衡时，高空风可近似平行等压线；近地面摩擦使风斜穿等压线。',review:'pressure'},
  {id:'seaCut',q:'北半球1月，大陆强高压使哪一气压带呈间断分布？',options:['副极地低气压带','副热带高气压带','赤道低气压带'],correct:0,reason:'冬季大陆冷高压使副极地低气压带呈间断分布；夏季大陆热低压使副热带高气压带呈间断分布。',review:'monsoon'},
  {id:'southJuly',q:'南半球35°附近大陆西岸，7月通常处于哪种控制情境？',options:['当地夏季，副热带高压','当地冬季，西风带','当地冬季，赤道低压'],correct:1,reason:'7月是南半球冬季，西风带向较低纬度移动，可带来海洋水汽；季节和月份需结合半球判断。',review:'climate'}
);

function modelAssumptionsHTML(context){
  const messages={single:'不考虑自转 · 地表均一 · 以太阳直射赤道为基准',three:'加入自转 · 保留均一地表与直射赤道基准',pressure:'同一水平面比较气压 · 北半球方向示意 · 区分瞬时运动与稳定状态',wind:'近地面平均风向 · 北右南左相对于前进方向',season:'加入直射点季节移动 · 均一地表参考 · 带宽和位移为示意',monsoon:'近地面同一高度比较气压 · 季风为季节变化 · 地图位置、纬度和区域范围不按比例',section:'经圈平均剖面 · 0°/30°/60°/90°为近似位置 · 高度不按比例',climate:'固定地点解释控制带 · 结合水汽与海陆位置 · 气候资料为示意'};
  return `<div class="model-assumptions"><strong>本图条件：</strong>${messages[context]||messages.three}</div>`;
}
function teachingRouteTopics(){const ids=TEACHING.route==='one'?['pressure','wind','section','quiz']:TEACHING.route==='two'?['season','monsoon','quiz','climate']:LESSON_TOPICS.map(t=>t.id);return LESSON_TOPICS.filter(t=>ids.includes(t.id));}
function initTeachingRoutes(){
  document.getElementById('lesson-tabs').insertAdjacentHTML('beforebegin','<div id="teaching-routes" class="lesson-controls"><span>教学路线</span><button class="btn btn-sm" data-route="all">全部主题</button><button class="btn btn-sm" data-route="one">第1课时：形成与分布</button><button class="btn btn-sm" data-route="two">第2课时：移动与季风</button></div>');
  document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{TEACHING.route=b.dataset.route;setLessonTab(teachingRouteTopics()[0].id);});
  updateTeachingRouteUI();
}
function updateTeachingRouteUI(){
  const ids=teachingRouteTopics().map(t=>t.id);
  document.querySelectorAll('[data-lesson-tab]').forEach(b=>b.hidden=!ids.includes(b.dataset.lessonTab));
  document.querySelectorAll('[data-route]').forEach(b=>{b.classList.toggle('active',b.dataset.route===TEACHING.route);b.setAttribute('aria-pressed',String(b.dataset.route===TEACHING.route));});
}

function pressureForceData(step=LESSON_STATE.pressureStep,p=lessonPressureProgress()){
  const angle=step===0?-Math.PI/2:step===1?lerp(-Math.PI/2,0,smoothstep(p)):lerp(0,-Math.PI/6,smoothstep(p));
  const unit=[Math.cos(angle),Math.sin(angle)],speed=step===0?110*p:step===1?110:lerp(110,78,smoothstep(p));
  const corSize=step===0?0:step===1?90*smoothstep(p):90*Math.cos(Math.abs(angle));
  const frictionSize=step===2?90*Math.sin(Math.abs(angle)):0;
  return {angle,velocity:unit.map(v=>v*speed),gradient:[0,-90],coriolis:[-unit[1]*corSize,unit[0]*corSize],friction:unit.map(v=>-v*frictionSize),stable:step>0&&p===1};
}
function drawPressurePanel(ctx,x,title,data,showWind=true){
  lessonLabel(ctx,title,x+230,28,'#d7e7f7',22);
  for(let i=0;i<5;i++){const y=80+i*48;ctx.strokeStyle='#3b5672';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+100,y);ctx.lineTo(x+435,y);ctx.stroke();lessonLabel(ctx,`${1000+i*4}`,x+53,y+5,'#b4c9dd',18);}
  lessonLabel(ctx,'hPa',x+53,55,'#b4c9dd',18);lessonLabel(ctx,'低压',x+390,55,'#ff9292',18);lessonLabel(ctx,'高压',x+390,301,'#83bbff',18);
  const o=[x+255,202];
  for(const [key,color] of [['gradient','#c8d7e6'],['coriolis','#66eeff'],['friction','#e39adf'],['velocity','#ffaa55']]){
    if(key==='velocity'&&!showWind)continue;
    const v=data[key];lessonArrow(ctx,...o,o[0]+v[0],o[1]+v[1],color,key==='velocity'?4:3);
  }
}
function drawTeachingPressure(ctx){
  const step=LESSON_STATE.pressureStep,p=lessonPressureProgress(),data=pressureForceData(step,p);
  if(step===2){drawPressurePanel(ctx,0,'高空：忽略摩擦',pressureForceData(1,1));drawPressurePanel(ctx,480,'近地面：加入摩擦',data);}
  else{
    drawPressurePanel(ctx,0,step===0?'① 由高压向低压开始运动':'② 高空风逐渐偏转',data,p>0||step>0);
    lessonLabel(ctx,'北半球 · 同一水平面',725,40,'#d7e7f7',22);
    const entries=[['气压梯度力：垂直等压线，向低压','#c8d7e6'],['地转偏向力：垂直风向，向右侧','#66eeff'],['风向：橙色；偏向力不直接向下','#ffaa55']];
    entries.forEach(([text,color],i)=>lessonLabel(ctx,text,725,112+i*62,color,18));
    lessonLabel(ctx,step===0?'直接动力来自气压差':'理想稳定时：两力平衡，风平行等压线',725,305,'#ffe2a0',18);
  }
  lessonLabel(ctx,'白：气压梯度力    青：地转偏向力    紫：摩擦力    橙：风向',480,345,'#c8d7e6',18);
  const texts=['① 气压梯度力推动空气由高压向低压开始运动','② 忽略摩擦：高空风逐渐趋于平行等压线','③ 摩擦减速并影响风向：近地面风斜穿等压线吹向低压'];
  const status=LESSON_STATE.running?'演示中':p===1?(step===2?'全部完成，可回退或重播':'本步完成，点击“下一步”继续'):p>0?'已暂停，可继续本步':'点击“下一步”开始';
  lessonText('lesson-phase',texts[step]+' · '+status);
}

function demoNodeStages(kind){
  if(kind==='single')return SINGLE_FLOW_STAGES.map((s,i)=>({start:i?SINGLE_FLOW_STAGES[i-1].until:0,end:s.until,title:s.text}));
  if(STATE.mechanismStage===0)return[{start:0,end:3,title:'① 高空气流先向极地运动'},{start:3,end:10,title:'② 对照经线，观察两半球向东偏转'}];
  if(STATE.mechanismStage===2)return[{start:0,end:3,title:'① 冷暖气流向60°附近辐合'},{start:3,end:7,title:'② 暖空气沿冷空气上方抬升'},{start:7,end:10,title:'③ 归纳副极地低压与高纬环流'}];
  return[{start:0,end:2.5,title:'① 高空气流汇入'},{start:2.5,end:4.5,title:'② 气流逐渐积聚'},{start:4.5,end:7.2,title:'③ 下沉形成近地面高压'},{start:7.2,end:10.2,title:'④ 近地面向两侧分流'},{start:10.2,end:12,title:'⑤ 归纳低纬环流'}];
}
function demoNodeState(kind){return kind==='single'?STATE.singleDemo:STATE.mechanismDemo;}
function demoPhaseElapsed(kind){const d=demoNodeState(kind),s=demoNodeStages(kind)[d.node||0];return STATE.demoMode==='step'&&!d.complete?Math.min(d.elapsed,s.end-1e-6):d.elapsed;}
function advanceDemoNodeTime(kind,dt){
  const d=demoNodeState(kind),stages=demoNodeStages(kind),last=stages.at(-1).end;
  const limit=STATE.demoMode==='step'?stages[d.node||0].end:last;
  d.elapsed=Math.min(limit,d.elapsed+Math.min(dt,.1)*STATE.speed);
  if(d.elapsed>=limit){d.running=false;d.complete=limit===last;STATE.playing=false;}
}
function chooseDemoNode(kind,index,play=false,previous=false){
  const d=demoNodeState(kind),stages=demoNodeStages(kind);if(index<0||index>=stages.length)return;
  d.node=index;d.elapsed=previous?stages[index].end:stages[index].start;d.complete=false;d.running=play;STATE.playing=play;
  if(kind==='single')updateSingleDemoUI();else{applyMechanismVisual();updateMechanismDemoUI();}
}
function mountDemoNodes(kind,panel){
  panel.insertAdjacentHTML('afterbegin',`<label class="demo-mode">播放方式 <select id="${kind}-demo-mode"><option value="step">讲课：每步停顿</option><option value="continuous">复习：连续演示</option></select></label><div id="${kind}-node-status" class="mechanism-demo-status" aria-live="polite"></div><div id="${kind}-node-question" class="demo-node-question"></div>`);
  panel.insertAdjacentHTML('beforeend',`<div class="mechanism-actions demo-node-actions"><button class="btn" id="${kind}-node-prev">上一步</button><button class="btn" id="${kind}-node-replay">重播本步</button><button class="btn" id="${kind}-node-next">下一步</button></div>`);
  const select=document.getElementById(kind+'-demo-mode');select.value=STATE.demoMode;
  select.onchange=()=>{STATE.demoMode=select.value;chooseDemoNode(kind,0);};
  document.getElementById(kind+'-node-prev').onclick=()=>chooseDemoNode(kind,(demoNodeState(kind).node||0)-1,false,true);
  document.getElementById(kind+'-node-replay').onclick=()=>chooseDemoNode(kind,demoNodeState(kind).node||0,true);
  document.getElementById(kind+'-node-next').onclick=()=>{
    const d=demoNodeState(kind),s=demoNodeStages(kind)[d.node||0];if(d.running&&STATE.playing)return;
    if(d.elapsed>=s.end)chooseDemoNode(kind,(d.node||0)+1,true);else{d.running=true;STATE.playing=true;}
  };
  updateDemoNodeControls(kind);
}
function updateDemoNodeControls(kind){
  const el=document.getElementById(kind+'-node-status');if(!el)return;
  const d=demoNodeState(kind),stages=demoNodeStages(kind),index=d.node||0,s=stages[index],step=STATE.demoMode==='step';
  el.textContent=step?`步骤 ${index+1}/${stages.length} · ${s.title}${!d.running&&d.elapsed>=s.end?' · 本步完成':''}`:'连续演示：可随时暂停';
  const questions=kind==='single'?['先预测：受热最多的赤道，空气怎样运动？','追问：同一高度上，气压差怎样推动高空回流？','先预测：极地空气冷却后，垂直运动怎样？','归纳：近地面从哪一端流向哪一端？']:STATE.mechanismStage===0?['先判断：高空气流的初始方向？','对照：两半球左右偏转为何都获得东向分量？']:STATE.mechanismStage===2?['比较：两股气流的冷热与来向？','解释：暖空气为什么被抬升，而不是当地受热上升？','归纳：近地面气压高低与高纬圈方向？']:['观察：高空气流向哪里汇入？','预测：积聚后会怎样运动？','解释：这是热力性还是动力性高压？','推导：近地面向两侧分别形成什么风带？','归纳：上下气流如何连接成低纬圈？'];
  lessonText(kind+'-node-question',step?questions[index]:'复习时请口述形成的因果链。');
  document.getElementById(kind+'-node-prev').disabled=!step||index===0;
  document.getElementById(kind+'-node-next').disabled=!step||(d.running&&STATE.playing)||(index===stages.length-1&&d.elapsed>=s.end);
  document.getElementById(kind+'-node-replay').disabled=!step;
  const play=document.getElementById(kind==='single'?'single-demo-play':'mechanism-demo-play');
  if(play){play.disabled=step&&d.elapsed>=s.end; if(play.disabled)play.textContent='本步已完成';}
}

function teachingSiteInfo(h=TEACHING.siteHemisphere,month=LESSON_STATE.season==='winter'?1:LESSON_STATE.season==='summer'?7:3){
  const north=h==='north',summer=north?month===7:month===1,winter=north?month===1:month===7;
  return{hemisphere:h,latitude:north?35:-35,month,season:summer?'夏季':winter?'冬季':'过渡季节',belt:summer?'副热带高气压带':winter?'盛行西风带':'控制带过渡',rain:summer?'下沉增温，通常少雨':winter?'海洋西风输送水汽，通常较湿润':'需结合实际移动与海陆条件'};
}
function climateTeachingData(h=TEACHING.siteHemisphere){
  const temp=[10,11,13,16,20,24,27,27,24,19,14,11],rain=[95,80,65,40,20,8,2,5,20,60,85,100],shift=h==='south'?6:0;
  return{temperature:temp.map((_,i)=>temp[(i+shift)%12]),precipitation:rain.map((_,i)=>rain[(i+shift)%12])};
}

function mountTeachingTopic(topic){
  const body=document.getElementById('lesson-body'),controls=body.querySelector('.lesson-controls');
  body.insertAdjacentHTML('afterbegin',modelAssumptionsHTML(topic));
  if(topic==='pressure'){
    body.insertAdjacentHTML('beforeend','<details class="teaching-bridge"><summary>先备知识：受热不均怎样形成热力环流？</summary><div class="thermal-grid"><div>同一高度比较</div><div><strong>暖端</strong></div><div><strong>冷端</strong></div><div>高空</div><div>相对较高压 →</div><div>相对较低压</div><div>垂直运动</div><div>受热膨胀，上升 ↑</div><div>冷却收缩，下沉 ↓</div><div>近地面</div><div>相对低压</div><div>← 相对高压</div></div><p>同一水平面的气压差产生水平气压梯度力，推动空气由高压向低压运动；高空与近地面回流联系成环流。气压高低须在同一高度比较。</p><button class="btn btn-sm" id="teaching-to-single">返回三维推导单圈环流</button></details>');
    document.getElementById('teaching-to-single').onclick=()=>{closeLesson();transitionToStep(0);setView('side');};
  }
  if(topic==='section'){
    controls.insertAdjacentHTML('beforeend','<label>图示 <select id="teaching-section-mode"><option value="full">完整参考图</option><option value="names">隐藏名称</option><option value="arrows">隐藏箭头</option><option value="blank">空白作图</option></select></label>');
    const mode=document.getElementById('teaching-section-mode');mode.value=TEACHING.sectionMode;
    mode.onchange=()=>{TEACHING.sectionMode=mode.value;TEACHING.sectionChecked=false;updateLessonView();};
    body.insertAdjacentHTML('beforeend',`<div class="teaching-work"><strong>独立作图：垂直运动 → 近地面流向 → 高空回流 → 气压带和风带</strong>${drawingControlsHTML('section')}<div class="lesson-controls"><button class="btn btn-sm" id="section-check">展开核对依据</button><button class="btn btn-sm" id="section-reference">显示参考图</button></div><p id="section-feedback" aria-live="polite"></p><div id="section-rubric" hidden>① 赤道与60°附近上升，30°附近与极地下沉；② 近地面从高压吹向低压；③ 高空回流与近地面经向流动对应，形成三个平均环流圈；④ 结合北右南左推导风向，名称按来向判断。自由作图由师生核对，不自动判分。</div></div>`);
    bindDrawing('section',document.getElementById('lesson-canvas'));
    document.getElementById('section-check').onclick=()=>{TEACHING.sectionChecked=true;document.getElementById('section-rubric').hidden=false;lessonText('section-feedback',`已记录 ${TEACHING.sectionStrokes.length} 笔，请按四项依据核对；可下载图示留作前后测。`);};
    document.getElementById('section-reference').onclick=()=>{TEACHING.sectionMode='full';mode.value='full';updateLessonView();};
  }
  if(topic==='monsoon'){
    controls.insertAdjacentHTML('beforeend','<label>读图任务 <select id="teaching-monsoon-view"><option value="monsoon">季风推导</option><option value="compare">1月/7月气压对照</option></select></label><label><input type="checkbox" id="teaching-pressure-reference">叠加理想气压带参考</label>');
    const select=document.getElementById('teaching-monsoon-view');select.value=TEACHING.monsoonView;
    select.onchange=()=>{TEACHING.monsoonView=select.value;LESSON_STATE.running=false;updateLessonView();};
    const reference=document.getElementById('teaching-pressure-reference');reference.checked=TEACHING.pressureReference;
    reference.onchange=()=>{TEACHING.pressureReference=reference.checked;updateLessonView();};
    body.insertAdjacentHTML('beforeend','<p class="teaching-prompt" id="teaching-monsoon-task"></p>');
  }
  if(topic==='season'||topic==='climate'){
    controls.insertAdjacentHTML('beforeend','<label>固定地点 <select id="teaching-site"><option value="north">35°N附近大陆西岸</option><option value="south">35°S附近大陆西岸</option></select></label>');
    const site=document.getElementById('teaching-site');site.value=TEACHING.siteHemisphere;
    site.onchange=()=>{TEACHING.siteHemisphere=site.value;updateLessonView();};
    body.insertAdjacentHTML('beforeend','<div class="teaching-site-card"><strong id="teaching-site-heading"></strong><p id="teaching-site-question"></p><button class="btn btn-sm" id="teaching-site-reveal">显示地点解释</button><p id="teaching-site-answer" hidden></p></div>');
    document.getElementById('teaching-site-reveal').onclick=()=>{const answer=document.getElementById('teaching-site-answer');answer.hidden=!answer.hidden;lessonText('teaching-site-reveal',answer.hidden?'显示地点解释':'收起地点解释');};
    if(topic==='climate'){
      body.insertAdjacentHTML('beforeend','<div class="lesson-visual teaching-climate-chart"><canvas id="teaching-climate-chart" width="1600" height="600" role="img" aria-label="35度附近大陆西岸气温与降水示意资料"></canvas></div><p class="lesson-note">示意资料，用于练习季节与降水关系；不是具体城市的观测数据。红线为气温，蓝柱为月降水量。</p>');
      document.querySelectorAll('[data-climate-season]').forEach(b=>b.textContent=b.dataset.climateSeason==='summer'?'7月对照':'1月对照');
    }
  }
}
function updateTeachingTopic(){
  const topic=LESSON_STATE.tab;
  if(topic==='monsoon'){
    const compare=TEACHING.monsoonView==='compare';
    document.getElementById('lesson-playbar').hidden=compare;
    ['lesson-add-surface','lesson-surface','lesson-monsoon-season','lesson-region'].forEach(id=>{const e=document.getElementById(id);(e.closest('label')||e).hidden=compare;});
    document.querySelector('#lesson-body .lesson-question').textContent=compare?'先预测：1月、7月哪一气压带被大陆气压中心改变？南半球为何相对连续？':LESSON_STATE.surface==='real'?'观察图中H和L：近地面风从哪里吹向哪里？改变季节后怎样变化？':LESSON_TOPICS.find(t=>t.id==='monsoon').question;
    lessonText('teaching-monsoon-task',compare?'读图：1月、7月分别是哪一气压带被大陆气压中心改变？南半球为什么相对连续？':'推导：先找H（高压）与L（低压），由高压判断初始流向，再考虑偏转；南亚夏季还要判断跨赤道前后的方向。');
    lessonText('lesson-explanation',compare?'1月大陆冷高压使副极地低气压带呈间断分布；7月大陆热低压使副热带高气压带呈间断分布。南半球海洋面积大，带状分布相对连续。':'H为高压，L为低压；比较近地面同一高度的气压，水平气压梯度力由高压指向低压，近地面风受偏向力与摩擦影响，斜穿等压线吹向低压。冬季海洋“较低压”是相对大陆冷高压而言，不能理解为整个海洋都是固定低压中心。东亚季风主要与海陆热力性质差异有关；南亚夏季还涉及气压带、风带北移，南半球东南信风跨赤道后在北半球向右偏，转为西南气流。季风是季节尺度的风向变化；海陆风是海岸地区的昼夜变化，二者不能混为一谈。');
  }else document.getElementById('lesson-playbar').hidden=false;
  if(topic==='pressure'){
    const q=document.querySelector('#lesson-body .lesson-question');
    const questions=['地球自转是水平风开始运动的直接原因吗？','忽略摩擦时，风最终与等压线怎样相交？两力怎样平衡？','加入摩擦后，为什么近地面风斜穿等压线吹向低压？'];
    q.textContent='先预测：'+questions[LESSON_STATE.pressureStep];
  }
  if(topic==='season'||topic==='climate'){
    const month=topic==='climate'?(LESSON_STATE.climateSeason==='winter'?1:7):LESSON_STATE.seasonValue>.5?7:LESSON_STATE.seasonValue<-.5?1:3;
    const site=teachingSiteInfo(TEACHING.siteHemisphere,month);
    lessonText('teaching-site-heading',`${Math.abs(site.latitude)}°${site.latitude>0?'N':'S'}附近大陆西岸 · ${month===3?'春秋过渡':month+'月'} · 当地${site.season}`);
    lessonText('teaching-site-question','先根据半球和月份判断当地季节，再根据控制带解释降水。若换到另一半球，同一月份的判断怎样变化？');
    lessonText('teaching-site-answer',`${site.belt}：${site.rain}。本例为典型大陆西岸情境，需结合海陆、水汽和实际季节移动。`);
    if(topic==='climate')drawTeachingClimateChart();
    if(topic==='season')drawTeachingSiteMarker();
  }
}

function drawingControlsHTML(kind){return `<div class="lesson-controls drawing-tools"><button class="btn btn-sm" data-draw-tool="arrow" data-draw-kind="${kind}">画箭头</button><button class="btn btn-sm" data-draw-tool="pen" data-draw-kind="${kind}">自由画笔</button><button class="btn btn-sm" data-draw-tool="label" data-draw-kind="${kind}">放置文字</button><input id="${kind}-label" class="drawing-label" aria-label="自填图示文字" maxlength="20" placeholder="自主填写名称，无候选提示"><button class="btn btn-sm" id="${kind}-undo">撤销一笔</button><button class="btn btn-sm" id="${kind}-clear">清空作图</button><button class="btn btn-sm" id="${kind}-image">下载图示</button></div><p class="lesson-note">拖动绘制箭头或线条；输入文字后选“放置文字”，点击图中位置。先独立完成，再展开核对依据。</p>`;}
function strokeList(kind){return kind==='section'?TEACHING.sectionStrokes:TEACHING.windStrokes;}
function drawStudentStrokes(ctx,kind){
  const strokes=[...strokeList(kind),...(TEACHING.activeStroke?.kind===kind?[TEACHING.activeStroke.stroke]:[])];
  for(const stroke of strokes){const points=stroke.points;if(stroke.tool==='label'){lessonLabel(ctx,stroke.text,...points[0],'#f4f6ff',18);continue;}if(points.length<2)continue;
    if(stroke.tool==='arrow')lessonArrow(ctx,...points[0],...points.at(-1),'#f4f6ff',3);
    else{ctx.strokeStyle='#f4f6ff';ctx.lineWidth=3;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
  }
}
function bindDrawing(kind,canvas){
  canvas.classList.add('drawing-canvas');canvas.tabIndex=0;
  const redraw=()=>kind==='section'?updateLessonView():drawWindTask();
  const point=e=>{const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)*960/r.width,(e.clientY-r.top)*360/r.height];};
  canvas.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();if(TEACHING.tool==='label'){const text=document.getElementById(kind+'-label').value.trim();if(text){strokeList(kind).push({tool:'label',text,points:[point(e)]});redraw();}return;}canvas.setPointerCapture(e.pointerId);TEACHING.activeStroke={kind,stroke:{tool:TEACHING.tool,points:[point(e)]}};redraw();};
  canvas.onpointermove=e=>{if(TEACHING.activeStroke?.kind!==kind)return;const points=TEACHING.activeStroke.stroke.points,p=point(e);if(TEACHING.tool==='arrow')points[1]=p;else points.push(p);redraw();};
  canvas.onpointerup=e=>{if(TEACHING.activeStroke?.kind!==kind)return;const stroke=TEACHING.activeStroke.stroke,p=point(e);stroke.points.push(p);if(Math.hypot(p[0]-stroke.points[0][0],p[1]-stroke.points[0][1])>2||stroke.points.length>3)strokeList(kind).push(stroke);delete TEACHING.activeStroke;redraw();};
  canvas.onpointercancel=()=>{delete TEACHING.activeStroke;redraw();};
  document.querySelectorAll(`[data-draw-kind="${kind}"]`).forEach(b=>b.onclick=()=>{TEACHING.tool=b.dataset.drawTool;document.querySelectorAll('[data-draw-tool]').forEach(x=>x.classList.toggle('active',x.dataset.drawTool===TEACHING.tool));});
  document.getElementById(kind+'-undo').onclick=()=>{strokeList(kind).pop();redraw();};
  document.getElementById(kind+'-clear').onclick=()=>{strokeList(kind).length=0;redraw();};
  document.getElementById(kind+'-image').onclick=()=>canvas.toBlob(blob=>teachingDownload(blob,kind==='section'?'三圈环流独立作图.png':'陌生气压图风向作图.png'));
}
function sectionAssessment(){return{mode:TEACHING.sectionMode,strokes:TEACHING.sectionStrokes.length,checked:TEACHING.sectionChecked,automaticScore:false};}
function drawTeachingSection(ctx){
  const x=lat=>480+lat*4.5,ground=260,upper=85,mode=TEACHING.sectionMode;
  const names=mode==='full'||mode==='arrows',arrows=mode==='full'||mode==='names',paths=mode!=='blank';
  const show=h=>LESSON_STATE.sectionH==='both'||(LESSON_STATE.sectionH==='north'?h===1:h===-1);
  ctx.fillStyle='#233648';ctx.fillRect(55,264,850,42);lessonLabel(ctx,'近地面',915,270,'#b6c5d4',18);lessonLabel(ctx,'高空',915,88,'#b6c5d4',18);
  for(const lat of [-90,-60,-30,0,30,60,90]){if(lat!==0&&!show(Math.sign(lat)))continue;
    ctx.strokeStyle='#2f4760';ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(x(lat),72);ctx.lineTo(x(lat),260);ctx.stroke();ctx.setLineDash([]);
    lessonLabel(ctx,lat===0?'0°':`${Math.abs(lat)}°${lat>0?'N':'S'}`,x(lat),333,'#d7e7f7',18);
    if(names)lessonLabel(ctx,lat===0||Math.abs(lat)===60?'低压':'高压',x(lat),290,lat===0||Math.abs(lat)===60?'#ff9292':'#83bbff',18);
  }
  if(paths)for(const h of [-1,1]){if(!show(h))continue;
    for(const [rise,sink,color,name] of [[0,30,'#ffaa55','低纬'],[60,30,'#ffd35c','中纬'],[60,90,'#88caff','高纬']]){
      const a=x(rise*h),b=x(sink*h);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(Math.min(a,b),upper,Math.abs(b-a),ground-upper);
      if(arrows){lessonArrow(ctx,a,218,a,132,color);lessonArrow(ctx,b,128,b,221,color);lessonArrow(ctx,lerp(a,b,.3),upper,lerp(a,b,.7),upper,color);lessonArrow(ctx,lerp(b,a,.3),ground,lerp(b,a,.7),ground,color);}
      if(names)lessonLabel(ctx,name+'环流',(a+b)/2,47,color,18);
    }
  }
  drawStudentStrokes(ctx,'section');
  const messages={0:'赤道：受热上升 → 热力性低压',30:'30°附近：高空积聚与下沉 → 动力性高压',60:'60°附近：冷暖辐合抬升 → 动力性低压',90:'极地：冷却下沉 → 热力性高压'};
  lessonText('lesson-phase',mode==='full'?messages[LESSON_STATE.sectionLat]:mode==='blank'?'独立作图：先画垂直运动，再连接近地面与高空回流；不显示参考答案':'根据保留的信息推导隐藏部分，完成后显示参考核对');
}

function drawTeachingPressureMaps(ctx){
  for(const [offset,winter] of [[0,true],[490,false]]){
    const cx=offset+235;
    ctx.fillStyle='#112b42';ctx.fillRect(offset+12,68,446,182);
    lessonLabel(ctx,winter?'1月：大陆冷高压':'7月：大陆热低压',cx,28,'#d7e7f7',22);
    lessonLabel(ctx,winter?'副极地低压带呈间断分布':'副热带高压带呈间断分布',cx,58,'#ffe2a0',18);
    const y=winter?118:186,color=winter?'#74c0ee':'#ffd35c';
    // 相对位置简图：亚欧大陆—北太平洋—北美大陆—北大西洋；纬线为参考。
    ctx.fillStyle='#3f5b49';ctx.fillRect(offset+45,83,110,137);ctx.fillRect(offset+288,83,75,137);
    for(const [yy,name,c] of [[118,'60°N','#74c0ee'],[186,'30°N','#ffd35c']]){
      ctx.strokeStyle=c;ctx.globalAlpha=.35;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(offset+18,yy);ctx.lineTo(offset+450,yy);ctx.stroke();ctx.globalAlpha=1;lessonLabel(ctx,name,offset+30,yy-16,'#b4c9dd',18,'left');
    }
    if(TEACHING.pressureReference){ctx.save();ctx.setLineDash([8,7]);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(offset+15,y);ctx.lineTo(offset+454,y);ctx.stroke();ctx.restore();}
    // 大陆热力中心替代该纬度的理想带，海洋保留对应的低压/高压中心。
    ctx.fillStyle='#3f5b49';ctx.fillRect(offset+60,y-11,84,22);ctx.fillRect(offset+290,y-11,72,22);
    for(const [xx,text] of [[103,winter?'亚洲高压':'印度低压'],[228,winter?'阿留申低压':'夏威夷高压'],[400,winter?'冰岛低压':'亚速尔高压']]){
      lessonDot(ctx,offset+xx,y,winter?(xx===103?'#ffd35c':'#ff7979'):(xx===103?'#ff7979':'#ffd35c'));
      lessonLabel(ctx,text,offset+xx,y+28,xx===103?(winter?'#ffe2a0':'#ff9292'):(winter?'#ff9292':'#ffe2a0'),18);
    }
    lessonLabel(ctx,'亚欧大陆',offset+104,239,'#d7e7f7',18);lessonLabel(ctx,'北美',offset+325,239,'#d7e7f7',18);
    lessonLabel(ctx,'南半球：海洋面积大，带状分布相对连续',cx,281,'#c8d7e6',18);
    for(const [yy,c] of [[304,'#ffd35c'],[322,'#74c0ee']]){ctx.globalAlpha=.5;ctx.fillStyle=c;ctx.fillRect(offset+30,yy,400,7);ctx.globalAlpha=1;}
  }
  lessonLabel(ctx,'位置关系简图；中心位置、大小和带宽为示意，不是实测等压线图',480,350,'#a9bdd3',18);
  lessonText('lesson-phase','读图任务：圈出大陆气压中心，说出被改变的气压带；再比较南北半球的连续性。');
}
function drawTeachingSiteMarker(){
  const canvas=document.getElementById('lesson-canvas'),ctx=canvas.getContext('2d'),latitude=TEACHING.siteHemisphere==='north'?35:-35,y=180-latitude*1.55;
  lessonDot(ctx,573,y,'#f4f6ff');lessonArrow(ctx,615,y,586,y,'#f4f6ff',2);
  lessonLabel(ctx,`固定地点 ${Math.abs(latitude)}°${latitude>0?'N':'S'}`,716,y+22,'#f4f6ff',18);
}
function drawTeachingClimateChart(){
  const canvas=document.getElementById('teaching-climate-chart');if(!canvas)return;
  const ctx=canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,800,300);
  const data=climateTeachingData(),x=i=>80+i*56,yRain=v=>235-v*1.5,yTemp=v=>235-v*5;
  lessonLabel(ctx,'35°附近大陆西岸：气温与降水示意资料',400,26,'#d7e7f7',20);
  for(let i=0;i<=4;i++){const y=235-i*40;ctx.strokeStyle='#2f4760';ctx.beginPath();ctx.moveTo(55,y);ctx.lineTo(735,y);ctx.stroke();lessonLabel(ctx,String(i*8),34,y+5,'#ff9292',16);lessonLabel(ctx,String(Math.round(i*40/1.5)),768,y+5,'#83bbff',16);}
  lessonLabel(ctx,'°C',32,50,'#ff9292',18);lessonLabel(ctx,'mm',768,50,'#83bbff',18);
  data.precipitation.forEach((v,i)=>{ctx.fillStyle='#4a98d8';ctx.fillRect(x(i)-13,yRain(v),26,235-yRain(v));lessonLabel(ctx,String(i+1),x(i),265,'#d7e7f7',16);});
  ctx.strokeStyle='#ff9292';ctx.lineWidth=3;ctx.beginPath();data.temperature.forEach((v,i)=>i?ctx.lineTo(x(i),yTemp(v)):ctx.moveTo(x(i),yTemp(v)));ctx.stroke();data.temperature.forEach((v,i)=>lessonDot(ctx,x(i),yTemp(v),'#ff9292'));
  const month=LESSON_STATE.climateSeason==='winter'?1:7;ctx.strokeStyle='#ffe2a0';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(x(month-1),65);ctx.lineTo(x(month-1),242);ctx.stroke();ctx.setLineDash([]);lessonLabel(ctx,'月份',400,293,'#a9bdd3',18);
}

const TEACHING_QUIZ_LEVELS={foundation:['drive','arrowTrade','arrowWest','arrowPolar','right'],explain:['subtropical','subpolar','force','pole','upperWind','seaCut'],transfer:['june','eastWinter','southAsia','med','rain','southJuly']};
function mountTeachingQuiz(){
  const body=document.getElementById('lesson-body');
  body.insertAdjacentHTML('afterbegin','<div class="lesson-controls"><label>练习层次 <select id="teaching-quiz-level"><option value="all">全部任务</option><option value="foundation">基础：名称与方向</option><option value="explain">解释：成因与条件</option><option value="transfer">迁移：月份与材料</option></select></label><button class="btn btn-sm" id="teaching-evidence">导出本次作答</button><button class="btn btn-sm" id="teaching-worksheet">下载可打印任务单</button></div>');
  const select=document.getElementById('teaching-quiz-level');select.value=TEACHING.quizLevel;select.onchange=()=>{TEACHING.quizLevel=select.value;filterTeachingQuiz();};
  body.insertAdjacentHTML('beforeend',`<div class="teaching-work"><strong>迁移作图：陌生气压场中的风向</strong><p>北半球同一水平面，等压线数值由西向东降低。请从白点画出气压梯度力，再画近地面风向；说明偏转依据。箭头为方向示意。</p><div class="lesson-visual"><canvas id="teaching-wind-task" width="1920" height="720" role="img" aria-label="陌生气压图风向作图"></canvas></div>${drawingControlsHTML('wind')}<details><summary>完成后查看核对依据</summary>气压梯度力垂直等压线，由西侧高压指向东侧低压。北半球向前进方向右偏，近地面风斜穿等压线，具有向东和向南的分量，吹向东南、来自西北。偏向力垂直于瞬时风向；自由作图由师生核对。</details></div>`);
  bindDrawing('wind',document.getElementById('teaching-wind-task'));drawWindTask();filterTeachingQuiz();
  document.getElementById('teaching-evidence').onclick=()=>teachingDownload(new Blob([JSON.stringify(teachingEvidence(),null,2)],{type:'application/json'}),'气压带风带课堂作答.json');
  document.getElementById('teaching-worksheet').onclick=()=>teachingDownload(new Blob([teachingWorksheetHTML()],{type:'text/html;charset=utf-8'}),'气压带风带课堂任务单.html');
  document.getElementById('lesson-quiz-reset').onclick=()=>{LESSON_STATE.answers={};LESSON_STATE.graded=false;LESSON_STATE.essay='';TEACHING.windStrokes=[];renderLessonQuiz();mountTeachingQuiz();};
}
function filterTeachingQuiz(){
  const ids=TEACHING.quizLevel==='all'?LESSON_QUIZ.map(q=>q.id):TEACHING_QUIZ_LEVELS[TEACHING.quizLevel];
  document.querySelectorAll('#lesson-body .lesson-grid article').forEach(article=>article.hidden=!ids.includes(article.querySelector('[data-quiz-id]').dataset.quizId));
}
function drawWindTask(){
  const canvas=document.getElementById('teaching-wind-task');if(!canvas)return;const ctx=canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,960,360);
  for(let i=0;i<5;i++){const x=170+i*140;ctx.strokeStyle='#3b5672';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,65);ctx.lineTo(x,295);ctx.stroke();lessonLabel(ctx,`${1016-i*4} hPa`,x,43,'#c8d7e6',20);}
  lessonDot(ctx,425,205,'#f4f6ff');lessonLabel(ctx,'北 N ↑',875,85,'#c8d7e6',20);lessonLabel(ctx,'西 W',75,185,'#c8d7e6',20);lessonLabel(ctx,'东 E',890,185,'#c8d7e6',20);lessonLabel(ctx,'南 S ↓',875,285,'#c8d7e6',20);drawStudentStrokes(ctx,'wind');
}
function teachingEvidence(){return{recordedAt:new Date().toISOString(),answers:{...LESSON_STATE.answers},quiz:lessonQuizScore(),essay:LESSON_STATE.essay,section:JSON.parse(JSON.stringify(TEACHING.sectionStrokes)),wind:JSON.parse(JSON.stringify(TEACHING.windStrokes)),note:'课堂作答记录；自由作图和开放题由师生评议，不自动评分。'};}
function teachingDownload(blob,name){if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function teachingWorksheetHTML(){return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>气压带和风带课堂任务单</title><style>body{font:16px/1.8 sans-serif;max-width:800px;margin:24px auto;color:#111}h1{font-size:24px}section{break-inside:avoid;margin:20px 0}svg{width:100%;height:220px;border:1px solid #999}.line{border-bottom:1px solid #999;height:38px}button{padding:10px}@media print{button{display:none}body{margin:0}}</style><button onclick="window.print()">打印任务单</button><h1>气压带和风带：独立作图与解释</h1><p>班级：________ 日期：________　前测 / 后测（圈选）</p><section><strong>1. 同一水平面的风</strong><p>北半球，气压由西向东降低。从白点画气压梯度力与近地面风向，并解释依据。</p><svg viewBox="0 0 800 220"><g fill="none" stroke="#444">${[120,260,400,540,680].map(x=>`<path d="M${x},45V205"/>`).join('')}</g>${[1016,1012,1008,1004,1000].map((p,i)=>`<text x="${120+i*140}" y="25" text-anchor="middle">${p} hPa</text>`).join('')}<circle cx="330" cy="130" r="5" fill="white" stroke="black"/><text x="730" y="100">北↑</text></svg><div class="line"></div></section><section><strong>2. 三圈环流剖面</strong><p>先画垂直运动，再连接高空和近地面回流，最后标出气压带与三个风带。</p><svg viewBox="0 0 800 220"><path d="M60,180H730" stroke="#444"/>${[0,30,60,90].map((lat,i)=>`<path d="M${80+i*210},40V180" stroke="#bbb" stroke-dasharray="4 6"/><text x="${80+i*210}" y="210">${lat}°${lat?'N':''}</text>`).join('')}<text x="735" y="60">高空</text></svg></section><section><strong>3. 现实分布</strong><p>1月、7月北半球分别是哪一气压带被大陆气压中心改变？南半球为什么相对连续？</p><div class="line"></div><div class="line"></div></section><section><strong>4. 季节迁移</strong><p>35°S附近大陆西岸在7月处于什么季节？用控制带、空气运动和水汽解释降水条件。</p><div class="line"></div><div class="line"></div></section><section><strong>教师核对要点（可裁下）</strong><p>1. 气压梯度力向东，近地面风吹向东南；2. 0°/60°上升、30°/90°下沉，近地面从高压向低压；3. 1月副极地低压带，7月副热带高压带，南半球海洋广；4. 当地冬季，西风可输送海洋水汽。自由作图需结合实际箭头和解释评议。</p></section></html>`;}
