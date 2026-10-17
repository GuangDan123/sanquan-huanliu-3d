/* The ideal single cell shares the second step's air ribbons and spherical turns. */
const SINGLE_CIRCULATION={root:null,flows:[],obsoleteUppers:[],loops:[],notes:[],bands:[],clouds:[],columns:[],polarAccumulations:[],descentColumns:[],pressureWaves:[],heatZone:null,motionTime:0,ambientElapsed:0,freeView:false,cameraActive:false,cameraSaved:null,thermalColors:[0xffb52e,0xb6dc45,0x16c8b5,0x2586ff]};
function singleAmbientRunning(){return STATE.step===0&&STATE.singleDemo.complete&&STATE.playing&&!document.getElementById('single-explanation')?.open&&!LESSON_STATE.open;}
function singleThermalProgress(kind,point){return clamp(Math.abs(Math.asin(point.y/point.length())*180/Math.PI)/90,0,1);}
function singleThermalColor(point){
  const t=singleThermalProgress('',point)*3,colors=SINGLE_CIRCULATION.thermalColors,i=Math.min(2,Math.floor(t));
  return new THREE.Color(colors[i]).lerp(new THREE.Color(colors[i+1]),t-i);
}
function createSingleCirculation(){
  const model=SINGLE_CIRCULATION,root=new THREE.Group();root.position.x=SCENE_OFFSET_X;scene.add(root);model.root=root;
  model.atmosphere=createCirculationAtmosphere();root.add(model.atmosphere);
  const definitions=[],kinds=['rise','upper','sink','surface'];
  for(const h of [1,-1]){
    // Build every visible segment from the same rounded analytical loop used
    // by step one, so entering step two never swaps in a different baseline.
    const rounded=new RoundedSingleDropCurve(2.5,90,0,h,0),ranges=[[0,.16],[.16,.5],[.5,.66],[.66,1]];
    ranges.forEach(([start,end],i)=>{
      const sample=t=>rounded.getPoint(start+(end-start)*t),raw=new SequenceCurve(sample);
      definitions.push({args:[sample,0,0,0,kinds[i],h],raw,curve:raw,index:i,h,kind:kinds[i]});
    });
  }
  for(const d of definitions){
    const stage=SINGLE_FLOW_STAGES[d.index],flow=createAirflowVisual(root,{curve:d.curve,sourceCurve:d.raw,start:stage.start,end:stage.end,color:0xffb52e,endColor:0x2586ff,kind:d.kind,h:d.h,lon:0,thermalProgress:singleThermalProgress,thermalPalette:model.thermalColors,cells:{single:kinds},ribbonWidth:()=>.34,streamline:true});
    flow.index=d.index;model.flows.push(flow);
  }
  for(const original of model.flows.filter(f=>f.index===1)){
    // Split the existing upper branch near the low-latitude turning region.
    // The poleward remainder keeps its original coordinates while it fades.
    let lo=0,hi=1;
    for(let i=0;i<30;i++){const t=(lo+hi)/2,p=original.sourceCurve.getPoint(t),lat=Math.abs(Math.asin(p.y/p.length())*180/Math.PI);if(lat<CIRCULATION_SEQUENCE.cellLatitudes.hadleyEdge)lo=t;else hi=t;}
    original.breakT=(lo+hi)/2;
    original.retainedCurve=new SequenceCurve(t=>original.sourceCurve.getPoint(t*original.breakT));
    const curve=new SequenceCurve(t=>original.sourceCurve.getPoint(original.breakT+(1-original.breakT)*t));
    const remainder=createAirflowVisual(root,{curve,kind:'upper',h:original.h,lon:0,color:0xffb52e,endColor:0x2586ff,thermalProgress:singleThermalProgress,thermalPalette:model.thermalColors,cells:{single:kinds},ribbonWidth:()=>.34,streamline:true});
    remainder.index=1;remainder.obsolete=true;remainder.group.visible=false;model.obsoleteUppers.push(remainder);
  }
  for(const h of [1,-1]){
    const flows=model.flows.filter(f=>f.h===h),lengths=flows.map(f=>f.curve.getLength()),arrows=[];
    for(let i=0;i<6;i++){
      const helper=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.34,0xffb52e,.20,.16);
      for(const part of [helper.line,helper.cone]){part.material.transparent=true;part.material.opacity=.95;part.material.depthWrite=false;}root.add(helper);arrows.push({helper,t:0});
    }
    model.loops.push({h,flows,lengths,total:lengths.reduce((a,b)=>a+b,0),arrows});
  }
  const layer=document.createElement('div');layer.id='single-annotations';document.body.append(layer);model.layer=layer;
  const titles=['受热上升','高空：赤道 → 两极','极地高空：冷却堆积 → 下沉','近地面：两极 → 赤道'];
  const details=['赤道受热较多，空气膨胀上升，到达高空后向两侧流出。近地面空气减少，形成赤道低气压区。','不考虑地球自转时，高空气流在同一高度气压差作用下由赤道流向两极，沿经线运动，不发生向东或向西的偏转。','极地空气冷却，密度增大并下沉，向近地面补充空气，形成极地高气压区。','近地面空气在同一高度气压差作用下由极地高压流向赤道低压。与赤道上升、高空输送和极地下沉连接成闭合的热力环流。'];
  for(const flow of model.flows){
    const el=document.createElement('div'),marker=document.createElement('button'),label=document.createElement('button');el.className='sequence-note'+(flow.index===0?' single-rise-note':'');marker.className='sequence-note-marker';label.className='sequence-note-label';
    marker.textContent=['↑','→','↓','←'][flow.index];marker.title=(flow.h===1?'北半球':'南半球')+' · '+titles[flow.index];marker.setAttribute('aria-label',marker.title);label.textContent=titles[flow.index];
    const color=singleThermalColor(flow.curve.getPoint(.5));el.style.setProperty('--note-color','#'+color.getHexString());el.append(marker,label);layer.append(el);
    const note={el,marker,label,flow,title:titles[flow.index],detail:details[flow.index],annotationAbove:flow.index===0};marker.onclick=label.onclick=()=>pauseSingleExplanation(note);marker.onpointerenter=marker.onfocus=()=>{model.hoveredNote=note;};marker.onpointerleave=marker.onblur=()=>{if(model.hoveredNote===note)model.hoveredNote=null;};model.notes.push(note);
  }
  for(const [lat,color,index,name] of [[0,0xffd447,0,'赤道低气压带 ↑'],[86,0xb986ff,2,'极地高气压带 ↓'],[-86,0xb986ff,2,'极地高气压带 ↓']]){
    const width=lat===0?5:8,min=lat-width/2,max=lat+width/2;
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(CONFIG.earth.radius+.12,160,8,0,Math.PI*2,degToRad(90-max),degToRad(max-min)),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));root.add(mesh);
    const word=document.createElement('div');word.className='sequence-label sequence-pressure-label';word.textContent=name;word.style.color='#'+color.toString(16);word.style.borderColor=word.style.color;layer.append(word);model.bands.push({mesh,word,index,lat});
  }
  createSingleAscentEffects();createSinglePressureWaves();createSinglePolarEffects();
  const dialog=document.createElement('dialog');dialog.id='single-explanation';dialog.setAttribute('aria-labelledby','single-explanation-title');dialog.innerHTML='<small>理想单圈环流 · 不考虑地球自转</small><h3 id="single-explanation-title"></h3><p id="single-explanation-text"></p><small>暂停时可拖动地球或缩放，气流保持静止。</small><div class="sequence-dialog-actions"><button class="btn" id="single-explanation-close">保持暂停</button><button class="btn" id="single-explanation-continue">继续播放</button></div>';document.body.append(dialog);
  document.getElementById('single-explanation-close').onclick=()=>dialog.close();document.getElementById('single-explanation-continue').onclick=()=>{dialog.close();playSingleDemo();};
  controls.addEventListener('start',()=>{if(STATE.step===0){model.freeView=true;releaseSingleCamera(true);}});
  controls.addEventListener('end',()=>{if(STATE.step===0)flushSingleOrbitDamping();});
  window.__singleCirculationDebug={model,update:renderSingleCirculation,reveal:singleCirculationReveal,seek:seekSingleCirculation};
}
function singleStageProgress(index,reveal=singleCirculationReveal()){
  const stage=SINGLE_FLOW_STAGES[index];
  if(index===0)return smoothstep(clamp((STATE.singleDemo.elapsed-SINGLE_ASCENT_BEGIN)/(stage.until-SINGLE_ASCENT_BEGIN),0,1));
  return clamp((reveal-stage.start)/(stage.end-stage.start),0,1);
}
function createSingleAscentEffects(){
  const model=SINGLE_CIRCULATION,high=CIRCULATION_SEQUENCE.highAltitude,color=0xffb52e;
  const center=sequencePoint(0,0,high+.08),radial=center.clone().normalize(),east=new THREE.Vector3(0,0,-1),north=new THREE.Vector3(0,1,0),group=new THREE.Group();model.root.add(group);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(144*3),3));
  const particles=new THREE.Points(geometry,new THREE.PointsMaterial({color,size:.105,map:particleTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));particles.frustumCulled=false;group.add(particles);
  const puffs=[];for(let i=0;i<9;i++){
    const angle=i*2.39996,r=i===0?0:.375*Math.sqrt(i/9),offset=north.clone().multiplyScalar(Math.cos(angle)*r).addScaledVector(east,Math.sin(angle)*r*.65).addScaledVector(radial,Math.sin(i*1.7)*.05);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:particleTexture,color,transparent:true,opacity:0,depthWrite:false}));group.add(sprite);puffs.push({sprite,offset});
  }
  model.equatorAir={group,center,radial,east,north,particles,puffs};
  // Warm a curved patch of atmosphere, spreading north/south and east/west.
  // Include Earth's radius: the old band and ring were hidden inside the globe.
  {
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{uHeat:{value:0},uSpread:{value:.2},uOpacity:{value:.44}},
      vertexShader:'varying vec3 vLocal;void main(){vLocal=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`varying vec3 vLocal;uniform float uHeat;uniform float uSpread;uniform float uOpacity;
        void main(){vec3 p=normalize(vLocal);float lat=asin(clamp(p.y,-1.0,1.0)),lon=atan(p.z,p.x);
        float d=length(vec2(lat/.46,lon/.64))/uSpread;float feather=1.0-smoothstep(.18,1.0,d);
        gl_FragColor=vec4(mix(vec3(1.0,.34,.04),vec3(1.0,.73,.16),feather),feather*feather*uOpacity*uHeat);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        }`});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(CONFIG.earth.radius+2.06,96,64),material);model.root.add(mesh);model.heatZone={outer:mesh};
  }
  for(const lat of [-.75,.75]){
    const curve=new SequenceCurve(t=>sequencePoint(lat,0,.14+(high-.14)*t)),group=new THREE.Group();model.root.add(group);
    const geometry=new THREE.TubeGeometry(curve,80,.058,10,false),material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){float edge=.4+.6*pow(abs(cos(vUv.y*6.2831853)),2.0);gl_FragColor=vec4(uColor,uOpacity*edge);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'});
    const beam=new THREE.Mesh(geometry,material);group.add(beam);const arrows=[];
    for(let i=0;i<4;i++){const helper=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.16,color,.09,.072);for(const part of [helper.line,helper.cone]){part.material.transparent=true;part.material.opacity=.92;part.material.depthWrite=false;}group.add(helper);arrows.push({helper,t:0});}
    model.columns.push({curve,group,beam,arrows});
  }
}
function createSinglePressureWaves(){
  const model=SINGLE_CIRCULATION;
  for(const [lat,index,high,color,title] of [[0,0,false,0xffd447,'赤道低压'],[90,2,true,0xb986ff,'极地高压'],[-90,2,true,0xb986ff,'极地高压']]){
    const center=sequencePoint(lat,0,.16),radial=center.clone().normalize(),east=new THREE.Vector3(0,0,-1),north=radial.clone().cross(east).normalize(),radius=.9,geometry=new THREE.CircleGeometry(1,96),positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++){const point=center.clone().addScaledVector(east,positions.getX(i)*radius).addScaledVector(north,positions.getY(i)*radius).setLength(center.length());positions.setXYZ(i,point.x,point.y,point.z);}geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{uColor:{value:new THREE.Color(color)},uRadii:{value:[0,0,0,0]},uAlpha:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 vUv;uniform vec3 uColor;uniform float uRadii[4];uniform float uAlpha;void main(){float r=length((vUv-.5)*2.0),rings=0.0;for(int i=0;i<4;i++){float wave=uRadii[i];float edge=1.0-smoothstep(.005,.017,abs(r-wave));float fade=smoothstep(.10,.22,wave)*(1.0-smoothstep(.84,1.0,wave));rings=max(rings,edge*fade);}gl_FragColor=vec4(mix(uColor,vec3(1.0),.22),rings*uAlpha);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'});
    const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=6;mesh.visible=false;model.root.add(mesh);
    const word=document.createElement('div');word.className='sequence-pressure-wave-word';word.textContent=title;word.dataset.pressure=high?'high':'low';word.hidden=true;model.layer.append(word);model.pressureWaves.push({lat,index,high,center,mesh,word,phases:[]});
  }
}
function createSinglePolarEffects(){
  const model=SINGLE_CIRCULATION,color=0x79bfff,east=new THREE.Vector3(0,0,1);
  for(const h of [1,-1]){
    const flow=model.flows.find(f=>f.h===h&&f.kind==='sink'),center=flow.sourceCurve.getPoint(0),radial=center.clone().normalize(),across=east.clone().cross(radial).normalize(),group=new THREE.Group();model.root.add(group);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(72*3),3));
    const particles=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xb3dfff,size:.075,map:particleTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));particles.frustumCulled=false;group.add(particles);
    const puffs=[];
    for(let i=0;i<7;i++){
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:particleTexture,color:0xa5d8f6,transparent:true,opacity:0,depthWrite:false}));group.add(sprite);puffs.push(sprite);
    }
    model.polarAccumulations.push({h,group,center,radial,across,east,particles,puffs});
    for(const offset of [-.30,0,.30]){
      const curve=new SequenceCurve(t=>flow.sourceCurve.getPoint(t).addScaledVector(east,offset)),columnGroup=new THREE.Group();model.root.add(columnGroup);
      const beamGeometry=new THREE.TubeGeometry(curve,80,.12,10,false),material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
        uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:'varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){float edge=.35+.65*pow(abs(cos(vUv.y*6.2831853)),2.0);gl_FragColor=vec4(uColor,uOpacity*edge);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'});
      const beam=new THREE.Mesh(beamGeometry,material);columnGroup.add(beam);
      const arrows=[];for(let i=0;i<3;i++){
        const helper=new THREE.ArrowHelper(new THREE.Vector3(0,-h,0),new THREE.Vector3(),.23,0xc6eaff,.15,.14);
        for(const part of [helper.line,helper.cone]){part.material.transparent=true;part.material.depthWrite=false;}columnGroup.add(helper);arrows.push({helper,t:0});
      }
      const streamGeometry=new THREE.BufferGeometry();streamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(24*3),3));
      const stream=new THREE.Points(streamGeometry,new THREE.PointsMaterial({color:0xc6eaff,size:.065,map:particleTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));stream.frustumCulled=false;columnGroup.add(stream);
      const parcels=[];for(let i=0;i<2;i++){
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:particleTexture,color:0xa5d8f6,transparent:true,opacity:0,depthWrite:false}));sprite.scale.set(.42,.32,1);columnGroup.add(sprite);parcels.push(sprite);
      }
      model.descentColumns.push({h,offset,curve,group:columnGroup,beam,arrows,particles:stream,parcels});
    }
  }
}
function updateSinglePolarEffects(reveal,opacity){
  const model=SINGLE_CIRCULATION,time=model.motionTime,build=smoothstep(clamp((singleStageProgress(1,reveal)-.65)/.35,0,1)),descent=singleStageProgress(2,reveal),strength=build*(1-.25*descent)*opacity;
  for(const cloud of model.polarAccumulations){
    cloud.group.visible=STATE.showParticles&&strength>0;
    const points=cloud.particles.geometry.attributes.position;
    cloud.particles.geometry.setDrawRange(0,Math.round((STATE.lowPerf?24:72)*build));cloud.particles.material.opacity=.42*strength;
    for(let i=0;i<points.count;i++){
      const angle=i*2.39996,r=(1.15-.45*build)*Math.sqrt((i+.5)/points.count),pulse=.018*Math.sin(time*1.3+i),point=cloud.center.clone().addScaledVector(cloud.across,Math.cos(angle)*(r+pulse)).addScaledVector(cloud.east,Math.sin(angle)*r*.72).addScaledVector(cloud.radial,.14*Math.sin(i*1.37));points.setXYZ(i,point.x,point.y,point.z);
    }points.needsUpdate=true;
    cloud.puffs.forEach((sprite,i)=>{
      const angle=i*2.39996,r=i===0?0:.5*Math.sqrt(i/7)*(1.4-.4*build),size=.8+.5*build;
      sprite.position.copy(cloud.center).addScaledVector(cloud.across,Math.cos(angle)*r).addScaledVector(cloud.east,Math.sin(angle)*r*.72).addScaledVector(cloud.radial,.08*Math.sin(i*1.7));sprite.scale.set((i===0?1.6:1.05)*size,(i===0?.65:.5)*size,1);sprite.material.opacity=(i===0?.6:.45)*strength;
    });
  }
  for(const column of model.descentColumns){
    const visible=descent>0&&opacity>.001&&(!STATE.lowPerf||column.offset===0);column.group.visible=visible&&(STATE.showPaths||STATE.showParticles);column.beam.visible=STATE.showPaths;column.beam.geometry.setDrawRange(0,Math.floor(descent*80)*10*6);column.beam.material.uniforms.uOpacity.value=.16*opacity;
    const start=SINGLE_FLOW_STAGES[1].until;
    column.arrows.forEach((arrow,i)=>{
      const t=(((time-start)*.28+i/3)%1+1)%1,direction=column.curve.getTangent(t);arrow.t=t;arrow.helper.visible=visible&&STATE.showPaths&&t>.08&&t<Math.min(.92,descent-.03);arrow.helper.position.copy(column.curve.getPoint(t)).addScaledVector(direction,-.115);arrow.helper.setDirection(direction);
      for(const part of [arrow.helper.line,arrow.helper.cone])part.material.opacity=.9*opacity;
    });
    const positions=column.particles.geometry.attributes.position,indices=[];
    for(let i=0;i<positions.count;i++){
      const t=(((time-start)*.28+i/positions.count)%1+1)%1,point=column.curve.getPoint(t);positions.setXYZ(i,point.x,point.y,point.z);if(t<=descent)indices.push(i);
    }positions.needsUpdate=true;column.particles.geometry.setIndex(indices);column.particles.geometry.setDrawRange(0,indices.length);column.particles.visible=STATE.showParticles;column.particles.material.opacity=.45*opacity;
    column.parcels.forEach((sprite,i)=>{const t=(((time-start)*.28+i/2+.1)%1+1)%1;sprite.visible=visible&&STATE.showParticles&&t<descent;sprite.position.copy(column.curve.getPoint(t));sprite.material.opacity=.65*opacity*smoothstep(clamp(t/.12,0,1))*(1-smoothstep(clamp((t-.83)/.17,0,1)));});
  }
}
function updateSingleAscentEffects(reveal){
  if(STATE.step!==0){
    // Step two owns the completed equatorial effects from its opening frame.
    const model=SINGLE_CIRCULATION;
    model.equatorAir.group.visible=false;model.columns.forEach(column=>column.group.visible=false);
    Object.values(model.heatZone).forEach(mesh=>mesh.visible=false);
    model.pressureWaves.forEach(wave=>{wave.mesh.visible=false;wave.word.hidden=true;});
    return;
  }
  const model=SINGLE_CIRCULATION,elapsed=STATE.singleDemo.elapsed,shown=singleNodeRevealed(),heat=(shown?smoothstep(clamp((elapsed-SINGLE_SOLAR_ARRIVAL)/(SINGLE_EQUATOR_HEAT_END-SINGLE_SOLAR_ARRIVAL),0,1)):0),p=singleStageProgress(0,reveal),strength=smoothstep(clamp((p-.12)/.88,0,1)),cloud=model.equatorAir,time=model.motionTime;
  for(const mesh of Object.values(model.heatZone)){mesh.visible=(STATE.showPaths||STATE.showParticles)&&heat>0;mesh.material.uniforms.uHeat.value=heat;mesh.material.uniforms.uSpread.value=.22+.78*Math.sqrt(heat);}
  // The warm air mass travels upward with the newly revealed ascent before collecting aloft.
  cloud.center.copy(sequencePoint(0,0,.22+(CIRCULATION_SEQUENCE.highAltitude-.14)*p));cloud.group.visible=STATE.showParticles&&strength>0;
  const points=cloud.particles.geometry.attributes.position;cloud.particles.geometry.setDrawRange(0,STATE.lowPerf?36:144);cloud.particles.material.opacity=.28*strength;
  for(let i=0;i<points.count;i++){const angle=i*2.39996,r=.51*1.5*Math.sqrt((i+.5)/points.count)*(1+.25*p),pulse=.018*Math.sin(time*1.3+i*.8),point=cloud.center.clone().addScaledVector(cloud.north,Math.cos(angle)*(r+pulse)).addScaledVector(cloud.east,Math.sin(angle)*r*.62).addScaledVector(cloud.radial,Math.sin(i*1.37)*.105);points.setXYZ(i,point.x,point.y,point.z);}points.needsUpdate=true;
  cloud.puffs.forEach(({sprite,offset},i)=>{const size=1.5*(1+.2*p);sprite.position.copy(cloud.center).addScaledVector(offset,1.5*(1+.25*p));sprite.scale.set((i===0?1.05:.45+.09*Math.sin(i*1.9))*size,(i===0?.57:.33)*size,1);sprite.material.opacity=(i===0?.45:.36)*strength;});
  for(const column of model.columns){column.group.visible=STATE.showPaths&&p>0;column.beam.geometry.setDrawRange(0,Math.floor(p*80)*10*6);column.beam.material.uniforms.uOpacity.value=.19;
    column.arrows.forEach((arrow,i)=>{const t=(time*.32+i/4)%1,direction=column.curve.getTangent(t);arrow.t=t;arrow.helper.visible=column.group.visible&&t>.045&&t<Math.min(.96,p-.03);arrow.helper.position.copy(column.curve.getPoint(t)).addScaledVector(direction,-.08);arrow.helper.setDirection(direction);});
  }
  for(const wave of model.pressureWaves){const progress=smoothstep(singleStageProgress(wave.index,reveal));wave.mesh.visible=STATE.showPressure&&progress>0;wave.mesh.material.uniforms.uAlpha.value=.85*progress;
    const start=wave.index?SINGLE_FLOW_STAGES[wave.index-1].until:0;wave.phases=Array.from({length:4},(_,i)=>(((time-start)*.30+i/4)%1+1)%1);wave.mesh.material.uniforms.uRadii.value=wave.phases.map(t=>.12+.88*(wave.high?t:1-t));if(!wave.mesh.visible)wave.word.hidden=true;
  }
}
function releaseSingleCamera(keepPose=false){
  const model=SINGLE_CIRCULATION,saved=model.cameraSaved;if(!saved)return;
  if(!keepPose){camera.position.copy(saved.position);camera.up.copy(saved.up);camera.quaternion.copy(saved.quaternion);controls.target.copy(saved.target);if(saved.width!==innerWidth||saved.height!==innerHeight)camera.position.copy(saved.target).addScaledVector(saved.position.clone().sub(saved.target).normalize(),getSceneFraming().distance);camera.updateMatrixWorld(true);}
  flushSingleOrbitDamping();
  model.cameraActive=false;model.cameraSaved=null;
}
function flushSingleOrbitDamping(){
  const position=camera.position.clone(),rotation=camera.quaternion.clone(),up=camera.up.clone(),target=controls.target.clone(),damping=controls.enableDamping;
  controls.enableDamping=false;controls.update();controls.enableDamping=damping;camera.position.copy(position);camera.quaternion.copy(rotation);camera.up.copy(up);controls.target.copy(target);camera.updateMatrixWorld(true);
}
function updateSingleAscentCamera(){
  const model=SINGLE_CIRCULATION;if(STATE.step!==0||model.freeView||model.cameraSuppressed)return;
  if(!CLASSROOM.autoFocus){releaseSingleCamera();return;}
  const time=STATE.singleDemo.elapsed,riseEnd=SINGLE_FLOW_STAGES[0].until,polarStart=SINGLE_FLOW_STAGES[1].until-1.5,polarEnd=SINGLE_FLOW_STAGES[2].until,polarWeight=smoothstep(clamp((time-polarStart)/1.1,0,1))*(1-smoothstep(clamp((time-polarEnd)/1.7,0,1))),ascentWeight=smoothstep(clamp((time-SINGLE_ASCENT_BEGIN)/(riseEnd-SINGLE_ASCENT_BEGIN),0,1))*(1-smoothstep(clamp((time-riseEnd)/1.7,0,1))),weight=Math.max(ascentWeight,polarWeight);
  if(STATE.viewLocked)return;
  if(weight<=0){releaseSingleCamera();return;}
  if(!model.cameraSaved){
    CLASSROOM.focusAnimation++;viewAnimation++;
    flushSingleOrbitDamping();
    const framing=getSceneFraming();model.cameraSaved={position:camera.position.clone(),target:controls.target.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),rotation:model.root.rotation.y,width:innerWidth,height:innerHeight,distance:framing.distance};
  }
  const saved=model.cameraSaved,framing=getSceneFraming();model.cameraActive=true;model.root.rotation.y=saved.rotation;model.root.updateMatrixWorld(true);
  const focus=model.root.localToWorld(polarWeight>0?sequencePoint(89,0,.8):sequencePoint(0,0,.78)),radial=focus.clone().sub(model.root.position).normalize(),direction=saved.position.clone().sub(saved.target).normalize().addScaledVector(radial,polarWeight>0?.15:.45).normalize();
  const compactPolar=polarWeight>0&&innerWidth<=600,tangent=Math.tan(degToRad(camera.fov/2))*Math.min(framing.availableW,framing.availableH)/framing.h,distance=Math.max(7,(compactPolar?1.15:1.8)/Math.sin(Math.atan(tangent)),framing.distance*(compactPolar?.25:.42)),eye=focus.clone().addScaledVector(direction,distance);
  const overview=saved.position.clone();if(saved.width!==innerWidth||saved.height!==innerHeight)overview.copy(saved.target).addScaledVector(saved.position.clone().sub(saved.target).normalize(),framing.distance);
  camera.position.lerpVectors(overview,eye,weight);controls.target.lerpVectors(saved.target,focus,weight);camera.up.copy(saved.up);camera.lookAt(controls.target);camera.updateMatrixWorld(true);
}
function singleCirculationReveal(){
  const d=STATE.singleDemo,index=getSingleDemoPhase().index,stage=SINGLE_FLOW_STAGES[index],start=index?SINGLE_FLOW_STAGES[index-1].until:0;
  if(d.complete)return 1;
  if(d.answerShown)return stage.end;
  const p=clamp((d.elapsed-start)/(stage.until-start),0,1);return stage.start+(stage.end-stage.start)*p;
}
function seekSingleCirculation(time){
  const e=clamp(time,0,SINGLE_DEMO_DURATION),index=e===SINGLE_DEMO_DURATION?3:SINGLE_FLOW_STAGES.findIndex(s=>e<s.until);
  SINGLE_CIRCULATION.annotationEpoch=(SINGLE_CIRCULATION.annotationEpoch||0)+1;
  STATE.singleDemo={elapsed:e,node:index,running:false,complete:e===SINGLE_DEMO_DURATION,answerShown:false};STATE.playing=false;SINGLE_CIRCULATION.ambientElapsed=0;SINGLE_CIRCULATION.motionTime=e;SINGLE_CIRCULATION.cameraSuppressed=false;updateSingleDemoUI();
}
function mountSingleVisualControls(panel){
  panel.insertAdjacentHTML('afterbegin','<div class="sequence-cell-key single-cell-key"><span title="暖色在赤道，冷色在极地；颜色为教学示意"><i></i>赤道暖 → 两极冷</span></div>');
  const progress=document.getElementById('single-demo-progress'),range=document.createElement('input');range.type='range';range.id=progress.id;range.className='sequence-timeline';range.min=0;range.max=SINGLE_DEMO_DURATION;range.step=.05;range.value=STATE.singleDemo.elapsed;range.setAttribute('aria-label','单圈形成过程进度');progress.replaceWith(range);range.oninput=e=>seekSingleCirculation(Number(e.target.value));
  range.insertAdjacentHTML('beforebegin','<div class="sequence-stages single-stages">'+['赤道区域','高空输送','极地区域','地面回流'].map((title,i)=>`<button type="button" data-single-stage="${i}">${i+1} · ${title}</button>`).join('')+'</div>');
  range.insertAdjacentHTML('afterend',`<div class="sequence-time"><span id="single-time"></span><span>${SINGLE_DEMO_DURATION} 秒</span></div>`);
  panel.querySelectorAll('[data-single-stage]').forEach(button=>button.onclick=()=>chooseDemoNode('single',Number(button.dataset.singleStage)));
}
function finishSingleVisualPanel(body){
  const prediction=body.querySelector('.prediction-record');
  prediction?.remove();
  const explain=document.createElement('button');explain.id='single-explain';explain.className='btn';explain.textContent='暂停并解释';explain.onclick=pauseSingleExplanation;document.getElementById('step-node-dock').append(explain);
  const next=document.createElement('button');next.id='single-demo-next-step';next.type='button';next.className='btn';next.textContent='下一步：三圈推导';next.setAttribute('aria-label','进入下一步：三圈环流推导');next.onclick=()=>{STATE.playing=false;transitionToStep(1);};document.getElementById('step-node-dock').append(next);
  updateSingleVisualUI();
}
function updateSingleVisualUI(){
  if(STATE.step!==0)return;const d=STATE.singleDemo,index=getSingleDemoPhase().index;
  const time=document.getElementById('single-time');if(time)time.textContent=`${d.elapsed.toFixed(1)} 秒${d.complete?(singleAmbientRunning()?' · 完成，持续流动':' · 完成，已暂停'):d.running&&STATE.playing?'':' · 已暂停'}`;
  document.querySelectorAll('[data-single-stage]').forEach(button=>button.setAttribute('aria-current',Number(button.dataset.singleStage)===index?'step':'false'));
  const next=document.getElementById('single-demo-next-step');if(next){next.disabled=!d.complete;next.title=d.complete?'进入第二步：地转偏向力介入':'完成第一步演示后进入第二步';}
  const explanation=document.getElementById('single-explanation-continue');if(explanation){explanation.disabled=false;explanation.textContent=d.complete?'继续流动':'继续播放';}
}
function pauseSingleExplanation(note=null){
  const d=STATE.singleDemo,index=getSingleDemoPhase().index;STATE.playing=false;d.running=false;
  const model=SINGLE_CIRCULATION;if(!model.root)createSingleCirculation();note=note?.flow?note:model.notes.find(n=>n.flow.h===1&&n.flow.index===index);
  document.getElementById('single-explanation-title').textContent=note.title;document.getElementById('single-explanation-text').textContent=note.detail;
  const dialog=document.getElementById('single-explanation');if(!dialog.open)dialog.show();updateSingleDemoUI();
}
function secondStepSingleVisible(){
  return STATE.step===1 && typeof CIRCULATION_SEQUENCE!=='undefined' && sequenceElapsed()<CIRCULATION_SEQUENCE.secondStepBlendDuration;
}
function singleTransitionCurve(flow,progress){
  if(flow.index>1)return flow.sourceCurve;
  if(!flow.transitionTarget){
    const sequence=CIRCULATION_SEQUENCE,find=kind=>sequence.flows.find(f=>f.h===flow.h&&f.kind===kind).curve;
    flow.transitionTarget=find(flow.index===0?'equator-rise':'upper');
  }
  if(flow.transitionProgress===progress)return flow.transitionCurve;
  flow.transitionProgress=progress;
  const retained=flow.retainedCurve||flow.sourceCurve;
  return flow.transitionCurve=new SequenceCurve(t=>{
    const source=retained.getPoint(t),target=flow.transitionTarget.getPoint(t),radius=lerp(source.length(),target.length(),progress);
    return source.lerp(target,progress).normalize().multiplyScalar(radius);
  });
}
function syncSingleCirculation(){
  const model=SINGLE_CIRCULATION,active=STATE.step===0||secondStepSingleVisible();document.body.classList.toggle('single-circulation-active',active);
  if(model.morphing&&(STATE.step===0||!active)&&model.flows.length){model.flows.forEach(flow=>updateSequenceFlowGeometry(flow,flow.sourceCurve));model.morphing=false;}
  if(!active){releaseSingleCamera();if(model.root)model.root.visible=false;if(model.layer)model.layer.hidden=true;document.getElementById('single-explanation')?.close();}
  if(STATE.step!==1)model.obsoleteUppers.forEach(flow=>flow.group.visible=false);
  if(model.styled&&!active){(earthGroup.userData.sequenceAtmosphere||[]).forEach((m,i)=>m.visible=STATE.step===1?false:model.atmosphereVisible[i]);model.styled=false;}
  if(active&&!model.styled){const meshes=earthGroup.userData.sequenceAtmosphere||[];model.atmosphereVisible=meshes.map(m=>m.visible);meshes.forEach(m=>m.visible=false);model.styled=true;model.freeView=false;model.cameraSuppressed=false;model.motionTime=0;}
}
function renderSingleCirculation(dt=0){
  syncSingleCirculation();const transitioning=STATE.step===1&&typeof CIRCULATION_SEQUENCE!=='undefined';if(STATE.step!==0&&(!transitioning||!secondStepSingleVisible()))return;const model=SINGLE_CIRCULATION;if(!model.root)createSingleCirculation();
  const d=STATE.singleDemo,elapsed=transitioning?sequenceElapsed():0,reveal=transitioning?1:singleCirculationReveal(),transitionProgress=transitioning?smoothstep(clamp(elapsed/CIRCULATION_SEQUENCE.secondStepBlendDuration,0,1)):0,transitionOpacity=transitioning?1-transitionProgress:1;
  model.motionTime=transitioning?elapsed+CIRCULATION_SEQUENCE.ambientElapsed:d.elapsed+model.ambientElapsed;
  model.root.visible=!transitioning||secondStepSingleVisible();model.atmosphere.visible=model.root.visible&&!transitioning;singleCellGroup.visible=false;
  if(transitioning)model.root.rotation.copy(CIRCULATION_SEQUENCE.root.rotation);
  else if(!model.freeView&&!model.cameraActive){const az=Math.atan2(camera.position.z,camera.position.x-SCENE_OFFSET_X);model.root.rotation.y=-(az+degToRad(80));}
  model.root.updateMatrixWorld(true);
  updateSingleAscentCamera();updateSingleAscentEffects(reveal);updateSinglePolarEffects(reveal,transitioning?1-smoothstep(clamp(elapsed/7,0,1)):1);
  latLabels.forEach(l=>l.obj.visible=false);verticalLabels.forEach(l=>l.obj.visible=false);
  for(const flow of [...model.flows,...model.obsoleteUppers]){
    if(flow.obsolete&&!transitioning){flow.group.visible=false;continue;}
    if(transitioning&&!flow.obsolete&&flow.index<2){
      const curve=singleTransitionCurve(flow,transitionProgress);
      if(flow.curve!==curve)updateSequenceFlowGeometry(flow,curve,(kind,point)=>lerp(singleThermalProgress(kind,point),clamp((Math.abs(Math.asin(point.y/point.length())*180/Math.PI)-2.5)/25.5,0,1)/3,transitionProgress));
      model.morphing=true;
    }
    // Turning and opening the break share the same clock from the first frame.
    const opacity=transitioning?(flow.index<2&&!flow.obsolete?(flow.h===-1?1-.25*transitionProgress:1):1-smoothstep(clamp(elapsed/7,0,1))):1;
    flow.transitionOpacity=opacity;
    flow.visibleStart=flow.obsolete ? .055*smoothstep(clamp(elapsed/2,0,1)) : 0;
    // Step two starts from the completed single cell. Do not reuse the
    // first-step ascent clock here, because that clock is reset on entry and
    // would hide the equatorial leg at the handoff frame.
    const p=transitioning?1:flow.index===0?singleStageProgress(0,reveal):clamp((reveal-flow.start)/(flow.end-flow.start),0,1);flow.progress=p;flow.group.visible=p>0&&opacity>.001&&(STATE.showPaths||STATE.showParticles);
    const firstSegment=Math.ceil(flow.visibleStart*100),segments=Math.max(0,Math.floor(p*100)-firstSegment);
    flow.ribbon.visible=STATE.showPaths&&!STATE.lowPerf;flow.ribbon.geometry.setDrawRange(firstSegment*8*6,segments*8*6);flow.ribbon.material.uniforms.uTime.value=model.motionTime;flow.ribbon.material.uniforms.uOpacity.value=.32*opacity;flow.ribbon.material.uniforms.uWidth.value=2;
    flow.tubes[0].visible=STATE.showPaths;flow.tubes[0].material.opacity=.95*opacity;flow.tubes[0].geometry.setDrawRange(firstSegment*4*6,segments*4*6);
    flow.particles.visible=STATE.showParticles;flow.particles.material.opacity=.24*opacity;const positions=flow.particles.geometry.attributes.position,colors=flow.particles.geometry.attributes.color,density=STATE.density==='sparse'?.45:STATE.density==='dense'?1:.75,count=Math.max(5,Math.floor(positions.count*density*(STATE.lowPerf?.4:1)));flow.particles.geometry.setDrawRange(0,count);
    for(let i=0;i<count;i++){const t=((model.motionTime*.14+i/count)%1),point=flow.curve.getPoint(t),color=singleThermalColor(point);positions.setXYZ(i,point.x,point.y,point.z);colors.setXYZ(i,color.r,color.g,color.b);}
    // Fixed particle positions avoid a backward jump when a path grows.
    const indices=[];for(let i=0;i<count;i++){const t=(model.motionTime*.14+i/count)%1;if(t>=flow.visibleStart&&t<=p)indices.push(i);}flow.particles.geometry.setIndex(indices);flow.particles.geometry.setDrawRange(0,indices.length);positions.needsUpdate=true;colors.needsUpdate=true;
  }
  for(const loop of model.loops){
    const flows=transitioning?[...loop.flows.slice(0,2),model.obsoleteUppers.find(f=>f.h===loop.h),...loop.flows.slice(2)]:loop.flows;
    loop.lengths=flows.map(f=>f.curve.getLength());loop.total=loop.lengths.reduce((sum,length)=>sum+length,0);
    for(const [i,arrow] of loop.arrows.entries()){
    let distance=(model.motionTime*.8+i/loop.arrows.length*loop.total)%loop.total,index=0;arrow.distance=distance;while(index<flows.length-1&&distance>=loop.lengths[index])distance-=loop.lengths[index++];
    const flow=flows[index],t=flow.curve.getUtoTmapping(0,distance),point=flow.curve.getPoint(t),direction=flow.curve.getTangent(t);arrow.t=t;arrow.flow=flow;
    arrow.helper.visible=flow.group.visible&&STATE.showPaths&&flow.progress>0&&t>=flow.visibleStart&&t<=flow.progress&&flow.transitionOpacity>.01&&(!STATE.lowPerf||i%2===0);arrow.helper.position.copy(point).addScaledVector(direction,-.34);arrow.helper.setDirection(direction);arrow.helper.setColor(singleThermalColor(point));for(const part of [arrow.helper.line,arrow.helper.cone])part.material.opacity=.95*flow.transitionOpacity;
  }}
  for(const cloud of model.clouds){const end=SINGLE_FLOW_STAGES[cloud.index].end,start=SINGLE_FLOW_STAGES[cloud.index].start,p=clamp((reveal-start)/(end-start),0,1);cloud.sprite.visible=STATE.showParticles&&p>0;cloud.sprite.material.opacity=.35*p;}
  for(const band of model.bands){const p=smoothstep(singleStageProgress(band.index,reveal));band.mesh.visible=STATE.showPressure&&p>0&&transitionOpacity>.01;band.mesh.material.opacity=.92*p*transitionOpacity;}
  document.body.classList.toggle('prediction-waiting',reveal===0);updateSingleVisualUI();
}
function updateSingleCirculationAnnotations(){
  const model=SINGLE_CIRCULATION;if(!model.layer)return;model.layer.hidden=STATE.step!==0||!STATE.showLabels||document.body.classList.contains('ui-hidden');if(model.layer.hidden)return;
  const framing=getSceneFraming(),left=framing.left+6,right=framing.left+framing.availableW-6,top=framing.top+12,bottom=framing.top+framing.availableH-8,occupied=[],obstacles=[];
  const bounds={left,right,top,bottom,key:[innerWidth,innerHeight,model.annotationEpoch||0].join(':')};
  const project=point=>{const world=model.root.localToWorld(point.clone()),ndc=world.clone().project(camera),direction=camera.position.clone().sub(world),offset=world.clone().sub(model.root.position),t=clamp(-offset.dot(direction)/direction.lengthSq(),0,1);return {x:(ndc.x+1)*innerWidth/2,y:(1-ndc.y)*innerHeight/2,visible:ndc.z>-1&&ndc.z<1&&offset.addScaledVector(direction,t).lengthSq()>=CONFIG.earth.radius**2};};
  if(model.equatorAir.group.visible){const cloud=model.equatorAir,points=[cloud.center,...[-1,1].flatMap(sign=>[cloud.center.clone().addScaledVector(cloud.north,.9*sign),cloud.center.clone().addScaledVector(cloud.east,.6*sign),cloud.center.clone().addScaledVector(cloud.radial,.5*sign)])].map(project);if(points.some(p=>p.visible))obstacles.push({left:Math.min(...points.map(p=>p.x))-8,right:Math.max(...points.map(p=>p.x))+8,top:Math.min(...points.map(p=>p.y))-8,bottom:Math.max(...points.map(p=>p.y))+8});}
  for(const cloud of model.polarAccumulations){
    if(!cloud.group.visible)continue;
    const points=[...[-1,1].flatMap(sign=>[cloud.center.clone().addScaledVector(cloud.across,1.1*sign),cloud.center.clone().addScaledVector(cloud.east,.8*sign),cloud.center.clone().addScaledVector(cloud.radial,.45*sign)]),model.flows.find(f=>f.h===cloud.h&&f.kind==='sink').curve.getPoint(1)].map(project);
    if(points.some(p=>p.visible))obstacles.push({left:Math.min(...points.map(p=>p.x))-16,right:Math.max(...points.map(p=>p.x))+16,top:Math.min(...points.map(p=>p.y))-12,bottom:Math.max(...points.map(p=>p.y))+12});
  }
  // Reserve the whole ascent, including its growing tip, so captions cannot cover it.
  for(const flow of model.flows.filter(f=>f.group.visible&&f.index===0)){
    let previous=null;for(let i=0;i<=40;i++){const point=project(flow.curve.getPoint(i/40));if(previous?.visible&&point.visible)obstacles.push({left:Math.min(previous.x,point.x)-12,right:Math.max(previous.x,point.x)+12,top:Math.min(previous.y,point.y)-12,bottom:Math.max(previous.y,point.y)+12});previous=point;}
  }
  for(const note of model.notes){const flow=note.flow,t=flow.index===0?.5:Math.min(.5,flow.progress),point=project(flow.curve.getPoint(t));note.el.hidden=(flow.index===0&&flow.h===-1)||!STATE.showPaths||flow.progress<=.02||!point.visible||point.x<left+10||point.x>right-10||point.y<top+10||point.y>bottom-10;if(note.el.hidden)continue;
    const active=!STATE.singleDemo.complete&&flow.index===getSingleDemoPhase().index;note.el.classList.toggle('is-current',active);note.el.style.left=point.x+'px';note.el.style.top=point.y+'px';note.marker.style.left=(flow.index===2?'-44px':'-15px');note.marker.style.top='0px';note.label.hidden=!(active||model.hoveredNote===note);if(!note.label.hidden){const position=placeAnchoredSceneLabel(note,note.label,point,bounds,occupied,obstacles,false,true);
      note.label.hidden=!position;if(position){note.label.style.left=position.left-point.x+'px';note.label.style.top=position.top-point.y+'px';}}
  }
  for(const wave of model.pressureWaves){const point=project(wave.center);wave.word.hidden=!wave.mesh.visible||!point.visible;if(wave.word.hidden)continue;const position=placeAnchoredSceneLabel(wave,wave.word,point,bounds,occupied,obstacles);wave.word.hidden=!position;if(position){wave.word.style.left=position.left+'px';wave.word.style.top=position.top+'px';wave.word.style.opacity=smoothstep(singleStageProgress(wave.index));}}
  model.bands.forEach(band=>band.word.hidden=true);
  const dialog=document.getElementById('single-explanation');if(innerWidth<=600){const panel=document.getElementById('step-panel').getBoundingClientRect(),control=document.getElementById('control-panel').getBoundingClientRect();dialog.style.setProperty('--explanation-top',panel.top+'px');dialog.style.setProperty('--explanation-height',Math.max(120,control.top-panel.top-12)+'px');}
}
