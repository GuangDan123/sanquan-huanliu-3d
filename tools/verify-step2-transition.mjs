import { tmpProfile } from './lib/tmp-profile.mjs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const port = 29300 + (process.pid % 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${tmpProfile()}`,
  '--window-size=1366,768', 'about:blank'
], { stdio: 'ignore', windowsHide: true });
let tab;
for (let i = 0; i < 80 && !tab; i++) {
  try { const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }); if (r.ok) tab = await r.json(); } catch {}
  await sleep(100);
}
if (!tab) throw new Error('Chrome startup timeout');
const ws = new WebSocket(tab.webSocketDebuggerUrl); let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } });
await new Promise(r => ws.addEventListener('open', r));
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
const capture = async name => { const shot = await send('Page.captureScreenshot', { format: 'png' }); await mkdir('artifacts/step2-transition-check', { recursive: true }); await writeFile(`artifacts/step2-transition-check/${name}.png`, Buffer.from(shot.data, 'base64')); };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href + '?state=explore' });
for (let i = 0; i < 120; i++) { if (await evaluate(`!!window.__threeCellDebug && document.getElementById('loading-screen')?.classList.contains('hidden')`)) break; await sleep(100); }
await sleep(900);
await evaluate('window.__threeCellDebug.transitionToStep(1); window.__threeCellDebug.showTeachingIntro(1); document.getElementById("teaching-intro")?.className'); await sleep(220);
const before = await evaluate(`(()=>{const d=window.__threeCellDebug;return {step:d.STATE.step,playing:d.STATE.playing,intro:document.getElementById('teaching-intro')?.classList.contains('show'),rotation:d.earthGroup.rotation.y,gridRotation:d.gridGroup?.rotation?.y ?? null,singleRootRotation:window.__singleCirculationDebug?.model?.root?.rotation?.y ?? null,single:window.__singleCirculationDebug?.model?.flows?.[1]?.ribbon?.material?.uniforms?.uOpacity?.value ?? null};})()`);
const origins = await evaluate(`(()=>{const s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model;const a=m.flows.find(f=>f.h===1&&f.index===0).curve.getPoint(0),b=s.flows.find(f=>f.h===1&&f.kind==='equator-rise').curve.getPoint(0);return {distance:a.distanceTo(b),single:[a.x,a.y,a.z],hadley:[b.x,b.y,b.z]};})()`);
await capture('intro');
await evaluate(`document.getElementById('teaching-intro-play')?.click()`); await sleep(450);
const after = await evaluate(`(()=>{const d=window.__threeCellDebug,s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model;return {playing:d.STATE.playing,intro:document.getElementById('teaching-intro')?.classList.contains('show'),rotation:d.earthGroup.rotation.y,gridRotation:d.gridGroup?.rotation?.y ?? null,singleRootRotation:m.root.rotation.y,sequenceRootRotation:s.root.rotation.y,morph:m.morphing,single:m.flows[1].ribbon.material.uniforms.uOpacity.value,hadley:s.flows.find(f=>f.kind==='upper'&&f.h===1).ribbon.material.uniforms.uOpacity.value};})()`);
await capture('playing');
await evaluate('window.__circulationSequenceDebug.seek(2.3,true)'); await sleep(120);
await capture('handoff-2.3');
await evaluate('window.__circulationSequenceDebug.seek(6)'); await sleep(120);
const middle = await evaluate(`(()=>{const s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model;return {morph:m.morphing,single:m.flows[1].ribbon.material.uniforms.uOpacity.value,originalVisible:m.flows[1].group.visible,newVisible:s.flows.find(f=>f.kind==='upper'&&f.h===1).group.visible};})()`);
await evaluate('window.__circulationSequenceDebug.seek(11.9)'); await sleep(120);
const fade = await evaluate(`(()=>{const s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model;return {morph:m.morphing,single:m.flows[1].ribbon.material.uniforms.uOpacity.value,originalVisible:m.flows[1].group.visible,newVisible:s.flows.find(f=>f.kind==='upper'&&f.h===1).group.visible};})()`);
await evaluate('window.__circulationSequenceDebug.seek(12.1)'); await sleep(120);
const end = await evaluate(`(()=>{const s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model;return {morph:m.morphing,visible:m.root.visible,newVisible:s.flows.find(f=>f.kind==='upper'&&f.h===1).group.visible,hadley:s.flows.find(f=>f.kind==='upper'&&f.h===1).ribbon.material.uniforms.uOpacity.value};})()`);
await evaluate('document.getElementById("mechanism-demo-replay")?.click()'); await sleep(180);
const replay = await evaluate(`(()=>{const d=window.__threeCellDebug,s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model;return {elapsed:window.__circulationSequenceDebug.elapsed(),playing:d.STATE.playing,intro:document.getElementById('teaching-intro')?.classList.contains('show'),rotation:d.earthGroup.rotation.y,singleVisible:m.root.visible,upperVisible:s.flows.find(f=>f.kind==='upper'&&f.h===1).group.visible};})()`);
await capture('replay');
await evaluate('document.getElementById("teaching-intro-play")?.click()'); await sleep(1800);
const replayPlaying = await evaluate(`(()=>{const d=window.__threeCellDebug,s=window.__circulationSequenceDebug.sequence;return {playing:d.STATE.playing,cameraMode:s.cameraMode,cameraActive:s.cameraActive,cameraDistance:d.camera.position.distanceTo(s.root.position)};})()`);
await evaluate('window.__circulationSequenceDebug.seek(12,true)'); await sleep(220);
const replayRide = await evaluate(`(()=>{const d=window.__threeCellDebug,s=window.__circulationSequenceDebug.sequence;return {playing:d.STATE.playing,cameraMode:s.cameraMode,cameraActive:s.cameraActive,cameraDistance:d.camera.position.distanceTo(s.root.position)};})()`);
await evaluate('window.__circulationSequenceDebug.seek(7.4,true)'); await sleep(140);
await capture('handoff-7.4');
await capture('replay-playing');
console.log(JSON.stringify({before, origins, after, middle, fade, end, replay, replayPlaying, replayRide}, null, 2));
const pass = before.step === 1 && before.intro && before.playing === false && origins.distance < 1e-6 && after.playing && !after.intro && after.rotation !== before.rotation && Math.abs(after.gridRotation - after.rotation) < 1e-9 && Math.abs(after.singleRootRotation - after.sequenceRootRotation) < 1e-9 && after.morph && middle.single === after.single && middle.originalVisible && !middle.newVisible && fade.single === after.single && fade.originalVisible && !fade.newVisible && end.visible === false && !end.morph && end.newVisible && end.hadley > .2 && replay.elapsed === 0 && replay.playing === false && replay.intro && replay.rotation === 0 && replay.singleVisible && !replay.upperVisible && replayPlaying.playing && replayPlaying.cameraMode === 'ride' && replayPlaying.cameraActive && replayRide.playing && replayRide.cameraMode === 'ride' && replayRide.cameraActive;
console.log(pass ? 'PASS second-step continuous handoff' : 'FAIL second-step continuous handoff');
ws.close(); chrome.kill(); process.exitCode = pass ? 0 : 1;
