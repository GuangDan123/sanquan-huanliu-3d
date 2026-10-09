// 实际浏览器课堂模块验收：包括预测、控制、风向、季节、评分、键盘、小屏与离线。
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
const url=process.argv[2]||'http://127.0.0.1:8137/';
const out=resolve(process.argv[3]||'artifacts/lessons');await mkdir(out,{recursive:true});
const layoutOnly=process.argv.includes('--layout');
const seasonOnly=process.argv.includes('--season');
const monsoonOnly=process.argv.includes('--monsoon');
const port=9500+process.pid%200;
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${join(out,`profile-${process.pid}`)}`,'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;const report={browser:'',checks:[],errors:[],screenshots:[]};
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
try{
  let tab;for(let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}await sleep(250);}if(!tab)throw Error('Chrome未启动');
  ws=new WebSocket(tab.webSocketDebuggerUrl);let id=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);});await new Promise(r=>ws.addEventListener('open',r));
  const send=(method,params={})=>new Promise((resolve,reject)=>{const k=++id;pending.set(k,{resolve,reject});ws.send(JSON.stringify({id:k,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const click=async s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
  const mouseClick=async s=>{const hit=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...hit});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...hit});};
  const select=async(s,v)=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const state=()=>ev('window.__lessonDebug.diagnostics()');
  const tabClick=async id=>{await click(`[data-lesson-tab="${id}"]`);await sleep(60);};
  const imageData=()=>ev("document.getElementById('lesson-canvas').toDataURL()");
  const snap=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,name),Buffer.from(r.data,'base64'));report.screenshots.push(name);};
  const viewport=async(w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});await sleep(350);};
  const ready=async()=>{for(let i=0;i<60;i++){if(await ev("!!window.__lessonDebug&&document.getElementById('loading-screen').classList.contains('hidden')"))return true;await sleep(200);}return false;};
  await send('Runtime.enable');await send('Page.enable');report.browser=(await send('Browser.getVersion')).product;await viewport(1366,768);
  await send('Page.navigate',{url:new URL('?state=explore',url).href});check(await ready(),'课堂模块HTTP入口初始化');await sleep(2200);
  if(layoutOnly){
    await ev("document.getElementById('speed-slider').value=20;document.getElementById('speed-slider').dispatchEvent(new Event('input',{bubbles:true}))");
    await click('#lesson-open');
    for(const tab of ['pressure','wind','season','monsoon','section','climate']){
      await tabClick(tab);
      if(tab==='wind')await select('#lesson-wind','westS');
      if(tab==='season'){await click('[data-season="summer"]');await sleep(2200);}
      if(tab==='monsoon'){await select('#lesson-surface','real');await select('#lesson-region','south');await select('#lesson-monsoon-season','summer');}
      if(tab==='climate'){await select('#lesson-climate','med');await click('[data-climate-season="winter"]');}
      if(!['season','section'].includes(tab)){await click('#lesson-play');await sleep(4200);}
      await ev("document.getElementById('lesson-body').scrollTop=0");
      check(await ev("(()=>{const b=document.getElementById('lesson-body').getBoundingClientRect(),c=document.getElementById('lesson-canvas').getBoundingClientRect(),p=document.getElementById('lesson-playbar').getBoundingClientRect();return c.top>=b.top&&c.bottom<=b.bottom&&p.bottom<=document.getElementById('lesson-panel').getBoundingClientRect().bottom;})()"),`${tab}完整图示及固定播放区直接可见`);
      await snap(`layout-${tab}.png`);
    }
    await click('#lesson-close');await click('#projection-toggle');await click('#lesson-open');await tabClick('season');await click('[data-season="summer"]');await sleep(2200);
    check(await ev("(()=>{const b=document.getElementById('lesson-body').getBoundingClientRect(),c=document.getElementById('lesson-canvas').getBoundingClientRect();return c.top>=b.top&&c.bottom<=b.bottom;})()"),'投屏完整季节图直接可见');await snap('projection-season.png');
    await click('#lesson-close');await click('#projection-toggle');await viewport(760,800);await click('#lesson-open');await tabClick('monsoon');await ev("document.getElementById('lesson-canvas').scrollIntoView({block:'center'})");await snap('layout-small-monsoon.png');
    check(await ev("(()=>{const r=document.getElementById('lesson-play').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;})()"),'小屏播放区固定可见');
  }else if(seasonOnly){
    await ev("document.getElementById('speed-slider').value=20;document.getElementById('speed-slider').dispatchEvent(new Event('input',{bubbles:true}))");
    await mouseClick('#lesson-open');await tabClick('season');const reference=await imageData();
    check((await state()).seasonValue===0&&!(await state()).running,'季节默认春秋分参考等待播放');
    await mouseClick('#lesson-play');await sleep(550);await mouseClick('#lesson-play');const north=await state(),northImage=await imageData();
    check(north.seasonMode==='cycle'&&north.seasonValue>0&&north.seasonValue<1&&northImage!==reference,'默认春秋分直接点击播放，图像与直射点实际北移',north);await snap('cycle-northward.png');
    await sleep(300);check((await state()).elapsed===north.elapsed&&await imageData()===northImage,'全年循环暂停冻结进度与图像');
    await mouseClick('#lesson-play');await sleep(5000);const south=await state();
    check(south.running&&south.seasonValue<0&&south.phase.includes('冬季'),'继续后经过秋季进入冬季，直射点与气压带南移',south);await snap('cycle-southward.png');
    await sleep(3000);const complete=await state();
    check(complete.complete&&!complete.running&&complete.seasonValue===0&&complete.tab==='season'&&complete.phase.includes('完成一轮'),'全年循环完成回到春秋分，停留当前主题',complete);
    await mouseClick('#lesson-play');await sleep(300);await mouseClick('#lesson-play');check((await state()).elapsed<1&&(await state()).seasonValue>0,'完成后再次播放仍有图形变化');
    await mouseClick('#lesson-replay');await sleep(250);await mouseClick('#lesson-play');const replay=await state();
    check(replay.elapsed<1&&!replay.complete&&replay.seasonMode==='cycle'&&replay.seasonValue>0,'从头重播从春季重新开始完整循环');
    await mouseClick('[data-season="summer"]');await sleep(2200);const summer=await state();
    check(summer.complete&&summer.seasonValue===1&&summer.seasonMode==='target','单选夏季仍可到达北移对照终态');
    await tabClick('pressure');await tabClick('season');const selectedSummer=await imageData();
    await mouseClick('#lesson-play');await sleep(300);await mouseClick('#lesson-play');check((await state()).seasonValue<1&&await imageData()!==selectedSummer,'重入已选夏季后直接播放仍会移动');
    await mouseClick('[data-season="winter"]');await sleep(2200);check((await state()).seasonValue===-1,'单选冬季到达南移终态');
    await mouseClick('[data-season="winter"]');await sleep(300);await mouseClick('#lesson-play');check((await state()).seasonValue<0&&(await state()).seasonValue>-1,'重选同一个冬季可重新观察移动');
    await mouseClick('[data-season="equinox"]');await sleep(2200);await mouseClick('#lesson-replay');await sleep(300);await mouseClick('#lesson-play');check((await state()).seasonMode==='cycle'&&(await state()).seasonValue>0,'春秋分从头重播会北移，不空走进度');
    await click('#lesson-close');await viewport(760,800);await click('#lesson-open');await tabClick('season');await mouseClick('#lesson-play');await sleep(350);await mouseClick('#lesson-play');check((await state()).seasonMode==='cycle'&&(await state()).seasonValue>0,'小屏真实点击直接播放季节循环');await snap('small-cycle.png');
    await click('#lesson-close');await viewport(1366,768);await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});const local=pathToFileURL(resolve('三圈环流3D交互式教学平台.html'));local.searchParams.set('state','explore');await send('Page.navigate',{url:local.href});check(await ready(),'季节循环断网file入口初始化');await sleep(1800);await click('#lesson-open');await tabClick('season');const offlineBefore=await imageData();await mouseClick('#lesson-play');await sleep(400);await mouseClick('#lesson-play');check((await state()).seasonValue>0&&await imageData()!==offlineBefore,'离线直接播放，直射点与图像实际改变');await snap('offline-cycle.png');
  }else if(monsoonOnly){
    await ev("document.getElementById('speed-slider').value=20;document.getElementById('speed-slider').dispatchEvent(new Event('input',{bubbles:true}))");
    await mouseClick('#lesson-open');await tabClick('monsoon');const idealImage=await imageData();
    check(await ev("(()=>{const e=document.getElementById('lesson-add-surface'),r=e.getBoundingClientRect(),b=document.getElementById('lesson-body').getBoundingClientRect();return e.textContent==='加入海陆差异'&&r.top>=b.top&&r.bottom<=b.bottom&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;})()"),'海陆差异独立入口直接可见且可点击');
    check((await state()).surface==='ideal'&&await ev("document.getElementById('lesson-progress').hidden&&document.getElementById('lesson-play').textContent==='加入海陆差异并播放'"),'理想模型提示明确，不展示空播放进度');await snap('monsoon-entry.png');
    await mouseClick('#lesson-add-surface');await sleep(300);const started=await state();
    check(started.surface==='real'&&started.running&&started.elapsed>0&&await imageData()!==idealImage,'真实鼠标点击加入海陆，出现大陆与气压中心并启动演示');
    check(await ev("document.getElementById('lesson-surface').value==='real'&&document.getElementById('lesson-add-surface').textContent==='返回理想模型'"),'独立入口同步下拉选项和返回按钮');await snap('monsoon-added.png');
    const moving=await imageData();await sleep(300);check(await imageData()!==moving,'加入海陆后季风示踪实际移动');await mouseClick('#lesson-play');const paused=await state(),frozen=await imageData();await sleep(250);
    check((await state()).elapsed===paused.elapsed&&await imageData()===frozen,'海陆过程可暂停冻结图像');
    await mouseClick('#lesson-add-surface');check((await state()).surface==='ideal'&&!(await state()).running&&(await state()).elapsed===0&&await imageData()===idealImage,'返回理想模型清除季风路径及播放状态');
    await mouseClick('#lesson-play');await sleep(250);check((await state()).surface==='real'&&(await state()).running,'理想模型下直接播放也会加入海陆差异');await mouseClick('#lesson-play');
    await mouseClick('#lesson-add-surface');await mouseClick('#lesson-replay');await sleep(250);check((await state()).surface==='real'&&(await state()).running,'理想模型下重播也会加入海陆差异');await mouseClick('#lesson-play');
    await select('#lesson-monsoon-season','summer');await select('#lesson-region','south');await mouseClick('#lesson-add-surface');await mouseClick('#lesson-add-surface');await sleep(4200);const south=await state();
    check(south.complete&&south.monsoonSeason==='summer'&&south.region==='south'&&south.phase.includes('跨赤道'),'加入与返回保留季节区域选择，南亚夏季演示正常');await snap('monsoon-south-entry.png');
    // 记录实际Canvas绘制，独立核对学生看到的气压标识、区域和箭头，而非读取绘图配置。
    await ev(`(()=>{
      window.monsoonFrame={labels:[],areas:[],strokes:[]};let points=[];
      const proto=CanvasRenderingContext2D.prototype;
      for(const method of ['clearRect','fillText','ellipse','beginPath','moveTo','lineTo','stroke']){
        const original=proto[method];proto[method]=function(...args){
          if(this.canvas.id==='lesson-canvas'){
            const f=window.monsoonFrame;
            if(method==='clearRect'){f.labels=[];f.areas=[];f.strokes=[];}
            if(method==='fillText')f.labels.push({text:args[0],x:args[1],y:args[2],width:this.measureText(args[0]).width,size:parseFloat(this.font)});
            if(method==='ellipse')f.areas.push(args.slice(0,4));
            if(method==='beginPath')points=[];
            if(method==='moveTo'||method==='lineTo')points.push(args.slice(0,2));
            if(method==='stroke'&&points.length>=3)f.strokes.push({points:[...points],color:this.strokeStyle,width:this.lineWidth});
          }
          return original.apply(this,args);
        };
      }
    })()`);
    for(const scenario of [
      {region:'east',season:'winter',high:'亚洲冬季高压',low:'海洋较低压区（相对大陆）',dx:1,dy:1},
      {region:'east',season:'summer',high:'太平洋副热带高压',low:'大陆热低压',dx:-1,dy:-1},
      {region:'south',season:'winter',high:'大陆冷高压',low:'印度洋近赤道较低压区',dx:-1,dy:1},
      {region:'south',season:'summer',high:'南半球副热带高压',low:'印度低压（热低压）',dx:-1,dy:-1}
    ]){
      const name=scenario.region+'-'+scenario.season;
      await select('#lesson-region',scenario.region);await select('#lesson-monsoon-season',scenario.season);
      const initial=await ev('window.monsoonFrame'),labels=initial.labels.map(l=>l.text);
      check(!(await state()).running&&(await state()).elapsed===0&&['H 高压','L 低压',scenario.high,scenario.low,'近地面：由高压流向低压'].every(t=>labels.includes(t))&&initial.areas.length===2,`${name}未播放即显示高低压区域及对应地理名称`,initial);
      const prediction=await imageData();await mouseClick('#lesson-play');await sleep(300);await mouseClick('#lesson-play');
      const pause=await state(),pauseImage=await imageData();await sleep(180);
      check((await state()).elapsed===pause.elapsed&&await imageData()===pauseImage&&pauseImage!==prediction,`${name}示踪改变画面，暂停保留高低压图示`);
      await mouseClick('#lesson-play');await sleep(4200);const drawn=await ev('window.monsoonFrame');
      const paths=drawn.strokes.filter(s=>s.width===3&&['#ffaa55','#88caff'].includes(s.color)),first=paths[0]?.points,last=paths.at(-1)?.points;
      const high=drawn.areas[0],low=drawn.areas[1],distance=(point,area)=>Math.hypot((point[0]-area[0])/area[2],(point[1]-area[1])/area[3]);
      check((await state()).complete&&first&&last&&distance(first[0],high)<1.4&&distance(last.at(-1),low)<1.4&&Math.sign(first.at(-1)[0]-first[0][0])===scenario.dx&&Math.sign(last.at(-1)[1]-first[0][1])===scenario.dy,`${name}实际气流从高压区域到低压区域，流向正确`,paths);
      check(drawn.labels.every(l=>l.x-l.width/2>=0&&l.x+l.width/2<=960&&l.y-l.size>=0&&l.y<=360),`${name}文字保留在画布范围内`);
      if(name==='south-summer')check(paths.length===2&&first[0][1]>280&&first.at(-1)[1]===280&&last.at(-1)[1]<280&&last.at(-1)[0]>last.at(-2)[0], '南亚夏季实际跨赤道后转向东北，形成西南季风');
      await snap(`pressure-${name}.png`);
    }
    await click('#lesson-reveal');
    check(await ev("document.getElementById('lesson-explanation').textContent.includes('相对大陆')&&document.getElementById('lesson-explanation').textContent.includes('昼夜变化')"),'解释区分相对低压、季节季风与昼夜海陆风');
    await select('#teaching-monsoon-view','compare');
    check(await ev("document.getElementById('lesson-playbar').hidden")&&(await ev('window.monsoonFrame.labels')).some(l=>l.text.includes('1月')), '1月7月对照仍可切换');
    await select('#teaching-monsoon-view','monsoon');
    await click('#lesson-close');await viewport(760,800);await mouseClick('#lesson-open');await tabClick('monsoon');await mouseClick('#lesson-add-surface');await mouseClick('#lesson-add-surface');await sleep(250);
    check((await state()).surface==='real'&&(await state()).running,'小屏真实点击独立入口正常');await snap('small-monsoon-entry.png');
    await click('#lesson-close');await viewport(1366,768);await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});const local=pathToFileURL(resolve('三圈环流3D交互式教学平台.html'));local.searchParams.set('state','explore');await send('Page.navigate',{url:local.href});check(await ready(),'海陆入口断网file初始化');await sleep(1800);await click('#lesson-open');await tabClick('monsoon');await mouseClick('#lesson-add-surface');await sleep(250);check((await state()).surface==='real'&&(await state()).running,'离线独立海陆入口与播放正常');await snap('offline-monsoon-entry.png');
  }else{
  await mouseClick('#lesson-open');const initial=await state();
  check(initial.open&&initial.tab==='pressure'&&!initial.running,'真实鼠标打开风的成因，先预测');
  check(await ev("document.getElementById('lesson-explanation').hidden&&document.getElementById('control-panel').inert&&document.activeElement.id==='lesson-close'"),'解释初始收起，背景不可误操作且焦点进入');
  const before=await imageData();await mouseClick('#lesson-play');await sleep(2800);const first=await state();
  check(first.pressureStep===0&&!first.running&&first.elapsed===2.4&&first.phase.startsWith('①'),'气压推动播完自动停留第一步');
  await mouseClick('#lesson-step-next');await sleep(800);await mouseClick('#lesson-play');const paused=await state(),pausedImage=await imageData();
  check(paused.pressureStep===1&&paused.elapsed>2.4&&pausedImage!==before,'教师进入偏转步骤，画面实际改变');await snap('pressure-deflection.png');await sleep(250);
  check((await state()).elapsed===paused.elapsed&&await imageData()===pausedImage,'课堂过程暂停冻结');
  await click('#lesson-reveal');check(await ev("!document.getElementById('lesson-explanation').hidden&&document.getElementById('lesson-explanation').textContent.includes('摩擦')"),'可展开动力、偏转、摩擦解释');
  await click('#lesson-play');await sleep(3000);check((await state()).pressureStep===1&&!(await state()).running&&!(await state()).complete,'偏转步骤播完停留，不自动进入摩擦');
  await mouseClick('#lesson-step-next');await sleep(3100);check((await state()).complete&&(await state()).tab==='pressure','教师播放最后一步，完成后停留主题');await snap('pressure-complete.png');
  await click('#lesson-replay');await sleep(250);await click('#lesson-play');check((await state()).elapsed<1&&!(await state()).complete,'课堂从头重播清除进度');
  await tabClick('wind');
  const directions={tradeN:[-1,-1],tradeS:[-1,1],westN:[1,1],westS:[1,-1],polarN:[-1,-1],polarS:[-1,1]};
  for(const [id,[east,north]] of Object.entries(directions)){await select('#lesson-wind',id);const d=await state();check(d.wind.east===east&&d.wind.north===north&&d.elapsed===0&&!d.running,`${d.wind.name}吹向正确且切换重新等待预测`,d.wind);}
  await select('#lesson-wind','westS');await click('#lesson-reveal');
  check(await ev("document.getElementById('lesson-explanation').textContent.includes('吹向东南')&&document.getElementById('lesson-explanation').textContent.includes('来自西北')"),'南半球西风区分吹向与来向');
  await ev("document.getElementById('speed-slider').value=20;document.getElementById('speed-slider').dispatchEvent(new Event('input',{bubbles:true}))");await click('#lesson-play');await sleep(4200);check((await state()).complete&&(await state()).phase.includes('按来向'),'风带逐段推导到命名');await snap('wind-south-westerly.png');
  await tabClick('season');const equinox=await state();check(equinox.solarLatitude===0&&equinox.belts.every(b=>b.lat===b.base),'春秋分参考纬度与直射点');
  await mouseClick('[data-season="summer"]');await sleep(700);await click('#lesson-play');const summerMid=await state();await sleep(250);
  check(summerMid.seasonValue>0&&summerMid.seasonValue<1&&(await state()).seasonValue===summerMid.seasonValue,'季节移动连续变化，暂停保留位置');await click('#lesson-play');await sleep(1800);const summer=await state();
  check(summer.complete&&Math.abs(summer.solarLatitude-23.44)<1e-8&&summer.belts.filter(b=>Math.abs(b.base)<90).every(b=>b.lat>b.base),'6月直射点北移，各带总体偏北',summer.belts);
  check(new Set(summer.belts.map(b=>b.lat-b.base)).size>2,'各带移动幅度不同，极地端保持边界');await snap('season-summer.png');
  await click('[data-season="winter"]');await sleep(2200);const winter=await state();check(winter.solarLatitude<0&&winter.belts.filter(b=>Math.abs(b.base)<90).every(b=>b.lat<b.base),'12月总体偏南，两半球纬度含义不同',winter.belts);await snap('season-winter.png');
  await tabClick('monsoon');check((await state()).surface==='ideal','海陆章节从均匀地表模型开始');await snap('monsoon-ideal.png');
  await select('#lesson-surface','real');await click('#lesson-play');await sleep(4200);const eastWinter=await state();check(eastWinter.phase.includes('大陆冷高压')&&eastWinter.phase.includes('大陆吹向海洋'),'东亚冬季：冷高压与大陆到海洋');await snap('monsoon-east-winter.png');
  await select('#lesson-monsoon-season','summer');await click('#lesson-play');await sleep(4200);check((await state()).phase.includes('大陆热低压')&&(await state()).phase.includes('海洋吹向大陆'),'东亚夏季：热低压与海洋到大陆');await snap('monsoon-east-summer.png');
  await select('#lesson-region','south');await click('#lesson-play');await sleep(4200);check((await state()).phase.includes('跨赤道')&&(await state()).phase.includes('西南'),'南亚夏季补充季节移动与跨赤道右偏');await snap('monsoon-south-summer.png');
  await tabClick('section');await click('[data-section-lat="60"]');check((await state()).phase.includes('辐合抬升')&&(await state()).phase.includes('动力性'),'标准剖面60°对应动力性低压');await snap('section-both.png');
  await select('#lesson-section-h','north');check((await state()).sectionH==='north','标准剖面可单独观察北半球');await snap('section-north.png');
  await tabClick('climate');await select('#lesson-climate','med');await click('#lesson-play');await sleep(4200);check((await state()).phase.includes('副热带高压')&&(await state()).phase.includes('干燥'),'地中海夏干解释链');await snap('climate-med-summer.png');
  await click('[data-climate-season="winter"]');await click('#lesson-play');await sleep(4200);check((await state()).phase.includes('西风')&&(await state()).phase.includes('水汽'),'地中海冬雨解释链');await snap('climate-med-winter.png');
  await tabClick('quiz');await mouseClick('#lesson-quiz-check');check((await state()).quiz.blank===17&&(await state()).quiz.correct===0,'空卷17题均为未完成');
  await click('[data-quiz-id="arrowTrade"][data-option="0"]');await click('#lesson-quiz-check');check((await state()).quiz.wrong===1&&await ev("document.getElementById('feedback-arrowTrade').textContent.includes('来向')"),'错误风向保留作答，反馈解释来向');await snap('quiz-wrong.png');
  await click('#feedback-arrowTrade .lesson-link');check((await state()).tab==='wind'&&(await state()).wind.id==='tradeN','错误反馈定位到对应风带');
  await tabClick('quiz');check((await state()).answers.arrowTrade===0,'回看后保留原答案');
  // 教学题库预期答案由人工确认，不读取页面中的correct字段。
  const answers={drive:0,subtropical:1,subpolar:2,right:1,force:1,june:1,eastWinter:0,southAsia:1,med:1,arrowTrade:2,arrowWest:1,arrowPolar:2,rain:1,pole:1,upperWind:0,seaCut:0,southJuly:1};
  for(const [id,a] of Object.entries(answers))await click(`[data-quiz-id="${id}"][data-option="${a}"]`);await click('#lesson-quiz-check');const full=await state();check(full.quiz.correct===17&&full.quiz.wrong===0&&full.quiz.blank===0,'风向、成因、季节、应用17题全量正确');
  await ev("document.getElementById('lesson-essay').value='夏季副热带高压下沉少雨；冬季海洋西风带来水汽。';document.getElementById('lesson-essay').dispatchEvent(new Event('input',{bubbles:true}))");
  await click('#lesson-close');await mouseClick('#lesson-open');check((await state()).quiz.correct===17&&(await state()).essay.includes('海洋西风'),'关闭重开保留选择题与迁移作答');await snap('quiz-complete.png');
  await click('#lesson-quiz-reset');check((await state()).quiz.blank===17&&(await state()).essay==='','重置清除作答');
  await tabClick('section');await click('#lesson-to-three');check(!(await state()).open&&await ev('window.__threeCellDebug.STATE.step===2'),'标准剖面返回三维对应阶段');
  await click('#projection-toggle');check((await state()).projection&&await ev("parseFloat(getComputedStyle(document.querySelector('.sp-item')).fontSize)>=16"),'投屏模式放大课堂文字');await sleep(1200);await snap('projection-three.png');await click('#projection-toggle');
  await mouseClick('#lesson-open');await tabClick('section');
  await ev("document.getElementById('lesson-next').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  check(await ev("document.activeElement.id==='lesson-close'"),'键盘Tab焦点留在课堂窗口');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});check(!(await state()).open&&await ev("!document.getElementById('control-panel').inert"),'Escape关闭并恢复背景操作');
  await viewport(760,800);await mouseClick('#lesson-open');await tabClick('season');await click('[data-season="summer"]');await sleep(2200);
  check(await ev("(()=>{const p=document.getElementById('lesson-panel').getBoundingClientRect(),b=document.getElementById('lesson-close').getBoundingClientRect(),f=document.getElementById('lesson-panel').querySelector('footer').getBoundingClientRect();return p.left>=0&&p.right<=innerWidth&&p.top>=0&&p.bottom<=innerHeight&&b.right<=innerWidth&&b.top>=0&&f.bottom<=innerHeight&&getComputedStyle(document.getElementById('control-panel')).visibility==='hidden';})()"),'小屏课堂充分使用屏幕，关闭与课堂底部操作可见');await snap('small-season.png');
  await tabClick('quiz');await ev("document.getElementById('lesson-essay').scrollIntoView({block:'nearest'})");check(await ev("document.getElementById('lesson-body').scrollHeight>document.getElementById('lesson-body').clientHeight"),'小屏练习与迁移作答可滚动到达');await snap('small-quiz.png');
  await click('#lesson-close');await viewport(1366,768);await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});const local=pathToFileURL(resolve('三圈环流3D交互式教学平台.html'));local.searchParams.set('state','explore');await send('Page.navigate',{url:local.href});check(await ready(),'课堂模块断网file入口');await sleep(1800);await click('#lesson-open');await tabClick('monsoon');await select('#lesson-surface','real');await snap('offline-monsoon.png');check((await state()).open&&(await state()).surface==='real','离线课堂内容正常操作');
  }
  check(report.errors.length===0,'课堂全过程无未捕获异常',report.errors);
}catch(error){report.errors.push(String(error));check(false,'验收执行',String(error));}
finally{report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));ws?.close();chrome.kill();}
console.log(`课堂验收：${report.passed?'通过':'未通过'}；${report.checks.filter(x=>x.ok).length}/${report.checks.length}`);process.exitCode=report.passed?0:1;
