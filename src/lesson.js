/* 随构建内联的课堂探究模块。Canvas只表达教学关系，不进行动力积分。 */
const LESSON_TOPICS = [
  {id:'pressure',title:'风的成因',goal:'先解释空气为什么运动，再区分推动与偏转。',question:'地球自转是水平风开始运动的直接原因吗？',answer:'不是。水平气压梯度力是空气水平运动的直接动力，指向同一水平面上的低压；地转偏向力改变运动方向，近地面摩擦还会影响风速与风向。'},
  {id:'wind',title:'六个风带',goal:'从高压到低压、左右偏转、按来向命名，独立推导风向。',question:'北半球空气从30°附近流向赤道，为什么叫东北信风？',answer:'初始向南，北半球向前进方向右偏，获得西向分量，最终吹向西南。风向按来向命名，所以叫东北信风。南半球向北流动左偏，形成东南信风。'},
  {id:'season',title:'季节移动',goal:'比较春秋分、北半球夏季和冬季，区分直射点纬度与气压带位置。',question:'6月北半球气压带、风带向哪个方向移动？南半球呢？',answer:'以春秋分附近的位置为参考，6月各带总体偏北：北半球偏向较高纬度，南半球偏向较低纬度；12月总体偏南。太阳直射点与气压带位置不重合，真实移动有区域差异和滞后。'},
  {id:'monsoon',title:'海陆与季风',goal:'从均匀地表的连续带状模型过渡到冬夏气压中心与季风。',question:'真实北半球气压带为什么会被海陆上的气压中心改变？',answer:'海陆热力性质不同，同一季节大陆与海洋升温、降温不同，改变近地面气压分布。东亚季风主要与海陆热力差异有关；南亚夏季风还与气压带、风带北移及跨赤道气流有关。'},
  {id:'section',title:'标准剖面',goal:'把球面观察转成横向纬度、纵向高度的教材剖面，读出近地面与高空回流。',question:'0°、30°、60°、90°的垂直运动与气压高低如何对应？',answer:'赤道上升、30°附近下沉、60°附近上升、极地下沉，对应近地面的低、高、低、高。赤道低压与极地高压主要按热力成因理解；副热带高压与副极地低压主要按动力成因理解。'},
  {id:'quiz',title:'理解练习',goal:'检验气流方向、形成机制与地理解释；错误反馈引导回看。'},
  {id:'climate',title:'气候应用',goal:'建立控制带—空气运动—水汽与降水的解释链，避免绝对化判断。',question:'只知道某地在30°附近，能断定那里一定是沙漠吗？',answer:'不能。副热带高压控制时下沉增温通常不利于降水，但当地气候还受到海陆位置、季风、水汽来源与地形等影响。纬度不是唯一条件。'}
];
const LESSON_WINDS = [
  {id:'tradeN',name:'东北信风',h:1,from:30,to:0,east:-1,north:-1,source:'副热带高压',target:'赤道低压',toward:'西南',coming:'东北'},
  {id:'tradeS',name:'东南信风',h:-1,from:-30,to:0,east:-1,north:1,source:'副热带高压',target:'赤道低压',toward:'西北',coming:'东南'},
  {id:'westN',name:'北半球盛行西风',h:1,from:30,to:60,east:1,north:1,source:'副热带高压',target:'副极地低压',toward:'东北',coming:'西南'},
  {id:'westS',name:'南半球盛行西风',h:-1,from:-30,to:-60,east:1,north:-1,source:'副热带高压',target:'副极地低压',toward:'东南',coming:'西北'},
  {id:'polarN',name:'北半球极地东风',h:1,from:90,to:60,east:-1,north:-1,source:'极地高压',target:'副极地低压',toward:'西南',coming:'东北'},
  {id:'polarS',name:'南半球极地东风',h:-1,from:-90,to:-60,east:-1,north:1,source:'极地高压',target:'副极地低压',toward:'西北',coming:'东南'}
];
const LESSON_QUIZ = [
  {id:'drive',q:'水平风开始运动的直接动力是？',options:['水平气压梯度力','地转偏向力','摩擦力'],correct:0,reason:'同一水平面上的气压差产生水平气压梯度力，推动空气由高压向低压运动。',review:'pressure'},
  {id:'subtropical',q:'副热带高压的主要形成机制是？',options:['当地空气冷却下沉','教材模型中高空气流积聚与下沉','30°处地转偏向力突然向下'],correct:1,reason:'副热带高压是动力性高压；下沉空气还会绝热增温，不能解释为30°当地受冷形成。',review:'section'},
  {id:'subpolar',q:'60°附近较暖空气为什么上升？',options:['当地太阳辐射最强','两股空气一起竖直撞起','冷暖气流辐合，较暖空气沿较冷空气上方抬升'],correct:2,reason:'这是辐合抬升的动力过程，不是当地受热上升。',review:'polar'},
  {id:'right',q:'北半球气流的“右偏”，以什么为参照？',options:['屏幕右边','气流当前前进方向','永远指向东方'],correct:1,reason:'左右必须相对于瞬时前进方向判断；向北的右侧为东，向南的右侧为西。',review:'wind'},
  {id:'force',q:'地转偏向力是否直接将气流压向地面？',options:['是，所以形成30°下沉','否，水平偏向作用改变运动方向'],correct:1,reason:'不能把下沉画面理解为地转偏向力直接向下的作用。',review:'pressure'},
  {id:'june',q:'6月相对春秋分，全球气压带、风带总体怎样偏移？',options:['南北半球都向各自极地移动','总体偏北','总体偏南'],correct:1,reason:'6月总体偏北：北半球偏向高纬、南半球偏向低纬，不能同时说两半球都向极地移动。',review:'season'},
  {id:'eastWinter',q:'东亚冬季风的主要流向是？',options:['大陆流向海洋，通常为偏北风','海洋流向大陆，通常为偏南风'],correct:0,reason:'亚洲大陆冬季降温较快，形成强高压，风从大陆吹向海洋；常见为西北或东北风。',review:'monsoon'},
  {id:'southAsia',q:'南亚夏季西南季风可只用海陆热力差异解释吗？',options:['可以，与气压带移动无关','不可以，还涉及北移与跨赤道气流'],correct:1,reason:'南半球东南信风跨过赤道后，在北半球向右偏转，成为西南气流；季节移动与海陆差异共同作用。',review:'monsoon'},
  {id:'med',q:'北半球地中海沿岸夏季通常干燥，主要因为？',options:['西风带控制，水汽很多','副热带高压控制，空气下沉','夏季太阳直射30°'],correct:1,reason:'夏季副热带高压北移控制，通常下沉少雨；冬季西风带南移，可带来海洋水汽。',review:'climate'},
  {id:'arrowTrade',q:'选箭头：东北信风吹向哪里？',options:['↗ 东北','↘ 东南','↙ 西南','↖ 西北'],correct:2,reason:'“东北”指来向，吹向西南；不能把名称当作箭头指向。',review:'wind',wind:'tradeN'},
  {id:'arrowWest',q:'选箭头：南半球盛行西风通常吹向哪里？',options:['↗ 东北','↘ 东南','↙ 西南','↖ 西北'],correct:1,reason:'从30°附近向60°附近流动，初始向南，南半球左偏获得东向分量，吹向东南、来自西北。',review:'wind',wind:'westS'},
  {id:'arrowPolar',q:'选箭头：北半球极地东风通常吹向哪里？',options:['↗ 东北','↘ 东南','↙ 西南','↖ 西北'],correct:2,reason:'从极地高压向副极地低压流动，初始向南，北半球右偏后吹向西南。',review:'wind',wind:'polarN'},
  {id:'rain',q:'“西风带控制的地方必然湿润”是否正确？',options:['正确，只要有西风就多雨','不正确，还要分析水汽、海陆位置与地形'],correct:1,reason:'海洋来的西风常可输送水汽；内陆远离水源或处于背风坡时，降水条件不同。',review:'climate'},
  {id:'pole',q:'极地高压与副热带高压的成因相同吗？',options:['相同，都是当地冷却','不同，前者主要热力、后者主要动力'],correct:1,reason:'极地冷却下沉，副热带则按高空积聚与下沉的动力过程理解。',review:'section'}
];
const LESSON_PRESSURE_STEPS = [
  {title:'气压梯度力推动',start:0,end:2.4},
  {title:'地转偏向力偏转',start:2.4,end:5.2},
  {title:'近地面摩擦影响',start:5.2,end:8}
];
const LESSON_STATE = {open:false,tab:'pressure',pressureStep:0,elapsed:0,running:false,complete:false,wind:'tradeN',season:'equinox',seasonMode:'target',seasonFrom:0,seasonValue:0,surface:'ideal',monsoonSeason:'winter',region:'east',sectionH:'both',sectionLat:30,climate:'equator',climateSeason:'summer',answers:{},graded:false,essay:'',explanation:false};
let lessonReturnFocus=null, lessonPreviousPlaying=false;
const lessonBackgroundIds=['scene-container','step-panel','legend','control-panel','mode-toggle','teacher-bar','teacher-toggle','diagram-toggle','diagram-panel','lesson-entry','fullscreen-btn','perf-toggle'];
const lessonInertBefore=new Map();
function lessonDuration(){return LESSON_STATE.tab==='season'?(LESSON_STATE.seasonMode==='cycle'?16:4):8;}
function lessonProgress(){return clamp(LESSON_STATE.elapsed/lessonDuration(),0,1);}
function lessonSeasonTarget(){return LESSON_STATE.season==='summer'?1:LESSON_STATE.season==='winter'?-1:0;}
function lessonWind(){return LESSON_WINDS.find(w=>w.id===LESSON_STATE.wind);}
function lessonText(id,value){const el=document.getElementById(id);if(el&&el.textContent!==value)el.textContent=value;}
function openLesson(tab=LESSON_STATE.tab){
  if(!LESSON_STATE.open){
    lessonReturnFocus=document.activeElement;lessonPreviousPlaying=STATE.playing;STATE.playing=false;
    lessonBackgroundIds.forEach(id=>{const el=document.getElementById(id);if(el){lessonInertBefore.set(id,el.inert);el.inert=true;}});
  }
  LESSON_STATE.open=true;document.body.classList.add('lesson-open');document.getElementById('lesson-panel').hidden=false;setLessonTab(tab);document.getElementById('lesson-close').focus();updateMechanismDemoUI();
}
function closeLesson(){
  LESSON_STATE.open=false;LESSON_STATE.running=false;document.body.classList.remove('lesson-open');document.getElementById('lesson-panel').hidden=true;
  lessonInertBefore.forEach((value,id)=>{document.getElementById(id).inert=value;});lessonInertBefore.clear();
  STATE.playing=lessonPreviousPlaying;updateMechanismDemoUI();lessonReturnFocus?.focus();
}
function resetLessonAnimation(){LESSON_STATE.elapsed=0;LESSON_STATE.pressureStep=0;LESSON_STATE.running=false;LESSON_STATE.complete=false;}
function lessonPressureStep(){return LESSON_PRESSURE_STEPS[LESSON_STATE.pressureStep];}
function lessonPressureProgress(){const s=lessonPressureStep();return clamp((LESSON_STATE.elapsed-s.start)/(s.end-s.start),0,1);}
function selectLessonPressureStep(index,play=false){
  if(index<0||index>=LESSON_PRESSURE_STEPS.length)return;
  const previous=index<LESSON_STATE.pressureStep;
  LESSON_STATE.pressureStep=index;
  LESSON_STATE.elapsed=previous?lessonPressureStep().end:lessonPressureStep().start;
  LESSON_STATE.running=play;LESSON_STATE.complete=false;updateLessonView();
}
function startLessonSeasonCycle(){
  resetLessonAnimation();LESSON_STATE.seasonMode='cycle';LESSON_STATE.season='equinox';
  LESSON_STATE.seasonFrom=0;LESSON_STATE.seasonValue=0;LESSON_STATE.running=true;
}
function setLessonSurface(surface,play=false){
  LESSON_STATE.surface=surface;resetLessonAnimation();LESSON_STATE.running=surface==='real'&&play;
  const select=document.getElementById('lesson-surface');if(select)select.value=surface;
  updateLessonView();
}
function setLessonTab(tab){
  if(!LESSON_TOPICS.some(t=>t.id===tab))return;
  LESSON_STATE.tab=tab;resetLessonAnimation();LESSON_STATE.explanation=false;
  if(tab==='season'){LESSON_STATE.seasonMode='target';LESSON_STATE.seasonValue=lessonSeasonTarget();LESSON_STATE.seasonFrom=LESSON_STATE.seasonValue;}
  renderLesson();
}
function initLesson(){
  document.getElementById('lesson-open').onclick=()=>openLesson();
  document.getElementById('lesson-close').onclick=closeLesson;
  document.getElementById('projection-toggle').onclick=()=>{
    const on=document.body.classList.toggle('projection');
    document.getElementById('projection-toggle').setAttribute('aria-pressed',String(on));
    document.getElementById('projection-toggle').textContent=on?'退出投屏':'投屏模式';
    updateSunStyle();frameScene(true);
  };
  document.getElementById('lesson-tabs').innerHTML=LESSON_TOPICS.map(t=>`<button class="btn btn-sm" data-lesson-tab="${t.id}" aria-pressed="false">${t.title}</button>`).join('');
  document.querySelectorAll('[data-lesson-tab]').forEach(b=>b.onclick=()=>setLessonTab(b.dataset.lessonTab));
  ['prev','next'].forEach((name,i)=>document.getElementById('lesson-'+name).onclick=()=>{const index=LESSON_TOPICS.findIndex(t=>t.id===LESSON_STATE.tab)+(i?1:-1);if(index>=0&&index<LESSON_TOPICS.length)setLessonTab(LESSON_TOPICS[index].id);});
  document.getElementById('lesson-panel').addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeLesson();return;}
    if(e.key==='Tab'){
      const buttons=Array.from(document.getElementById('lesson-panel').querySelectorAll('button,select,textarea,summary')).filter(x=>!x.disabled&&x.getClientRects().length);
      const first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  window.__lessonDebug={state:LESSON_STATE,diagnostics:getLessonDiagnostics,topics:LESSON_TOPICS,winds:LESSON_WINDS};
}
function renderLesson(){
  const t=LESSON_TOPICS.find(t=>t.id===LESSON_STATE.tab),index=LESSON_TOPICS.indexOf(t);
  document.getElementById('lesson-panel').dataset.topic=t.id;
  lessonText('lesson-heading',t.title+' · '+t.goal);
  document.querySelectorAll('[data-lesson-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.lessonTab===t.id);b.setAttribute('aria-pressed',String(b.dataset.lessonTab===t.id));});
  lessonText('lesson-location',`主题 ${index+1} / ${LESSON_TOPICS.length} · 可随时返回三维`);
  document.getElementById('lesson-prev').disabled=index===0;document.getElementById('lesson-next').disabled=index===LESSON_TOPICS.length-1;
  const body=document.getElementById('lesson-body');body.scrollTop=0;
  document.getElementById('lesson-playbar').replaceChildren();
  if(t.id==='quiz'){renderLessonQuiz();return;}
  let controls='',note='',intro='';
  if(t.id==='pressure'){
    intro='按步骤讲解：① 气压梯度力推动 → ② 地转偏向力偏转 → ③ 近地面摩擦影响。直接点击“下一步”开始，每步播完自动停下，再点击继续，可回退或重播本步。';
    note='受力图为方向关系示意。高空风可近似沿等压线，近地面摩擦使风斜穿等压线流向低压；图中力箭头不是按真实数值绘制。';
  }else if(t.id==='wind'){
    controls=`<label>选择风带 <select id="lesson-wind">${LESSON_WINDS.map(w=>`<option value="${w.id}" ${w.id===LESSON_STATE.wind?'selected':''}>${w.name}</option>`).join('')}</select></label>`;
    intro='先预测吹向，再播放：高压 → 低压的初始流向 → 两半球偏转 → 风向名称。上北下南、右东左西。';
    note='近地面受摩擦影响，风斜穿等压线吹向低压。弯曲幅度和箭头长度为教学示意；“东北”等风向名称指来向。';
  }else if(t.id==='season'){
    controls=['equinox','summer','winter'].map((s,i)=>`<button class="btn btn-sm ${LESSON_STATE.season===s?'active':''}" data-season="${s}">${['春秋分附近','北半球夏季（6月）','北半球冬季（12月）'][i]}</button>`).join('');
    intro='点击“播放季节循环”，观察春季 → 夏季 → 秋季 → 冬季 → 春季的移动；也可单选季节对照。6月总体偏北，12月总体偏南。';
    note='这是纬向平均的位置关系示意，各带移动幅度不同；图示移动幅度、带宽不是实测值。太阳直射点纬度不能直接当作赤道低压带位置；现实还有海陆差异与季节滞后。';
  }else if(t.id==='monsoon'){
    controls=`<button class="btn btn-sm active" id="lesson-add-surface">加入海陆差异</button><label>地表 <select id="lesson-surface"><option value="ideal" ${LESSON_STATE.surface==='ideal'?'selected':''}>均匀地表：理想带状</option><option value="real" ${LESSON_STATE.surface==='real'?'selected':''}>真实海陆：气压中心</option></select></label><label>季节 <select id="lesson-monsoon-season"><option value="winter" ${LESSON_STATE.monsoonSeason==='winter'?'selected':''}>北半球冬季</option><option value="summer" ${LESSON_STATE.monsoonSeason==='summer'?'selected':''}>北半球夏季</option></select></label><label>区域 <select id="lesson-region"><option value="east" ${LESSON_STATE.region==='east'?'selected':''}>东亚</option><option value="south" ${LESSON_STATE.region==='south'?'selected':''}>南亚</option></select></label>`;
    intro='先观察理想气压带，再点击“加入海陆差异”，直接播放冬夏气压中心与季风；可选择东亚、南亚对照。';
    note='地图为位置关系简图，气压中心大小与气流路径为示意。亚洲冬季高压（蒙古—西伯利亚高压）、夏季低压（印度低压）及海洋气压中心改变北半球连续带状分布；季风不代表全年同一种风。';
  }else if(t.id==='section'){
    controls=`<label>范围 <select id="lesson-section-h"><option value="both" ${LESSON_STATE.sectionH==='both'?'selected':''}>两半球对照</option><option value="north" ${LESSON_STATE.sectionH==='north'?'selected':''}>只看北半球</option><option value="south" ${LESSON_STATE.sectionH==='south'?'selected':''}>只看南半球</option></select></label>`+[0,30,60,90].map(lat=>`<button class="btn btn-sm ${lat===LESSON_STATE.sectionLat?'active':''}" data-section-lat="${lat}">${lat}°${lat===0?'': '附近'}</button>`).join('')+'<button class="btn btn-sm" id="lesson-to-three">对应三维位置</button>';
    intro='横向是纬度，纵向是示意高度。先读垂直运动与近地面气压，再读高空、近地面回流。中纬环流方向与两侧相反。';
    note='0°、30°、60°、90°表示近似位置；高度、带宽与轨迹不按实际比例。环流圈是平均环流的归纳，不能理解成每一气团沿闭合轨道反复绕圈。';
  }else{
    controls=`<label>案例 <select id="lesson-climate"><option value="equator" ${LESSON_STATE.climate==='equator'?'selected':''}>赤道地区多雨</option><option value="subtropical" ${LESSON_STATE.climate==='subtropical'?'selected':''}>副热带高压与少雨</option><option value="med" ${LESSON_STATE.climate==='med'?'selected':''}>地中海沿岸冬雨夏干</option></select></label>`+['summer','winter'].map(s=>`<button class="btn btn-sm ${LESSON_STATE.climateSeason===s?'active':''}" data-climate-season="${s}">${s==='summer'?'北半球夏季':'北半球冬季'}</button>`).join('');
    intro='用“控制带 → 空气运动 → 水汽与降水条件”解释现象，不能只凭纬度判断当地气候。';
    note='案例是机制归纳，非逐日天气预报。地中海案例以北半球大陆西岸为例；南半球季节相反。西风是否带来降水还取决于水汽、海陆位置、地形等条件。';
  }
  const animated=!['section'].includes(t.id);
  body.innerHTML=`<p class="lesson-intro">${intro}</p><div class="lesson-controls">${controls}</div><div class="lesson-stage"><div class="lesson-visual"><canvas id="lesson-canvas" width="1920" height="720" role="img" aria-label="${t.title}教学示意图"></canvas></div><aside><div class="lesson-question"><strong>先预测：</strong>${t.question}</div><button class="btn btn-sm" id="lesson-reveal">显示解释</button><p id="lesson-explanation" class="lesson-explanation" hidden>${t.answer}</p></aside></div><div id="lesson-phase" class="lesson-phase" aria-live="polite"></div><p class="lesson-note">${note}</p><p class="lesson-note">教材对应：旧版人教必修1第二章第二节；新版人教选择性必修1第三章第二节。气候应用可用于衔接下一节，具体依学校教材安排。</p>`;
  if(animated)document.getElementById('lesson-playbar').innerHTML='<button class="btn btn-sm" id="lesson-play">播放过程</button><button class="btn btn-sm" id="lesson-replay">从头重播</button><progress id="lesson-progress" max="1" value="0" aria-label="课堂演示进度"></progress>';
  if(t.id==='pressure'){
    document.getElementById('lesson-playbar').innerHTML='<span id="lesson-step-status" class="lesson-step-status" aria-live="polite"></span><button class="btn btn-sm" id="lesson-step-prev">上一步</button><button class="btn btn-sm" id="lesson-play">播放本步</button><button class="btn btn-sm" id="lesson-step-replay">重播本步</button><button class="btn btn-sm" id="lesson-step-next">下一步</button><button class="btn btn-sm" id="lesson-replay">从头重播</button><progress id="lesson-progress" max="1" value="0" aria-label="当前步骤进度"></progress>';
    document.getElementById('lesson-step-prev').onclick=()=>selectLessonPressureStep(LESSON_STATE.pressureStep-1);
    document.getElementById('lesson-step-next').onclick=()=>{
      if(LESSON_STATE.running)return;
      if(lessonPressureProgress()===1)selectLessonPressureStep(LESSON_STATE.pressureStep+1,true);
      else{LESSON_STATE.running=true;updateLessonView();}
    };
    document.getElementById('lesson-step-replay').onclick=()=>selectLessonPressureStep(LESSON_STATE.pressureStep,true);
  }
  document.getElementById('lesson-reveal').onclick=()=>{LESSON_STATE.explanation=!LESSON_STATE.explanation;document.getElementById('lesson-explanation').hidden=!LESSON_STATE.explanation;document.getElementById('lesson-reveal').textContent=LESSON_STATE.explanation?'收起解释':'显示解释';};
  if(animated){
    document.getElementById('lesson-play').onclick=()=>{
      if(t.id==='season'&&!LESSON_STATE.running&&(LESSON_STATE.elapsed===0||LESSON_STATE.complete))startLessonSeasonCycle();
      else if(t.id==='monsoon'&&LESSON_STATE.surface==='ideal')setLessonSurface('real',true);
      else{if(LESSON_STATE.complete)resetLessonAnimation();LESSON_STATE.running=!LESSON_STATE.running;}
      updateLessonView();
    };
    document.getElementById('lesson-replay').onclick=()=>{
      if(t.id==='season')startLessonSeasonCycle();
      else if(t.id==='monsoon'&&LESSON_STATE.surface==='ideal')setLessonSurface('real',true);
      else{resetLessonAnimation();LESSON_STATE.running=true;}
      updateLessonView();
    };
  }
  const select=(id,key)=>{const el=document.getElementById(id);if(el)el.onchange=()=>{LESSON_STATE[key]=el.value;resetLessonAnimation();updateLessonView();};};
  select('lesson-wind','wind');select('lesson-surface','surface');select('lesson-monsoon-season','monsoonSeason');select('lesson-region','region');select('lesson-section-h','sectionH');select('lesson-climate','climate');
  if(t.id==='monsoon'){
    document.getElementById('lesson-add-surface').onclick=()=>setLessonSurface(LESSON_STATE.surface==='ideal'?'real':'ideal',true);
    document.getElementById('lesson-surface').onchange=e=>setLessonSurface(e.target.value);
  }
  document.querySelectorAll('[data-season]').forEach(b=>b.onclick=()=>{
    const from=LESSON_STATE.seasonValue;LESSON_STATE.season=b.dataset.season;LESSON_STATE.seasonMode='target';resetLessonAnimation();
    const target=lessonSeasonTarget();
    // 重选已到达的夏/冬季，从春秋分参考重演；重选参考位置则等待循环播放。
    LESSON_STATE.seasonFrom=Math.abs(from-target)<1e-8?0:from;
    LESSON_STATE.seasonValue=LESSON_STATE.seasonFrom;
    LESSON_STATE.running=Math.abs(LESSON_STATE.seasonFrom-target)>1e-8;updateLessonView();
  });
  document.querySelectorAll('[data-section-lat]').forEach(b=>b.onclick=()=>{LESSON_STATE.sectionLat=Number(b.dataset.sectionLat);document.querySelectorAll('[data-section-lat]').forEach(x=>x.classList.toggle('active',x===b));updateLessonView();});
  document.querySelectorAll('[data-climate-season]').forEach(b=>b.onclick=()=>{LESSON_STATE.climateSeason=b.dataset.climateSeason;resetLessonAnimation();document.querySelectorAll('[data-climate-season]').forEach(x=>x.classList.toggle('active',x===b));updateLessonView();});
  const toThree=document.getElementById('lesson-to-three');if(toThree)toThree.onclick=()=>{closeLesson();transitionToStep(2);setView('side');};
  updateLessonView();
}
function updateLessonAnimation(dt){
  if(!LESSON_STATE.open||!LESSON_STATE.running)return;
  const limit=LESSON_STATE.tab==='pressure'?lessonPressureStep().end:lessonDuration();
  LESSON_STATE.elapsed=Math.min(limit,LESSON_STATE.elapsed+Math.min(dt,.1)*STATE.speed);
  if(LESSON_STATE.elapsed>=limit){LESSON_STATE.running=false;LESSON_STATE.complete=limit===lessonDuration();}
  if(LESSON_STATE.tab==='season'){
    if(LESSON_STATE.seasonMode==='cycle'){
      const stops=[0,1,0,-1,0],segment=Math.min(3,Math.floor(LESSON_STATE.elapsed/4));
      LESSON_STATE.seasonValue=lerp(stops[segment],stops[segment+1],smoothstep(clamp((LESSON_STATE.elapsed-segment*4)/4,0,1)));
      LESSON_STATE.season=LESSON_STATE.complete?'equinox':['summer','equinox','winter','equinox'][segment];
    }else LESSON_STATE.seasonValue=lerp(LESSON_STATE.seasonFrom,lessonSeasonTarget(),smoothstep(lessonProgress()));
  }
  updateLessonView();
}
function updateLessonView(){
  const canvas=document.getElementById('lesson-canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,960,360);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.font='16px Microsoft YaHei';
  const functions={pressure:drawLessonPressure,wind:drawLessonWind,season:drawLessonSeason,monsoon:drawLessonMonsoon,section:drawLessonSection,climate:drawLessonClimate};
  functions[LESSON_STATE.tab]?.(ctx);
  if(LESSON_STATE.tab==='wind'){
    const w=lessonWind();const question=document.querySelector('#lesson-body .lesson-question');question.replaceChildren();
    const lead=document.createElement('strong');lead.textContent='先预测：';question.append(lead,document.createTextNode(`${w.h===1?'北':'南'}半球气流从${w.source}吹向${w.target}，吹向哪里、怎样命名？`));
    lessonText('lesson-explanation',`${w.source}向${w.target}流动，初始${w.north>0?'向北':'向南'}；${w.h===1?'北半球右偏':'南半球左偏'}，获得${w.east>0?'东':'西'}向分量。吹向${w.toward}，来自${w.coming}，形成${w.name}。风向名称以“来向”判断。`);
  }
  const play=document.getElementById('lesson-play');if(play)play.textContent=LESSON_STATE.running?'暂停过程':LESSON_STATE.elapsed>0&&!LESSON_STATE.complete?'继续过程':LESSON_STATE.tab==='season'?'播放季节循环':LESSON_STATE.complete?'再次播放':'播放过程';
  if(LESSON_STATE.tab==='pressure'){
    const p=lessonPressureProgress(),index=LESSON_STATE.pressureStep;
    lessonText('lesson-step-status',`步骤 ${index+1} / ${LESSON_PRESSURE_STEPS.length} · ${lessonPressureStep().title}`);
    play.disabled=p===1;play.textContent=LESSON_STATE.running?'暂停本步':p===1?'本步已完成':p>0?'继续本步':'播放本步';
    document.getElementById('lesson-step-prev').disabled=index===0;
    const next=document.getElementById('lesson-step-next');
    next.disabled=LESSON_STATE.running||(p===1&&index===LESSON_PRESSURE_STEPS.length-1);
    next.title=p===1?'进入下一步':p>0?'继续当前步骤':'开始当前步骤';
  }
  if(LESSON_STATE.tab==='monsoon'){
    const real=LESSON_STATE.surface==='real';
    lessonText('lesson-add-surface',real?'返回理想模型':'加入海陆差异');
    document.getElementById('lesson-add-surface').setAttribute('aria-pressed',String(real));
    if(play&&!real)play.textContent='加入海陆差异并播放';
    const progress=document.getElementById('lesson-progress');if(progress)progress.hidden=!real;
  }
  if(LESSON_STATE.tab==='season')document.querySelectorAll('[data-season]').forEach(b=>{const active=b.dataset.season===LESSON_STATE.season;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  const progress=document.getElementById('lesson-progress');if(progress)progress.value=LESSON_STATE.tab==='pressure'?lessonPressureProgress():lessonProgress();
  canvas.setAttribute('aria-label',LESSON_TOPICS.find(t=>t.id===LESSON_STATE.tab).title+'：'+document.getElementById('lesson-phase').textContent);
}
function lessonLabel(ctx,text,x,y,color='#d7e7f7',size=16,align='center'){
  if(LESSON_STATE.open)size=Math.max(size,18);
  ctx.font=`${size}px Microsoft YaHei`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(text,x,y);
}
function lessonArrow(ctx,x,y,tx,ty,color='#ffaa55',width=3){
  if(Math.hypot(tx-x,ty-y)<1)return;
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();
  const angle=Math.atan2(ty-y,tx-x),head=10;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx-head*Math.cos(angle-.45),ty-head*Math.sin(angle-.45));ctx.lineTo(tx-head*Math.cos(angle+.45),ty-head*Math.sin(angle+.45));ctx.closePath();ctx.fill();
}
function lessonDot(ctx,x,y,color='#ffaa55'){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}
function lessonPolyline(ctx,points,p,color='#ffaa55',width=3){
  if(p<=0)return;const scaled=clamp(p,0,1)*(points.length-1),last=Math.floor(scaled),partial=scaled-last;
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<=last;i++)ctx.lineTo(...points[i]);
  let end=points[last];if(last<points.length-1){end=[lerp(points[last][0],points[last+1][0],partial),lerp(points[last][1],points[last+1][1],partial)];ctx.lineTo(...end);}ctx.stroke();lessonDot(ctx,...end,color);
  const previous=points[Math.max(0,last-1)];const dx=end[0]-previous[0],dy=end[1]-previous[1],length=Math.hypot(dx,dy);if(length>1)lessonArrow(ctx,end[0]-dx/length*16,end[1]-dy/length*16,...end,color,width);
}
function drawLessonPressure(ctx){
  const p=lessonPressureProgress(),phase=LESSON_STATE.pressureStep===0&&p===0?0:LESSON_STATE.pressureStep+1;
  for(let i=0;i<5;i++){
    const y=65+i*55;ctx.strokeStyle='#385779';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(90,y);ctx.lineTo(555,y);ctx.stroke();lessonLabel(ctx,String(1000+i*4)+' hPa',64,y+5,'#a9bdd3',14);
  }
  lessonLabel(ctx,'低压侧',320,38,'#ff9292');lessonLabel(ctx,'高压侧',320,330,'#83bbff');
  lessonLabel(ctx,'北半球 · 俯视受力示意',725,40,'#d7e7f7',18);
  const origin=[320,265];
  lessonArrow(ctx,...origin,320,120,'#b6c5d4',2);lessonLabel(ctx,'水平气压梯度力',220,105,'#b6c5d4',15);
  if(phase===1){lessonArrow(ctx,...origin,320,265-120*p);}
  if(phase>=2){const turn=phase===2?smoothstep(p):1;lessonArrow(ctx,...origin,lerp(320,440,turn),lerp(145,200,turn),'#ffaa55');lessonLabel(ctx,phase===2?'风向逐渐偏转':'近地面风：斜穿等压线',433,183,'#ffaa55',15);lessonArrow(ctx,...origin,320+45*turn,265+65*turn,'#66eeff');}
  if(phase===3){lessonArrow(ctx,...origin,320-65*p,265+35*p,'#e39adf');lessonLabel(ctx,'摩擦力：与风向相反',230,321,'#e39adf',14);}
  const forceY=110;
  lessonArrow(ctx,665,forceY,665,forceY-40,'#b6c5d4');lessonLabel(ctx,'推动：由高压指向低压',778,forceY,'#b6c5d4',16);
  if(phase>=2){lessonArrow(ctx,645,172,685,172,'#66eeff');lessonLabel(ctx,'偏转：北右、南左',788,178,'#66eeff',16);}
  if(phase===3){lessonArrow(ctx,685,232,645,232,'#e39adf');lessonLabel(ctx,'摩擦：减速并影响风向',798,238,'#e39adf',16);lessonArrow(ctx,635,292,875,292,'#ffaa55');lessonLabel(ctx,'高空风可近似平行等压线',754,324,'#ffaa55',15);}
  const status=phase===0?' · 点击“下一步”或“播放本步”开始':LESSON_STATE.running?' · 演示中':p===1?(phase===3?' · 全部完成，可回退或重播':' · 本步完成，点击“下一步”继续'):' · 已暂停，点击“下一步”或“继续本步”继续';
  lessonText('lesson-phase',['等待预测：气压差推动，地转偏向力改变方向','① 气压梯度力推动空气由高压向低压开始运动','② 加入地转偏向力，方向发生偏转','③ 近地面摩擦作用下，风斜穿等压线流向低压'][phase]+status);
}
function drawLessonWind(ctx){
  const w=lessonWind(),p=lessonProgress(),phase=p===0?0:p<.3?1:p<.75?2:3;
  const start={x:390,y:w.north>0?285:80},end={x:390+w.east*160,y:w.north>0?90:275};
  lessonLabel(ctx,'北 N',390,30);lessonLabel(ctx,'南 S',390,343);lessonLabel(ctx,'西 W',90,182);lessonLabel(ctx,'东 E',590,182);
  lessonLabel(ctx,`${Math.abs(w.from)}°${w.from<0?'S':'N'}附近 · ${w.source}`,710,80,'#83bbff',17);
  lessonLabel(ctx,`${Math.abs(w.to)}°${w.to<0?'S':w.to>0?'N':''}附近 · ${w.target}`,710,130,'#ff9292',17);
  ctx.strokeStyle='#bcc9db';ctx.lineWidth=1.5;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(start.x,end.y);ctx.stroke();ctx.setLineDash([]);
  const points=[];for(let i=0;i<=60;i++){const t=i/60;points.push([start.x+w.east*160*t*t,lerp(start.y,end.y,t)]);}
  lessonDot(ctx,start.x,start.y);
  if(phase===1)lessonArrow(ctx,start.x,start.y,start.x,lerp(start.y,end.y,clamp(p/.3,0,1)),'#ffaa55');
  if(phase>=2){const t=clamp((p-.3)/.45,0,1);lessonPolyline(ctx,points,t);const pos=points[Math.round(t*60)],dx=w.east*320*Math.max(t,.1),dy=end.y-start.y,len=Math.hypot(dx,dy);lessonArrow(ctx,...pos,pos[0]+dx/len*40,pos[1]+dy/len*40,'#ffaa55');lessonArrow(ctx,...pos,pos[0]-dy/len*38*w.h,pos[1]+dx/len*38*w.h,'#66eeff');}
  lessonLabel(ctx,w.h===1?'北半球：向前进方向右偏':'南半球：向前进方向左偏',710,195,'#66eeff',17);
  if(phase===3){lessonLabel(ctx,`吹向${w.toward}，来自${w.coming}`,710,255,'#ffe2a0',19);lessonLabel(ctx,w.name,710,300,'#ffaa55',22);}
  lessonText('lesson-phase',phase===0?'等待预测：从哪一气压带吹向哪一气压带？':phase===1?`① ${w.source} → ${w.target}，初始${w.north>0?'向北':'向南'}`:phase===2?`② ${w.h===1?'北半球右偏':'南半球左偏'}，获得${w.east>0?'东':'西'}向分量`:`③ 吹向${w.toward}，按来向命名：${w.name}`);
}
function lessonBeltPositions(){
  const s=LESSON_STATE.seasonValue;
  return [90,60,30,0,-30,-60,-90].map(lat=>({base:lat,lat:lat+s*(lat===0?8:Math.abs(lat)===30?6:Math.abs(lat)===60?4:0)}));
}
function drawLessonSeason(ctx){
  const positions=lessonBeltPositions(),y=lat=>180-lat*1.55,colors=['#889cda','#74c0ee','#ffd35c','#ff7979','#ffd35c','#74c0ee','#889cda'];
  const names=['极地高压','副极地低压','副热带高压','赤道低压','副热带高压','副极地低压','极地高压'];
  [90,60,30,0,-30,-60,-90].forEach(lat=>{ctx.strokeStyle='#344b65';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(75,y(lat));ctx.lineTo(745,y(lat));ctx.stroke();lessonLabel(ctx,lat===0?'0°':Math.abs(lat)+'°'+(lat>0?'N':'S'),42,y(lat)+5,'#b6c5d4',14);});
  positions.forEach((b,i)=>{ctx.globalAlpha=.22;ctx.fillStyle=colors[i];ctx.fillRect(80,y(b.lat)-5,490,10);ctx.globalAlpha=1;lessonLabel(ctx,names[i],250,y(b.lat)+5,colors[i],15);});
  for(let i=0;i<6;i++){
    const mid=(positions[i].lat+positions[i+1].lat)/2,h=mid>=0?1:-1,east=i===1||i===4?1:-1,north=(i===0||i===2||i===4)?-1:1;
    lessonArrow(ctx,465,y(mid)+north*8,465+east*25,y(mid)-north*8,'#ffaa55',2);lessonLabel(ctx,i===0||i===5?'极地东风':i===1||i===4?'盛行西风':h===1?'东北信风':'东南信风',650,y(mid)+5,'#ffaa55',14);
  }
  const solar=23.44*LESSON_STATE.seasonValue;
  lessonArrow(ctx,810,y(solar),748,y(solar),'#ffe2a0');lessonDot(ctx,825,y(solar),'#ffe2a0');lessonLabel(ctx,'太阳直射点',850,30,'#ffe2a0',15);
  lessonLabel(ctx,solar===0?'赤道':Math.abs(solar).toFixed(1)+'°'+(solar>0?'N':'S'),849,52,'#ffe2a0',15);
  lessonLabel(ctx,'灰线：春秋分参考纬度',250,350,'#a9bdd3',13);
  if(LESSON_STATE.seasonMode==='cycle'){
    const segment=Math.min(3,Math.floor(LESSON_STATE.elapsed/4));
    const phases=['① 春季 → 北半球夏季：直射点北移，各带总体偏北','② 北半球夏季 → 秋季：回到春秋分参考附近','③ 秋季 → 北半球冬季：直射点南移，各带总体偏南','④ 北半球冬季 → 春季：回到春秋分参考附近'];
    lessonText('lesson-phase',LESSON_STATE.complete?'完成一轮季节循环：春 → 夏 → 秋 → 冬 → 春；停留本主题':phases[segment]+(!LESSON_STATE.running?'（已暂停）':''));
  }else lessonText('lesson-phase',LESSON_STATE.season==='equinox'?'春秋分附近：直射点在赤道附近，点击“播放季节循环”观察全年移动':LESSON_STATE.season==='summer'?'6月：总体偏北；北半球向高纬、南半球向低纬':'12月：总体偏南；北半球向低纬、南半球向高纬');
}
function drawLessonMonsoon(ctx){
  const p=lessonProgress(),real=LESSON_STATE.surface==='real',summer=LESSON_STATE.monsoonSeason==='summer',south=LESSON_STATE.region==='south';
  ctx.fillStyle='#112b42';ctx.fillRect(70,30,600,280);
  for(const [lat,yy] of [[60,60],[30,170],[0,280]]){ctx.strokeStyle='#4c647e';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(70,yy);ctx.lineTo(670,yy);ctx.stroke();ctx.setLineDash([]);lessonLabel(ctx,lat===0?'赤道':lat+'°N',41,yy+5,'#a9bdd3',14);}
  if(real){ctx.fillStyle='#3f5b49';ctx.beginPath();[[85,55],[350,45],[435,105],[350,160],[322,205],[267,257],[239,190],[120,185]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();lessonLabel(ctx,'亚欧大陆',220,92,'#d7e7f7',17);lessonLabel(ctx,'太平洋',535,120,'#93c9f0',17);lessonLabel(ctx,'印度洋',350,303,'#93c9f0',15);}
  else{for(const [yy,color,text] of [[60,'#74c0ee','副极地低压带'],[170,'#ffd35c','副热带高压带'],[280,'#ff7979','赤道低压带']]){ctx.globalAlpha=.3;ctx.fillStyle=color;ctx.fillRect(70,yy-12,600,24);ctx.globalAlpha=1;lessonLabel(ctx,text,365,yy+6,color,17);}}
  const phase=p===0?0:p<.35?1:2;
  if(real){
    if(summer){lessonDot(ctx,270,170,'#ff7979');lessonLabel(ctx,'亚洲夏季低压',235,149,'#ff9292',16);lessonDot(ctx,535,170,'#ffd35c');lessonLabel(ctx,'太平洋副热带高压',550,200,'#ffe2a0',15);lessonDot(ctx,500,65,'#ff7979');lessonLabel(ctx,'海洋低压',550,55,'#ff9292',14);}
    else{lessonDot(ctx,265,90,'#ffd35c');lessonLabel(ctx,'亚洲冬季高压',235,124,'#ffe2a0',16);lessonDot(ctx,535,65,'#ff7979');lessonLabel(ctx,'阿留申低压',552,48,'#ff9292',14);lessonDot(ctx,535,205,'#ffd35c');lessonLabel(ctx,'海洋副热带高压',535,234,'#ffe2a0',14);}
    if(p>0){
      if(!south){const pts=summer?[[510,250],[435,217],[370,160]]:[[280,95],[352,150],[440,215]];lessonPolyline(ctx,pts,clamp(p/.8,0,1),summer?'#ffaa55':'#88caff');}
      else if(!summer){lessonPolyline(ctx,[[270,160],[239,215],[180,268]],clamp(p/.8,0,1),'#88caff');}
      else{lessonPolyline(ctx,[[415,333],[345,305],[310,280]],clamp(p/.4,0,1),'#88caff');if(p>.4)lessonPolyline(ctx,[[310,280],[280,240],[305,195]],clamp((p-.4)/.4,0,1),'#ffaa55');lessonLabel(ctx,'跨赤道后北半球右偏',467,263,'#ffaa55',14);}
    }
  }
  lessonLabel(ctx,real?(south?'南亚季风':'东亚季风'):'均匀地表模型',800,60,'#d7e7f7',19);
  if(real){lessonLabel(ctx,summer?'北半球夏季':'北半球冬季',800,105,'#ffe2a0',17);lessonLabel(ctx,summer?'陆地升温较快':'陆地降温较快',800,155,'#d7e7f7',16);lessonLabel(ctx,summer?'大陆热低压':'大陆冷高压',800,190,summer?'#ff9292':'#83bbff',17);
    if(phase>=1){lessonLabel(ctx,south?(summer?'东南信风跨赤道':'东北季风'):(summer?'海洋 → 大陆':'大陆 → 海洋'),800,245,'#ffaa55',18);}
    if(phase===2){lessonLabel(ctx,south?(summer?'转为西南季风':'陆地吹向海洋'):(summer?'偏南风，通常较湿润':'偏北风，通常较干冷'),800,292,'#ffaa55',16);}
  }else{lessonLabel(ctx,'连续带状分布',800,140,'#a9bdd3',17);lessonLabel(ctx,'请点击“加入海陆差异”',800,190,'#ffe2a0',16);}
  lessonText('lesson-phase',!real?'理想模型：点击“加入海陆差异”，观察真实海陆的气压中心与季风':p===0?'先预测：比较大陆、海洋气压，判断季风初始流向':south&&summer?'南亚夏季：北移与海陆差异共同作用；东南信风跨赤道后右偏为西南气流':summer?'夏季：大陆热低压与海洋气压中心，气流由海洋吹向大陆':'冬季：大陆冷高压与海洋气压中心，气流由大陆吹向海洋');
}
function drawLessonSection(ctx){
  const x=lat=>480+lat*4.5,ground=260,upper=85,focus=LESSON_STATE.sectionLat;
  ctx.fillStyle='#233648';ctx.fillRect(55,ground+4,850,45);lessonLabel(ctx,'近地面',920,ground+5,'#b6c5d4',15);lessonLabel(ctx,'高空',920,upper+5,'#b6c5d4',15);
  const showH=h=>LESSON_STATE.sectionH==='both'||(LESSON_STATE.sectionH==='north'?h===1:h===-1);
  for(const h of [-1,1]){if(!showH(h))continue;
    for(const [rise,sink,color,name] of [[0,30,'#ffaa55','低纬环流'],[60,30,'#ffd35c','中纬环流'],[60,90,'#88caff','高纬环流']]){
      const a=x(rise*h),b=x(sink*h),mid=(a+b)/2;
      const d=Math.sign(b-a),corner=14;
      ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a,ground-corner);ctx.lineTo(a,upper+corner);ctx.quadraticCurveTo(a,upper,a+d*corner,upper);ctx.lineTo(b-d*corner,upper);ctx.quadraticCurveTo(b,upper,b,upper+corner);ctx.lineTo(b,ground-corner);ctx.quadraticCurveTo(b,ground,b-d*corner,ground);ctx.lineTo(a+d*corner,ground);ctx.quadraticCurveTo(a,ground,a,ground-corner);ctx.stroke();
      lessonArrow(ctx,a,210,a,140,color,2);lessonArrow(ctx,b,135,b,215,color,2);lessonArrow(ctx,lerp(a,b,.3),upper,lerp(a,b,.65),upper,color,2);lessonArrow(ctx,lerp(b,a,.3),ground,lerp(b,a,.65),ground,color,2);
      lessonLabel(ctx,name,mid,52,color,15);
    }
  }
  for(const lat of [-90,-60,-30,0,30,60,90]){
    if(lat!==0&&!showH(Math.sign(lat)))continue;
    const low=Math.abs(lat)===0||Math.abs(lat)===60,color=low?'#ff9292':'#83bbff';
    if(Math.abs(lat)===focus){ctx.globalAlpha=.18;ctx.fillStyle='#ffe2a0';ctx.fillRect(x(lat)-15,65,30,235);ctx.globalAlpha=1;}
    lessonLabel(ctx,(lat===0?'0°':Math.abs(lat)+'°'+(lat>0?'N':'S')),x(lat),330,'#d7e7f7',15);lessonLabel(ctx,low?'低压':'高压',x(lat),286,color,15);
  }
  const messages={0:'赤道：受热上升 → 热力性低压；高空向两侧回流',30:'30°附近：高空积聚与下沉 → 动力性高压；近地面向两侧分流',60:'60°附近：冷暖气流辐合抬升 → 动力性低压',90:'极地：冷却下沉 → 热力性高压；近地面流向较低纬度'};
  lessonText('lesson-phase',messages[focus]);
}
function drawLessonClimate(ctx){
  const med=LESSON_STATE.climate==='med',winter=LESSON_STATE.climateSeason==='winter',rising=LESSON_STATE.climate==='equator',wet=rising||med&&winter,p=lessonProgress();
  const belt=rising?'赤道低气压带':med&&winter?'盛行西风带':'副热带高气压带';
  lessonLabel(ctx,med?'地中海沿岸 · 北半球大陆西岸':rising?'赤道地区':'副热带高压控制的情境',470,36,'#d7e7f7',21);
  ['控制带','空气运动','降水条件'].forEach((s,i)=>{ctx.fillStyle='#1d3047';ctx.fillRect(60+i*310,90,270,170);lessonLabel(ctx,s,195+i*310,125,'#8ecbff',16);});
  lessonLabel(ctx,belt,195,180,'#ffe2a0',19);
  if(p>.25){lessonArrow(ctx,340,174,365,174,'#a9bdd3');lessonLabel(ctx,med&&winter?'海洋西风输送水汽':rising?'上升、膨胀冷却':'下沉、压缩增温',505,180,'#ffaa55',18);if(!med||!winter)lessonArrow(ctx,505,rising?236:202,505,rising?204:234,'#ffaa55');}
  if(p>.6){lessonArrow(ctx,650,174,675,174,'#a9bdd3');lessonLabel(ctx,wet?'水汽充足时，利于降水':'通常不利于凝结降水',815,180,wet?'#88caff':'#ffe2a0',17);lessonLabel(ctx,med?(winter?'冬季较湿润':'夏季较干燥'):wet?'常见对流雨':'通常少雨',815,220,wet?'#88caff':'#ffe2a0',18);}
  lessonLabel(ctx,'还要结合：水汽来源、海陆位置、地形与季节',480,312,'#a9bdd3',17);
  lessonText('lesson-phase',p===0?'先预测，再播放解释链：控制带 → 空气运动 → 降水条件':med?(winter?'冬季：西风带南移，海洋西风可输送水汽，常较湿润':'夏季：副热带高压北移控制，空气下沉，通常较干燥'):rising?'赤道上升气流在水汽充足时易形成对流降水':'副热带下沉通常少雨；不能据此断定30°附近每个地区都是沙漠');
}
function renderLessonQuiz(){
  const body=document.getElementById('lesson-body');
  body.innerHTML='<p class="lesson-intro">先独立作答，再检查。方向题选择吹向箭头；成因题说明依据。答案在主题切换和关闭后保留。</p><div class="lesson-controls"><button class="btn" id="lesson-quiz-check">检查理解</button><button class="btn btn-sm" id="lesson-quiz-reset">重置作答</button><span id="lesson-quiz-stats" class="lesson-stats" aria-live="polite"></span></div><div class="lesson-grid">'+LESSON_QUIZ.map((q,i)=>`<article class="lesson-question"><strong>${i+1}. ${q.q}</strong><div class="lesson-options">${q.options.map((o,j)=>`<button class="btn btn-sm ${LESSON_STATE.answers[q.id]===j?'active':''}" data-quiz-id="${q.id}" data-option="${j}" aria-pressed="${LESSON_STATE.answers[q.id]===j}">${o}</button>`).join('')}</div><div class="lesson-feedback" id="feedback-${q.id}"></div></article>`).join('')+'</div><div class="lesson-rubric" style="margin-top:16px">迁移任务：北半球某大陆西岸地区夏季干燥、冬季较湿润。请用气压带、风带的季节移动及空气运动解释。<textarea id="lesson-essay" aria-label="迁移任务作答" placeholder="写出：夏季控制带与空气运动；冬季控制带、水汽与降水条件。"></textarea><details><summary>查看评分依据，供师生讨论</summary>① 夏季副热带高压北移控制；② 下沉增温，通常少雨；③ 冬季西风带南移控制；④ 海洋西风可输送水汽形成降水。每点1分，共4分；需结合海陆位置。此题由师生依据实际作答评议，不自动给分。</details></div>';
  document.querySelectorAll('[data-quiz-id]').forEach(b=>b.onclick=()=>{
    LESSON_STATE.answers[b.dataset.quizId]=Number(b.dataset.option);
    document.querySelectorAll(`[data-quiz-id="${b.dataset.quizId}"]`).forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});updateLessonQuizFeedback();
  });
  document.getElementById('lesson-quiz-check').onclick=()=>{LESSON_STATE.graded=true;updateLessonQuizFeedback();};
  document.getElementById('lesson-quiz-reset').onclick=()=>{LESSON_STATE.answers={};LESSON_STATE.graded=false;LESSON_STATE.essay='';renderLessonQuiz();};
  document.getElementById('lesson-essay').value=LESSON_STATE.essay;document.getElementById('lesson-essay').oninput=e=>{LESSON_STATE.essay=e.target.value;};updateLessonQuizFeedback();
}
function lessonQuizScore(){
  const result={correct:0,wrong:0,blank:0,total:LESSON_QUIZ.length};
  LESSON_QUIZ.forEach(q=>{const a=LESSON_STATE.answers[q.id];if(a===undefined)result.blank++;else if(a===q.correct)result.correct++;else result.wrong++;});return result;
}
function updateLessonQuizFeedback(){
  const s=lessonQuizScore();lessonText('lesson-quiz-stats',LESSON_STATE.graded?`正确 ${s.correct} / ${s.total} · 错误 ${s.wrong} · 未完成 ${s.blank}`:`已答 ${s.total-s.blank} / ${s.total}，完成后检查`);
  LESSON_QUIZ.forEach(q=>{
    const el=document.getElementById('feedback-'+q.id);if(!el)return;el.className='lesson-feedback';el.replaceChildren();
    if(!LESSON_STATE.graded)return;const a=LESSON_STATE.answers[q.id];
    if(a===undefined){el.textContent='尚未作答，请先判断。';return;}
    el.classList.add(a===q.correct?'correct':'incorrect');el.append(document.createTextNode((a===q.correct?'✓ 正确。':'✗ 请订正。')+q.reason+' '));
    const review=document.createElement('button');review.className='lesson-link';review.textContent='回看相关演示';review.onclick=()=>{if(q.review==='polar'){closeLesson();transitionToStep(1);setMechanismStage(2);}else{if(q.wind)LESSON_STATE.wind=q.wind;setLessonTab(q.review);}};el.append(review);
  });
}
function getLessonDiagnostics(){return {
  ...LESSON_STATE,answers:{...LESSON_STATE.answers},progress:lessonProgress(),pressureStepProgress:lessonPressureProgress(),wind:{...lessonWind()},
  belts:lessonBeltPositions(),solarLatitude:23.44*LESSON_STATE.seasonValue,quiz:lessonQuizScore(),
  phase:document.getElementById('lesson-phase')?.textContent||'',projection:document.body.classList.contains('projection')
};}

/* 60°环节：保留已有低纬环流作为上下文，高纬完整圈在最后归纳时出现。 */
function updatePolarDemo(){
  const elapsed=STATE.mechanismDemo.elapsed,group=mechanismGroups[2];if(!group)return;
  const progress={sink:1,trade:1,westerly:clamp(elapsed/3,0,1),'polar-easterly':clamp(elapsed/3,0,1),rise:clamp((elapsed-3)/4,0,1)};
  group.children.forEach(mesh=>{
    const kind=mesh.userData.kind;if(!kind)return;const p=progress[kind];
    mesh.visible=STATE.showPaths&&p>0;mesh.geometry.setDrawRange(0,Math.floor(p*40)*mesh.geometry.index.count/40);
    mesh.userData.arrows.forEach(({arrow,t})=>{arrow.visible=STATE.showPaths&&p>=t;});
    const tracer=mesh.userData.tracer;tracer.visible=STATE.showParticles&&p>0;const positions=tracer.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){const point=mesh.geometry.parameters.path.getPoint(((elapsed*.35+i/positions.count)%1)*p);positions.setXYZ(i,point.x,point.y,point.z);}positions.needsUpdate=true;
  });
  const closure=smoothstep(clamp((elapsed-7)/3,0,1));threeCellGroups.polar.visible=closure>0;['NH','SH'].forEach(h=>cellObjects['polar'+h].setOpacity(closure));
  pressureBeltMeshes.forEach((mesh,i)=>{mesh.visible=i===1||i===2||elapsed>=7&&(i===3||i===4);});
  const canvas=document.getElementById('polar-front');canvas.hidden=!STATE.showPaths;if(!canvas.hidden){
    const ctx=canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,292,210);
    lessonLabel(ctx,'60°附近 · 冷暖辐合局部剖面',146,21,'#d7e7f7',12);
    ctx.fillStyle='#244660';ctx.beginPath();ctx.moveTo(130,160);ctx.lineTo(252,91);ctx.lineTo(277,160);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#4d6076';ctx.beginPath();ctx.moveTo(15,164);ctx.lineTo(277,164);ctx.stroke();
    lessonLabel(ctx,'较暖空气',64,75,'#ffaa55',12);lessonLabel(ctx,'较冷空气',222,143,'#88caff',12);
    if(elapsed>0){lessonPolyline(ctx,[[20,157],[70,157],[130,157]],clamp(elapsed/3,0,1),'#ffaa55');lessonPolyline(ctx,[[275,157],[240,150],[205,145]],clamp(elapsed/3,0,1),'#88caff');}
    if(elapsed>3)lessonPolyline(ctx,[[130,153],[168,129],[211,99],[244,72]],clamp((elapsed-3)/4,0,1),'#ffaa55');
    lessonLabel(ctx,elapsed<3?'先辐合，再抬升':elapsed<7?'暖空气沿冷空气上方抬升':'动力性低压，不是当地受热上升',146,185,'#ffe2a0',11);
    lessonLabel(ctx,'低纬侧 → 高纬侧 · 高度与时间为示意',146,202,'#a9bdd3',10);
  }
  updateMechanismDemoUI();
}
