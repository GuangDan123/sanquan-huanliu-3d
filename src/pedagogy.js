/* Teaching review revisions: prediction, view translation and independent evidence. */
function emptyLearningRecord(){return {answers:{},rubrics:{},notes:'',section:[],wind:[]};}
const PEDAGOGY={focusLat:null,predictions:{},windHemisphere:'north',windReverse:false,windVariants:{},evidence:{phase:'pre',records:{pre:emptyLearningRecord(),post:emptyLearningRecord(),delayed:emptyLearningRecord()},classroom:{}}};
function saveLearningEvidence(){try{localStorage.setItem('geography-learning-evidence-v1',JSON.stringify({predictions:PEDAGOGY.predictions,evidence:PEDAGOGY.evidence}));}catch{}}
function initPedagogy(){
 try{const saved=JSON.parse(localStorage.getItem('geography-learning-evidence-v1'));if(saved?.evidence?.records?.pre&&saved.evidence.records.post&&saved.evidence.records.delayed){PEDAGOGY.evidence=saved.evidence;PEDAGOGY.predictions=saved.predictions||{};}}catch{}
 window.__pedagogyDebug={state:PEDAGOGY,normals:CLIMATE_NORMALS,singleRevealed:singleNodeRevealed,restoreSingle:restoreSingleGeometry,planForces:landSeaPlanForces,drawPlan:drawLandSeaPlan,record:()=>PEDAGOGY.evidence.records[PEDAGOGY.evidence.phase]};
}
function singleNodeRevealed(){
 const d=STATE.singleDemo;if(!d)return false;
 const s=demoNodeStages('single')[d.node||0];
 return !!d.answerShown||d.running||d.complete||d.elapsed>s.start;
}
function syncSinglePredictionControls(){
 const field=document.getElementById('single-prediction'),button=document.getElementById('single-show-answer');if(!field)return;
 const node=STATE.singleDemo.node||0;
 if(field.dataset.node!==String(node)){field.dataset.node=String(node);field.value=PEDAGOGY.predictions[node]||'';}
 button.textContent=singleNodeRevealed()?'本节点结论已揭示':'显示本节点结论';button.disabled=singleNodeRevealed();
}
function mountPedagogyStep(step,body){
 document.body.classList.toggle('single-prediction-stage',step===0);
 if(step===0)body.querySelector('.prediction-record')?.remove();
 // Keep conditions visible; they are needed to interpret the model, not an optional answer.
 const assumptions=body.querySelector('.model-assumptions');if(assumptions)body.prepend(assumptions);
 for(const prefix of ['classroom','classroom-lesson']){
  const prev=document.getElementById(prefix+'-prev'),next=document.getElementById(prefix+'-next');
  if(prev)prev.textContent='上一课堂环节';if(next)next.textContent='下一课堂环节';
 }
 const previous=document.getElementById('mechanism-prev'),next=document.getElementById('mechanism-next');
 if(previous)previous.textContent='第一步';if(next)next.textContent='第三步';
 const tag=document.getElementById('sp-tag');if(step===1)tag.textContent='STEP 2 / 5';
}
function restoreSingleGeometry(){
 for(const key of ['singleNH','singleSH']){const c=cellObjects[key];if(!c)continue;
  for(const a of [...c.tubes,...c.innerGlows])a.mesh.geometry.setDrawRange(0,Infinity);
  if(c.particles){c.particles.geometry.setIndex(null);c.particles.geometry.setDrawRange(0,c.activeParticleCount);}
 }
}
function applySinglePredictionVisual(dt=0){renderSingleCirculation(dt);}

function openSectionAt(lat){PEDAGOGY.focusLat=lat;LESSON_STATE.sectionLat=Math.abs(lat);LESSON_STATE.sectionH=lat<0?'south':'north';TEACHING.sectionMode='full';openLesson('section');}
function syncBridgeHighlight(){
 for(const {obj,data} of latLabels)obj.element?.classList.toggle('bridge-lat',STATE.step===2&&PEDAGOGY.focusLat!==null&&data.lat===PEDAGOGY.focusLat);
}
function mountViewBridge(body){
 const box=document.createElement('details');box.className='view-bridge';box.id='view-bridge';box.open=PEDAGOGY.focusLat!==null;
 box.innerHTML='<summary>视图衔接：沿经线取剖面，保留纬度与高度</summary><p>左图橙线是取剖面的位置；右图把同一纬度放在横轴上。向上表示高度；东西风向需另看水平图。环流圈是平均运动的归纳，气团不会沿固定管道反复绕圈。</p><canvas id="view-bridge-canvas" width="960" height="280" role="img" aria-label="球面纬度对应经圈剖面的纬度和高度"></canvas><label>联动纬度 <select id="bridge-latitude">'+[-90,-60,-30,0,30,60,90].map(lat=>`<option value="${lat}">${lat===0?'赤道':Math.abs(lat)+'°'+(lat>0?'N':'S')}</option>`).join('')+'</select></label><span id="bridge-location"></span>';
 body.prepend(box);const select=box.querySelector('select');select.value=PEDAGOGY.focusLat??0;
 select.onchange=()=>{PEDAGOGY.focusLat=Number(select.value);LESSON_STATE.sectionLat=Math.abs(PEDAGOGY.focusLat);LESSON_STATE.sectionH=PEDAGOGY.focusLat<0?'south':PEDAGOGY.focusLat>0?'north':'both';document.getElementById('lesson-section-h').value=LESSON_STATE.sectionH;drawViewBridge();updateLessonView();};
 drawViewBridge();
}
function drawViewBridge(){
 const canvas=document.getElementById('view-bridge-canvas');if(!canvas)return;
 const ctx=canvas.getContext('2d'),lat=PEDAGOGY.focusLat??0,a=lat*Math.PI/180,x=660+lat*2.4;
 ctx.clearRect(0,0,960,280);ctx.fillStyle='#0d1b2a';ctx.fillRect(0,0,960,280);
 ctx.strokeStyle='#7ca5c2';ctx.lineWidth=2;ctx.beginPath();ctx.arc(150,140,90,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#ffbc73';ctx.beginPath();ctx.ellipse(150,140,48,90,0,0,Math.PI*2);ctx.stroke();
 ctx.setLineDash([5,5]);ctx.strokeStyle='#7ca5c2';ctx.beginPath();ctx.moveTo(50,140);ctx.lineTo(250,140);ctx.stroke();ctx.setLineDash([]);
 formationText(ctx,'北',150,24,'#dcecf7',20,'center');formationText(ctx,'南',150,256,'#dcecf7',20,'center');formationText(ctx,'沿经线取剖面 →',310,140,'#ffbc73',22,'center');
 ctx.fillStyle='#ffe2a0';ctx.beginPath();ctx.arc(150+48*Math.cos(a),140-90*Math.sin(a),7,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#7ca5c2';ctx.beginPath();ctx.moveTo(415,210);ctx.lineTo(900,210);ctx.moveTo(415,210);ctx.lineTo(415,55);ctx.stroke();
 formationText(ctx,'高度 ↑',440,38,'#dcecf7',20);formationText(ctx,'纬度 →',820,255,'#dcecf7',20);
 for(const l of [-90,-60,-30,0,30,60,90])formationText(ctx,l===0?'0°':`${Math.abs(l)}°${l>0?'N':'S'}`,660+l*2.4,235,'#dcecf7',16,'center');
 ctx.strokeStyle='#ffe2a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,75);ctx.lineTo(x,210);ctx.stroke();
 formationText(ctx,'同一纬度',x,57,'#ffe2a0',20,'center');
 lessonText('bridge-location',` 同步定位：${lat===0?'赤道':Math.abs(lat)+'°'+(lat>0?'N':'S')}；点击“对应三维位置”查看。`);
}
function landSeaPlanForces(winter=LANDSEA.month===1){const sign=winter?1:-1,wind=[sign*88,sign*35];return {wind,gradient:[sign*110,0],coriolis:[-wind[1]*.55,wind[0]*.55],friction:wind.map(v=>-v*.65)};}
function drawLandSeaPlan(){
 const canvas=document.getElementById('landsea-plan-canvas');if(!canvas)return;
 const ctx=canvas.getContext('2d'),winter=LANDSEA.month===1,p=formationLevel('landsea','wind');ctx.clearRect(0,0,760,330);ctx.fillStyle='#0d1b2a';ctx.fillRect(0,0,760,330);
 formationText(ctx,'水平俯视 · 上北下南、右东左西',380,26,'#e2edf4',23,'center');
 ctx.fillStyle='#5c4d39';ctx.fillRect(55,65,215,185);ctx.fillStyle='#184b63';ctx.fillRect(490,65,215,185);
 formationText(ctx,'大陆',160,92,'#ffe3b0',22,'center');formationText(ctx,'海洋',600,92,'#b8e8ff',22,'center');
 formationText(ctx,winter?'H':'L',160,152,winter?'#ffe3b0':'#99d7fa',32,'center');formationText(ctx,winter?'相对低压':'相对高压',600,152,'#dcebf2',22,'center');
 if(p>0){
  const origin=[380,180],forces=landSeaPlanForces(winter),end=v=>[origin[0]+v[0],origin[1]+v[1]];
  formationPath(ctx,[origin,end(forces.gradient)],Math.min(1,p*2),'#eff5ff',3,true);
  if(p>.35){formationPath(ctx,[origin,end(forces.wind)],1,'#ffb76d',5);formationPath(ctx,[origin,end(forces.coriolis)],1,'#6be4ef',3);formationPath(ctx,[origin,end(forces.friction)],1,'#c89cff',3);}
  formationText(ctx,winter?'风吹向东南，来自西北':'风吹向西北，来自东南',380,276,'#ffce99',21,'center');
 }else formationText(ctx,'先预测：推动方向与近地面风向是否相同？',380,276,'#dcebf2',20,'center');
 formationText(ctx,'白虚线：气压梯度力　橙：风　青：向运动右侧　紫：摩擦',380,311,'#c5d9e8',18,'center');
}
function learningRecord(){return PEDAGOGY.evidence.records[PEDAGOGY.evidence.phase];}
function mountWindVariants(){
 const canvas=document.getElementById('teaching-wind-task');if(!canvas)return;const work=canvas.closest('.teaching-work'),prompt=work.querySelector('p'),reference=work.querySelector('details');
 work.insertAdjacentHTML('afterbegin','<label>气压场情境 <select id="wind-field-variant"><option value="north">北半球：西高东低</option><option value="south">南半球：东高西低</option></select></label>');
 const select=work.querySelector('select');select.value=PEDAGOGY.windHemisphere;
 const update=()=>{const south=PEDAGOGY.windHemisphere==='south';prompt.textContent=`${south?'南':'北'}半球同一水平面，等压线数值由西向东${south?'升高':'降低'}。请从白点画出气压梯度力，再画近地面风向，并写出依据。`;
  reference.innerHTML=`<summary>完成后查看核对依据</summary>气压梯度力垂直等压线，指向${south?'西侧':'东侧'}低压。${south?'南半球左偏，获得向南分量，吹向西南、来自东北':'北半球右偏，获得向南分量，吹向东南、来自西北'}。近地面风斜穿等压线；自由作图由师生核对。`;reference.open=false;drawWindTask();};
 select.onchange=()=>{PEDAGOGY.windVariants[PEDAGOGY.windHemisphere]=JSON.parse(JSON.stringify(TEACHING.windStrokes));PEDAGOGY.windHemisphere=select.value;PEDAGOGY.windReverse=select.value==='south';TEACHING.windStrokes=JSON.parse(JSON.stringify(PEDAGOGY.windVariants[select.value]||[]));update();};update();
}
const TRANSFER_TASKS=[
 {id:'southWind',title:'1. 陌生气压场：南半球',material:'南半球同一水平面，上北下南、右东左西。西侧1000 hPa，东侧1016 hPa，等压线近似南北向。',question:'画或描述气压梯度力和近地面风向，并写出推导依据。',rubric:['同一高度比较，推动方向向西','相对前进方向左偏，获得向南分量','近地面斜穿等压线，吹向西南、来自东北','能区分推动力、偏转与风向命名']},
 {id:'unknownClimate',title:'2. 隐去地名的气候资料',material:`甲站位于12.42°S。1月：${CLIMATE_NORMALS.darwin.temperature[0]}°C、${CLIMATE_NORMALS.darwin.rain[0]} mm；7月：${CLIMATE_NORMALS.darwin.temperature[6]}°C、${CLIMATE_NORMALS.darwin.rain[6]} mm。`,question:'判断当地季节及湿季月份；用气流来源、水汽和抬升条件解释，指出仅凭这些资料不能确定的内容。',rubric:['1月是当地夏季，7月是冬季','引用降水数值判断1月较湿；0.0为气候月平均显示值，不等于每年无雨','海洋水汽与辐合抬升共同影响湿季','不把单月降水或季风动画当作完整气候成因']},
 {id:'indiaContrast',title:'3. 用反例检验“印度冬半年都少雨”',material:`孟买（西海岸）：7月${CLIMATE_NORMALS.mumbai.rain[6]} mm，11月${CLIMATE_NORMALS.mumbai.rain[10]} mm。金奈（东海岸）：7月${CLIMATE_NORMALS.chennai.rain[6]} mm，11月${CLIMATE_NORMALS.chennai.rain[10]} mm。东北季风可经过孟加拉湾到达印度东南海岸。`,question:'材料是否支持上述概括？结合风的来向、海陆位置及其他降水条件解释两地差异。',rubric:['引用金奈11月降水作为反例','辨别印度东西海岸及气流经过的海面','指出东北季风经过孟加拉湾可补充水汽','不把11月降水全部归因于单一因素；还可能受热带天气系统影响']},
 {id:'sameLatitude',title:'4. 同纬度，降水能否相同？',material:'乙、丙均在45°N。乙位于大陆西岸，西风先经过海洋；丙位于内陆山脉背风侧，距海约1500 km。',question:'比较两地降水条件，并指出气压带风带模型能解释什么、还需要哪些材料。',rubric:['两地虽同纬度但海陆位置不同','乙的西风有海洋水汽来源','丙受距海远和背风坡影响，不能只凭西风判湿润','需要水汽、地形及实际降水资料检验']},
 {id:'pressureCause',title:'5. 解释副热带高压，避免“冷才高压”',material:'某地位于30°附近，近地面气压偏高，观测到下沉运动；下沉空气通常增温。',question:'为什么不能用“当地冷却”概括这一高压？说明高空调整、下沉与近地面气压的关系，并解释30°的含义。',rubric:['副热带高压在教材模型中主要属动力成因','联系高空空气调整与气柱质量收支','下沉可绝热增温，高压不等于当地寒冷','30°是近似位置，偏向力不直接向下压空气']}
];
function mountTransferTasks(body){
 let box=document.getElementById('independent-tasks');if(!box){box=document.createElement('section');box.id='independent-tasks';box.className='teaching-work';body.append(box);}
 box.innerHTML='<h3>独立解释与证据记录</h3><p>先完成解释，再展开核对。开放题由师生逐项评议，达成情况不会自动计入选择题正确率。</p><label>记录阶段 <select id="evidence-phase"><option value="pre">前测</option><option value="post">后测</option><option value="delayed">延迟测</option></select></label><button class="btn btn-sm" id="evidence-save-drawing">保存当前作图到本阶段</button><p id="evidence-drawing-status"></p>'+TRANSFER_TASKS.map(t=>`<article class="evidence-task"><h4>${t.title}</h4><p>${t.material}</p><p>${t.question}</p><label for="transfer-${t.id}">独立解释</label><textarea id="transfer-${t.id}" rows="3" placeholder="用材料和因果关系说明"></textarea><details><summary>完成后展开核对与分项评议</summary>${t.rubric.map((r,i)=>`<label class="evidence-rubric">${r}<select data-rubric="${t.id}:${i}"><option value="unchecked">未核对</option><option value="revise">需订正</option><option value="supported">基本达成</option><option value="independent">能独立解释</option></select></label>`).join('')}</details></article>`).join('')+'<p class="lesson-note">气候题数据来自JMA/TCC ClimatView，1991—2020年月常值。甲站地名及来源在完成后可查看。</p><details><summary>查看资料来源与甲站位置</summary><p>甲站为达尔文机场；'+['darwin','mumbai','chennai'].map(id=>`<a href="${CLIMATE_NORMALS[id].url}" target="_blank" rel="noopener">${CLIMATE_NORMALS[id].name}，站号${CLIMATE_NORMALS[id].station}</a>`).join('；')+'。数据已内嵌，读图无需联网。</p></details><label for="evidence-notes">教师评议与订正记录</label><textarea id="evidence-notes" rows="3"></textarea><details><summary>试教观察记录</summary><p>记录实际课堂观察，供调整教学；不自动生成教学效果结论。</p>'+[['classCode','班级代号'],['minutes','完成核心任务用时（分钟）'],['readability','后排识读情况'],['misconceptions','典型误解及订正']].map(([id,label])=>`<label>${label}<input data-classroom="${id}" type="text"></label>`).join('')+'</details>';
 const phase=box.querySelector('#evidence-phase');phase.value=PEDAGOGY.evidence.phase;
 phase.onchange=()=>{PEDAGOGY.evidence.phase=phase.value;saveLearningEvidence();mountTransferTasks(body);};
 const record=learningRecord();
 for(const t of TRANSFER_TASKS){const input=box.querySelector('#transfer-'+t.id);input.value=record.answers[t.id]||'';input.oninput=()=>{learningRecord().answers[t.id]=input.value;saveLearningEvidence();};}
 box.querySelectorAll('[data-rubric]').forEach(select=>{select.value=record.rubrics[select.dataset.rubric]||'unchecked';select.onchange=()=>{learningRecord().rubrics[select.dataset.rubric]=select.value;saveLearningEvidence();};});
 const notes=box.querySelector('#evidence-notes');notes.value=record.notes;notes.oninput=()=>{learningRecord().notes=notes.value;saveLearningEvidence();};
 box.querySelectorAll('[data-classroom]').forEach(input=>{input.value=PEDAGOGY.evidence.classroom[input.dataset.classroom]||'';input.oninput=()=>{PEDAGOGY.evidence.classroom[input.dataset.classroom]=input.value;saveLearningEvidence();};});
 box.querySelector('#evidence-save-drawing').onclick=()=>{const r=learningRecord();r.section=JSON.parse(JSON.stringify(TEACHING.sectionStrokes));r.wind=JSON.parse(JSON.stringify(TEACHING.windStrokes));r.windHemisphere=PEDAGOGY.windHemisphere;r.choices={...LESSON_STATE.answers};r.essay=LESSON_STATE.essay;saveLearningEvidence();updateDrawingEvidenceStatus();};
 updateDrawingEvidenceStatus();
}
function updateDrawingEvidenceStatus(){const r=learningRecord();lessonText('evidence-drawing-status',`本阶段已保存：剖面${r.section.length}笔、气压场${r.wind.length}笔。三个阶段分别保留。`);}
function mountClimateEvidenceTask(body){
 const box=document.createElement('div');box.className='teaching-work';box.innerHTML='<strong>用真实资料检验概括</strong><p>进入第五步，选择“真实月常值”，比较上海冬季是否无雨、孟买与达尔文湿季月份是否相同。再到“理解练习”的独立解释任务，比较印度东西海岸的降水差异。</p><button class="btn btn-sm" id="climate-evidence-quiz">进入独立解释任务</button>';body.append(box);
 box.querySelector('button').onclick=()=>{TEACHING.quizLevel='transfer';setLessonTab('quiz');document.getElementById('independent-tasks').scrollIntoView({block:'start'});};
}
function teachingWorksheetHTML(){
 const tasks='<section><strong>5. 无提示解释与真实材料</strong><p>按前测、后测、延迟测分别作答；先完成，再查看教师核对依据。</p>'+TRANSFER_TASKS.map(t=>`<section><strong>${t.title}</strong><p>${t.material}</p><p>${t.question}</p><div class="line"></div><div class="line"></div><div class="line"></div></section>`).join('')+'<p>气候资料：JMA/TCC ClimatView，1991—2020年月常值。站号：达尔文94120、孟买43057、金奈43279。来源：https://ds.data.jma.go.jp/tcc/tcc/products/climate/climatview/</p></section>';
 const rubric='<section><strong>开放任务核对依据（教师使用，可裁下）</strong>'+TRANSFER_TASKS.map(t=>`<p><strong>${t.title}</strong><br>${t.rubric.join('；')}。</p>`).join('')+'<p>分别记录：未核对／需订正／基本达成／能独立解释。真实试教另记录任务耗时、后排识读、典型误解及订正；不以软件检查代替学习效果。</p></section>';
 return baseTeachingWorksheetHTML().replace('前测 / 后测（圈选）','前测 / 后测 / 延迟测（圈选）').replace('<section><strong>教师核对要点（可裁下）</strong>',tasks+'<section style="break-before:page"><strong>教师核对要点（可裁下）</strong>').replace('</html>',rubric+'</html>');
}
