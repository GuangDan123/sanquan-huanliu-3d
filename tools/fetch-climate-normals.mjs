// Refresh the bundled, independently sourced monthly normals. Not used at lesson runtime.
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/teacher-review-20261011/sources';await mkdir(out,{recursive:true});
const stations=[['beijing','54511'],['shanghai','58362'],['mumbai','43057'],['darwin','94120'],['chennai','43279']];
const data={};
const results=await Promise.allSettled(stations.map(async([id,station])=>{
 const url=`https://ds.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=${station}&y=2025&m=12`;
 const response=await fetch(url);if(!response.ok)throw Error(`${id}: HTTP ${response.status}`);
 const html=await response.text();await writeFile(`${out}/${id}.html`,html);
 const name=html.match(/<div id="info">\s*([^<]+)/)?.[1].replace(/&nbsp;/g,' ').trim();
 const months=Array(12);
 for(const row of html.matchAll(/<tr(?: class="c")?>\s*<th class="list"[^>]*>\s*(\d{4})-(\d{2})<\/th>([\s\S]*?)<\/tr>/g)){
  const cells=[...row[3].matchAll(/<td class="list"[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').trim());
  const temperature=Number(cells[4]),rain=Number(cells[5]);
  if(!cells[4]||!cells[5]||!Number.isFinite(temperature)||!Number.isFinite(rain))throw Error(`Missing normal ${id} ${row[2]}`);
  months[Number(row[2])-1]={temperature,rain};
 }
 if(months.filter(Boolean).length!==12)throw Error(`Incomplete ${id}`);
 data[id]={station,name,source:'日本气象厅东京气候中心（JMA/TCC）ClimatView',period:'1991–2020',url,temperature:months.map(m=>m.temperature),rain:months.map(m=>m.rain)};
 return {id,...data[id]};
}));
for(const result of results){if(result.status==='rejected')throw result.reason;console.log(JSON.stringify(result.value));}
const overview='https://ds.data.jma.go.jp/tcc/tcc/products/climate/climatview/outline.html';
const overviewHtml=await (await fetch(overview)).text();await writeFile(`${out}/overview.html`,overviewHtml);
if(!/1991\s*-\s*2020/.test(overviewHtml))throw Error('Normals reference period could not be verified');
await writeFile(`${out}/normals.json`,JSON.stringify(data,null,2));
await writeFile('src/climate-normals.js','/* JMA/TCC ClimatView monthly normals, 1991–2020. Retrieved 2026-10-11. */\nconst CLIMATE_NORMALS = '+JSON.stringify(data,null,2)+';\n');
