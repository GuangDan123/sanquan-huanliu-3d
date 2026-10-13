import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='artifacts/teacher-review-20261011';
const artifact=await readFile('三圈环流3D交互式教学平台.html');
const suites=[['主功能','final-main'],['课堂探究','final-lessons'],['海陆与季风','final-landsea'],['季风与气候','final-climate'],['教学操作','final-teaching'],['课堂路线与性能','final-classroom'],['本次教学评审专项','final-pedagogy-release']];
const results=[];
for(const[name,directory]of suites){
 const path=`${root}/${directory}/check.json`,report=JSON.parse(await readFile(path,'utf8'));
 if(!report.passed||report.errors.length||report.checks.some(c=>!c.ok))throw Error('Incomplete acceptance '+path);
 results.push({name,path,passed:report.checks.length,total:report.checks.length,buildSha256:report.buildSha256||null,reportUpdatedAt:(await stat(path)).mtime.toISOString()});
}
const manifest={date:'2026-10-11',artifact:'三圈环流3D交互式教学平台.html',artifactSha256:createHash('sha256').update(artifact).digest('hex'),passed:results.reduce((n,r)=>n+r.passed,0),total:results.reduce((n,r)=>n+r.total,0),suites:results,note:'完整功能回归后仅澄清第五步图注中的真实资料与示意关系，重新构建并对最终成品复验46项教学专项。保存各套报告原有摘要，不将未记录摘要的历史报告伪装成最终文件的摘要。实际教室试教仍需真实学生参与。'};
if(results.at(-1).buildSha256!==manifest.artifactSha256)throw Error('Final artifact differs from final teaching acceptance');
await writeFile(`${root}/验收清单.json`,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({passed:manifest.passed,total:manifest.total,artifactSha256:manifest.artifactSha256}));
