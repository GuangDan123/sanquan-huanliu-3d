// 生成只包含成品和说明材料的交付目录，避免复制浏览器缓存与开发中间文件。
import {mkdir,mkdtemp,copyFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const release=join(root,'release');await mkdir(release,{recursive:true});
const out=await mkdtemp(join(release,'三圈环流3D交互式教学平台-'));
const html='三圈环流3D交互式教学平台.html';
await copyFile(join(root,html),join(out,html));
await copyFile(join(root,'README.md'),join(out,'README.md'));
await mkdir(join(out,'docs'));
for(const name of ['作品说明书.md','技术说明.md','课堂教学优化.md','验收记录.md'])await copyFile(join(root,'docs',name),join(out,'docs',name));
await writeFile(join(out,'使用说明.md'),`# 三圈环流3D交互式教学平台

双击“${html}”即可运行，无需联网或安装。建议使用最新版Chrome或Edge。

点击播放观察过程，按步骤和环节手动推进。课堂探究包含风向、季节、季风、标准剖面和理解练习；手机尺寸的主题导航可横向滚动。按H隐藏界面，按R恢复三维默认参数与视角，练习作答由各自的重置按钮清除。

“风的成因”分为气压梯度力推动、地转偏向力偏转、近地面摩擦影响三步。直接点击“下一步”开始，每步播完自动停住，再次点击继续；中途暂停时也可点击“下一步”继续本步。可回退、重播本步或从头逐步重播。

目录只包含教学成品及说明材料，不包含开发缓存。若三维功能不可用，页面会显示原因及重新加载按钮。完整开发项目中的README提供构建与验收方法。
`,'utf8');
console.log(`交付目录：${out}`);
