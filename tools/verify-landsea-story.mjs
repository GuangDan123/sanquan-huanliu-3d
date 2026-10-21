import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const out=resolve('output/landsea-story');await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
function check(name,ok,evidence){checks.push({name,ok:!!ok,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);}
async function stage(node,progress=1){await p.evaluate(({node,progress})=>{const d=window.__landSeaDebug;d.formation.node=node;d.action('replay');d.formation.progress=progress;window.__threeCellDebug.STATE.playing=false;},{node,progress});await p.waitForTimeout(650);}
async function shot(name){await p.screenshot({path:resolve(out,name+'.png')});}
async function state(){return p.evaluate(()=>{
 const d=window.__landSeaDebug,g=d.group.getObjectByName('landsea-teaching-focus'),field=d.group.getObjectByName('landsea-mechanism-field'),panel=document.getElementById('landsea-formation'),r=panel.getBoundingClientRect();
 return {month:d.state.month,title:document.getElementById('ls-story-title').textContent,column:document.getElementById('ls-story-column').textContent,band:document.getElementById('ls-story-band').textContent,visibleBand:!document.getElementById('ls-story-band').hidden,
  panel:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,scroll:panel.scrollHeight},framing:window.__threeCellDebug.getSceneFraming(),
  notes:g.children.filter(o=>o.isCSS2DObject).map(o=>({text:o.element.textContent,visible:o.visible,rect:(()=>{let a=o.element.getBoundingClientRect();return {left:a.left,right:a.right,top:a.top,bottom:a.bottom};})()})),
  patches:g.children.filter(o=>o.name==='landsea-comparison-patch').map(o=>({color:o.material.color.getHexString(),visible:o.visible})),noise:field.children.filter(o=>o.visible).map(o=>o.type),time:d.mechanism().time,progress:d.formation.progress,node:d.formation.node,
  chain:[...document.querySelectorAll('[data-chain]')].map(el=>({text:el.textContent,complete:el.classList.contains('complete'),current:el.classList.contains('current')}))};
 });}
try{
 await p.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href);await p.waitForFunction(()=>window.__landSeaDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 await p.evaluate(()=>{document.getElementById('welcome-modal').classList.remove('show');window.__threeCellDebug.transitionToStep(3);});
 for(const month of [1,7]){
  await p.evaluate(month=>window.__landSeaDebug.setMonth(month),month);
  await stage(0,0);await shot(month+'-entry');
  await stage(1);let s=await state();check(`${month}月同纬度海陆冷热对照直标在地球上`,s.notes.filter(n=>n.visible&&/亚洲大陆|同纬度海洋/.test(n.text)).length===2&&s.patches.every(p=>p.visible),s);check(`${month}月形成演示去除密集图层`,s.noise.length===0,s.noise);await shot(month+'-heat');
  await stage(2);s=await state();check(`${month}月高空调整及质量收支显式展示`,s.column.includes(month===1?'高空向大陆补充':'高空从大陆流出')&&s.column.includes(month===1?'气柱质量增加':'气柱质量减少'),s.column);
  const direction=await p.evaluate(()=>{const d=window.__threeCellDebug,g=window.__landSeaDebug.group.getObjectByName('landsea-teaching-focus'),head=g.getObjectByName('landsea-vertical-direction'),a=g.getObjectByName('landsea-upper-adjustment').children[0].geometry.attributes.position;return {vertical:d.makeVector3(0,1,0).applyQuaternion(head.quaternion).dot(head.position.clone().normalize()),sourceLon:Math.atan2(-a.getZ(0),a.getX(0))*180/Math.PI,targetLon:Math.atan2(-a.getZ(a.count-1),a.getX(a.count-1))*180/Math.PI};});
  check(`${month}月冬季下沉与高空补充、夏季上升与高空外流方向正确`,month===1?direction.vertical<-.99&&direction.sourceLon>direction.targetLon:direction.vertical>.99&&direction.sourceLon<direction.targetLon,direction);await shot(month+'-column');
  await stage(3);s=await state();check(`${month}月近地面高低压与海洋相对气压对应`,s.column.includes(month===1?'H 冷高压':'L 热低压')&&s.column.includes(month===1?'相对较低压':'相对较高压'));await shot(month+'-pressure');
  await stage(4);s=await state();check(`${month}月气压带前后对照可见`,s.visibleBand&&s.band.includes(month===1?'副极地低压带':'副热带高压带')&&s.band.includes('均匀地表')&&s.band.includes('加入海陆'));await shot(month+'-band');
  await stage(5,.2);check(`${month}月先展示气压差推动方向`,await p.evaluate(()=>{const g=window.__landSeaDebug.group.getObjectByName('landsea-teaching-focus');return g.getObjectByName('landsea-pressure-drive').visible&&!g.getObjectByName('landsea-main-wind').visible;}));
  await stage(5);s=await state();check(`${month}月保留因果链与主季风路径`,s.chain.filter(c=>c.complete).length===3&&s.title.includes(month===1?'大陆 → 海洋':'海洋 → 大陆'));
  check(`${month}月前后对照完整显示在教学板可视区域`,await p.locator('#ls-story-band').evaluate(el=>el.getBoundingClientRect().bottom<=document.getElementById('landsea-formation').getBoundingClientRect().bottom));await shot(month+'-wind');
  const before=JSON.stringify([s.time,s.node,s.progress]);await p.waitForTimeout(350);s=await state();check(`${month}月暂停时推导图与场景保持`,before===JSON.stringify([s.time,s.node,s.progress]));
 }
 await p.click('#landsea-switch-view');await p.waitForTimeout(600);await shot('result');check('结果对照仍可查看气压场',await p.evaluate(()=>!document.getElementById('landsea-legend').hidden));
 await p.click('#landsea-switch-view');
 for(const width of [1920,1100,760,390,360]){
  await p.setViewportSize({width,height:width<600?844:900});await stage(4);const s=await state();check(`${width}宽教学板与地球各有空间`,s.panel.left>=0&&s.panel.right<=width&&(width>1100?s.panel.left>s.framing.centerX:s.panel.width<width),s);await shot(width+'-band');
 }
 await p.setViewportSize({width:1366,height:768});
 await p.evaluate(()=>{window.__threeCellDebug.STATE.speed=12;window.__landSeaDebug.action('restart');});
 await p.waitForFunction(()=>window.__landSeaDebug.formation.node>=2,null,{timeout:12000});await p.click('#landsea-play');let s=await state();const held=JSON.stringify([s.node,s.progress,s.time]);await p.waitForTimeout(400);s=await state();check('连续播放可暂停并保持当前位置',held===JSON.stringify([s.node,s.progress,s.time]));
 await p.click('#landsea-play');await p.waitForFunction(()=>{const f=window.__landSeaDebug.formation;return f.node===5&&f.progress===1&&!window.__threeCellDebug.STATE.playing;},null,{timeout:20000});check('连续播放自动完成六阶段',await p.locator('#landsea-play').textContent()==='重新播放');
 await p.evaluate(()=>window.__threeCellDebug.transitionToStep(2));check('返回第三步教学板关闭',await p.locator('#landsea-formation').evaluate(el=>el.hidden));
 check('退出第四步恢复原网格亮度',await p.evaluate(()=>window.__threeCellDebug.gridGroup.children.every(o=>!o.material||o.material.opacity===o.material.userData.storyOpacity)));
 check('无浏览器错误',errors.length===0,errors);
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));await b.close();}
if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;
