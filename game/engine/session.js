import {constructDistrict,sites} from './district.js';
import {automobile,pedestrian,alignActor,moveVehicle,fillStreets} from './population.js';
import {policeDispatch} from './dispatch.js';
import {createStory,JOB_COUNT,ranks,storyStashes} from './storyline.js';
import {makeSoundtrack} from './synth.js';
import {createOverlay} from './overlay.js';
import {gap,limit} from './geometry.js';
const T=window.THREE,query=new URLSearchParams(location.search),portrait=query.get('shot');
const painter=new T.WebGLRenderer({canvas:document.getElementById('cityview'),antialias:true,preserveDrawingBuffer:true});
painter.setPixelRatio(Math.min(devicePixelRatio,1.5));painter.setSize(innerWidth,innerHeight);painter.shadowMap.enabled=true;painter.shadowMap.type=T.PCFSoftShadowMap;painter.outputColorSpace=T.SRGBColorSpace;painter.toneMapping=T.ACESFilmicToneMapping;painter.toneMappingExposure=1.25;
const stage=new T.Scene();stage.background=new T.Color(0x9acbd0);stage.fog=new T.Fog(0xb5d4d0,125,480);
const lens=new T.PerspectiveCamera(58,innerWidth/innerHeight,.1,1000);
stage.add(new T.HemisphereLight(0xd3f0ed,0xd6ad80,1.6));
const sunlight=new T.DirectionalLight(0xffd4a1,2.8);sunlight.position.set(-90,150,90);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);Object.assign(sunlight.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:400});sunlight.shadow.bias=-.001;stage.add(sunlight,sunlight.target);
const district=constructDistrict(stage),population=fillStreets(stage),police=policeDispatch(stage,district),sound=makeSoundtrack(),overlay=createOverlay();
let saved=null;try{saved=portrait?null:JSON.parse(localStorage.getItem('solmar-attempt-five'));}catch{}
let cash=saved?.cash??0,ride=null,mode='title',time=0,shootWait=0,arrestResult=null,angle=0,autoSave=0,completed=false;
const person=pedestrian(stage,saved?.x??sites.start.x,saved?.z??sites.start.z);person.hp=100;
const comet=automobile(stage,saved?.carX??sites.comet.x,saved?.carZ??sites.comet.z);comet.angle=Math.PI/2;alignActor(comet);
const stagedStory=portrait?({cover:{job:8},street:{job:10},chase:{job:11},mission:{job:11,phase:5,hold:6}}[portrait]??{job:8}):saved?.story;
const story=createStory(stagedStory,text=>{overlay.message(text);sound.tone(660,.25);},pay=>{
  cash+=pay;
  // Lena services the Comet at the safehouse between story arcs.
  if(story.job===7)comet.health=maxArmor();
},district.caches);
const weapons=[
  {name:'Pistol',delay:.25,range:75,damage:34,spread:[0]},
  {name:'Shotgun',delay:.85,range:26,damage:28,spread:[-.19,-.095,0,.095,.19]},
  {name:'SMG',delay:.085,range:58,damage:15,spread:[0]}
];
let slot=saved?.slot??0,ammo=[null,saved?.ammo?.[1]??12,saved?.ammo?.[2]??60],garageOpen=false;
const tracks=[
  {name:'Engine',key:'engine',prices:[1000,2500,5000],gates:[0,1,2]},
  {name:'Armor',key:'armor',prices:[800,2000,4000],gates:[0,0,3]},
  {name:'Handling',key:'handling',prices:[800,2000,4000],gates:[0,0,0]}
];
const upgrades={engine:0,armor:0,handling:0,...saved?.upgrades};
const maxArmor=()=>100+upgrades.armor*30;
const daylight=stage.background.clone(),haze=stage.fog.color.clone();
comet.health=maxArmor();completed=story.job===JOB_COUNT;
const atGarage=()=>ride===comet&&gap(person,sites.garage)<11;
const atShop=()=>!ride&&gap(person,sites.shop)<10;
const stock=[{label:'Shells +12',price:200,fill:()=>ammo[1]+=12},{label:'SMG +60',price:300,fill:()=>ammo[2]+=60},{label:'Health 100%',price:150,fill:()=>person.hp=100}];
let shopOpen=false;
if(saved?.riding)ride=comet;
police.raise(story.heat(),person);
const keys=new Set(),pulses=new Set();let pointer={x:0,y:0};
addEventListener('keydown',event=>{if(['Space','ArrowUp','ArrowDown'].includes(event.code))event.preventDefault();if(!keys.has(event.code))pulses.add(event.code);keys.add(event.code);});
addEventListener('keyup',event=>keys.delete(event.code));addEventListener('blur',()=>{keys.clear();if(mode==='playing')changeScreen('paused');});
addEventListener('mousemove',event=>{pointer.x=event.clientX/innerWidth*2-1;pointer.y=-(event.clientY/innerHeight)*2+1;});
addEventListener('mousedown',event=>{if(event.target.tagName==='CANVAS')keys.add('Fire');});addEventListener('mouseup',()=>keys.delete('Fire'));
addEventListener('resize',()=>{lens.aspect=innerWidth/innerHeight;lens.updateProjectionMatrix();painter.setSize(innerWidth,innerHeight);});
function changeScreen(next){mode=next;overlay.screen(mode,cash);}
function storeProgress(){if(portrait)return;try{localStorage.setItem('solmar-attempt-five',JSON.stringify({cash,x:person.x,z:person.z,carX:comet.x,carZ:comet.z,riding:ride===comet,story:story.snapshot(),caches:district.caches.map(c=>c.taken),upgrades,slot,ammo}));}catch{}}
if(saved?.caches)saved.caches.forEach((taken,i)=>{if(taken&&district.caches[i]){district.caches[i].taken=true;district.caches[i].mesh.visible=false;}});
function activate(){sound.initialize();if(mode==='busted'||mode==='wasted'){
  person.hp=100;const target=story.objective()??sites.garage,p=district.resolve({x:Math.round(target.x/60)*60,z:target.z+15},1.65);person.x=p.x;person.z=p.z;comet.x=p.x+4;comet.z=p.z;comet.health=maxArmor();alignActor(comet);ride=null;police.raise(story.heat(),person);
}changeScreen(completed&&mode==='title'?'complete':'playing');}
document.getElementById('resume').addEventListener('click',activate);
function switchSeat(){if(ride){ride.parked=true;ride.vx=ride.vz=0;const p=district.resolve({x:ride.x+3.7,z:ride.z},.5);person.x=p.x;person.z=p.z;ride=null;sound.tone(240);return;}
  const candidate=[comet,...population.cars,...police.units].filter(c=>c.health>0).sort((a,b)=>gap(a,person)-gap(b,person))[0];
  if(candidate&&gap(candidate,person)<7){ride=candidate;ride.parked=true;if(!ride.stolen){ride.stolen=true;police.raise(Math.max(1,police.stars),person);}overlay.message('WASD points the car down the avenue. Shift boosts. Space brakes.');sound.tone(300);}
}
const ray=new T.Raycaster();let tracer=null,tracerLife=0;
function discharge(){
  if(ammo[slot]===0){shootWait=.4;sound.tone(170,.04);overlay.message('Out of ammo · resupply at Solmar Supply');return;}
  if(slot)ammo[slot]--;
  const weapon=weapons[slot];
  sound.tone([95,60,130][slot],.1,.09);shootWait=weapon.delay;ray.setFromCamera(pointer,lens);
  const plane=new T.Plane(new T.Vector3(0,1,0),-1.2),aim=new T.Vector3();ray.ray.intersectPlane(plane,aim);
  let dx=aim.x-person.x,dz=aim.z-person.z,range=Math.hypot(dx,dz)||1;dx/=range;dz/=range;person.angle=Math.atan2(dx,dz);
  const start=new T.Vector3(person.x,1.4,person.z),points=[];
  if(tracer){stage.remove(tracer);tracer.geometry.dispose();tracer.material.dispose();}
  const targets=[...population.people,...police.officers,comet,...population.cars,...police.units];
  for(const spread of weapon.spread){
    const sx=Math.sin(person.angle+spread),sz=Math.cos(person.angle+spread);let nearest=weapon.range,victim=null;
    for(const entity of targets){if(entity.down||entity.health<=0)continue;const ox=entity.x-person.x,oz=entity.z-person.z,along=ox*sx+oz*sz,across=Math.abs(ox*sz-oz*sx);if(along>0&&along<nearest&&across<(entity.limbs?.8:2)){nearest=along;victim=entity;}}
    if(victim){if(victim.limbs){victim.hit=(victim.hit??0)+weapon.damage;if(victim.hit>=30){victim.down=true;victim.body.rotation.z=Math.PI/2;}}else{victim.health-=weapon.damage;if(victim.health<=0)victim.body.rotation.z=.2;}}
    points.push(start,new T.Vector3(person.x+sx*nearest,1.4,person.z+sz*nearest));
  }
  tracer=new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xffec9a}));stage.add(tracer);tracerLife=.09;police.raise(Math.min(5,police.stars+1),person);
}
function interactions(tap){
  if(!atGarage())garageOpen=false;
  if(!atShop())shopOpen=false;
  if(tap('KeyU')&&atGarage())garageOpen=!garageOpen;
  if(tap('KeyE')){if(atShop()&&!garageOpen)shopOpen=!shopOpen;else switchSeat();}
  if(tap('KeyQ')&&!garageOpen&&!shopOpen)slot=(slot+1)%weapons.length;
  for(let i=0;i<3;i++)if(tap('Digit'+(i+1))){
    if(garageOpen){
      const {name,key,prices,gates}=tracks[i],level=upgrades[key],price=prices[level];
      if(!price)overlay.message(name+' is fully upgraded.');
      else if(ranks.indexOf(story.respect)<gates[level])overlay.message(name+' requires '+ranks[gates[level]]+'.');
      else if(cash<price)overlay.message('Need $'+price.toLocaleString()+'.');
      else{cash-=price;upgrades[key]++;if(key==='armor')comet.health+=30;overlay.message(name+' upgraded to level '+upgrades[key]);storeProgress();}
    }else if(shopOpen){
      const item=stock[i];if(cash<item.price)overlay.message('Need $'+item.price+'.');
      else{cash-=item.price;item.fill();overlay.message('Solmar Supply · '+item.label);storeProgress();}
    }else slot=i;
  }
}
function servicePrompt(){
  if(atGarage())return garageOpen?'CRUZ CUSTOMS · '+tracks.map(({name,key,prices},i)=>`${i+1} ${name} ${upgrades[key]===3?'MAX':'$'+prices[upgrades[key]].toLocaleString()}`).join(' · '):'U · CRUZ CUSTOMS UPGRADES';
  if(atShop())return shopOpen?'SOLMAR SUPPLY · '+stock.map(({label,price},i)=>`${i+1} ${label} $${price}`).join(' · '):'E · SOLMAR SUPPLY';
  return '';
}
function cameraTick(dt){
  const offset=portrait==='street'?[1,5,15]:portrait==='mission'?[8,17,31]:portrait==='chase'?[10,15,31]:portrait?[18,22,39]:[0,19,26];
  const desired=new T.Vector3(person.x+offset[0],offset[1],person.z+offset[2]);
  if(portrait)lens.position.copy(desired);else lens.position.lerp(desired,1-Math.exp(-dt*7));
  lens.lookAt(person.x,portrait==='street'?3:portrait?9:1.5,person.z-(portrait?12:4));
  sunlight.position.set(person.x-70,110,person.z+60);sunlight.target.position.set(person.x,0,person.z);sunlight.target.updateMatrixWorld();
}
function update(dt){
  time+=dt;shootWait-=dt;const tap=code=>pulses.has(code);
  if(tap('KeyM'))sound.mute();
  if(tap('KeyR'))sound.cycle();
  if(tap('KeyN')&&mode==='title'){localStorage.removeItem('solmar-attempt-five');location.reload();}
  if(tap('Enter')&&mode!=='playing')activate();else if(tap('Escape'))changeScreen(mode==='playing'?'paused':'playing');
  if(mode==='playing'&&!portrait){
    interactions(tap);
    const dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    const boost=keys.has('ShiftLeft')||keys.has('ShiftRight');
    if(ride){moveVehicle(ride,dx,dz,dt,district,boost,keys.has('Space'),ride===comet?upgrades:undefined);person.x=ride.x;person.z=ride.z;person.angle=ride.angle;
      // Soft traffic impacts cost speed, without pushing either participant into buildings.
      for(const other of population.cars)if(other!==ride&&gap(ride,other)<3.3){ride.vx*=.97;ride.vz*=.97;}
      for(const block of police.blocks)if(gap(ride,block)<4){ride.vx*=.85;ride.vz*=.85;if(shootWait<=0){sound.tone(130,.12);shootWait=.25;}}
      if(ride.health<=0){switchSeat();overlay.message('Engine disabled. Find another car.');}
    }else{
      const size=Math.hypot(dx,dz)||1,speed=boost?10:6;const p=district.resolve({x:person.x+dx/size*speed*dt,z:person.z+dz/size*speed*dt},.5);person.x=p.x;person.z=p.z;
      if(dx||dz){person.angle=Math.atan2(dx,dz);person.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(time*11+i*Math.PI)*.55);}
      if(!shopOpen&&keys.has('Fire')&&shootWait<=0)discharge();
    }
    person.body.visible=!ride;alignActor(person);population.tick(dt,ride,time);
    arrestResult=police.tick(dt,person,ride,story.locked);
    story.tick(dt,person,ride,comet,police);
    for(const [i,cache] of district.caches.entries())if(!cache.taken&&gap(person,cache)<(cache===story.objective()?5:2.5)){
      const mission=story.collect(cache);
      if(!mission&&story.job<JOB_COUNT&&storyStashes.includes(i))continue;
      cache.taken=true;cache.mesh.visible=false;ammo[1]+=6;ammo[2]+=30;
      if(!mission){cash+=150;story.discover();}
      overlay.message(mission?'Mission stash secured · +6 shells · +30 SMG':'Hidden stash · +$150 · +6 shells · +30 SMG');sound.tone(900,.3);storeProgress();
    }
    if(story.job===JOB_COUNT&&!completed){completed=true;changeScreen('complete');storeProgress();}
    else if(person.hp<=0)changeScreen('wasted');else if(arrestResult)changeScreen('busted');
    if(!police.stars)person.hp=Math.min(100,person.hp+dt*1.5);
    autoSave+=dt;if(autoSave>3){storeProgress();autoSave=0;}
    sound.tick(dt,ride?Math.hypot(ride.vx,ride.vz):0,police.stars);
  }else if(mode==='title')population.tick(dt,null,time);
  if(portrait)police.airTick(0,person);
  const night=!portrait&&story.job===8;
  stage.background.set(night?0x27435f:daylight);stage.fog.color.set(night?0x345269:haze);
  sunlight.intensity=night?1.1:2.8;
  document.getElementById('bayclock').textContent=night?'SOLMAR BAY / 23:48':'SOLMAR BAY / 17:42';
  if(tracerLife>0){tracerLife-=dt;if(tracerLife<=0&&tracer)tracer.visible=false;}
  district.mark(story.objective(),portrait?0:time);cameraTick(dt);pulses.clear();
  overlay.render({person,ride,story,police,cash,district,population,station:sound.station,weapon:weapons[slot].name,slot,ammo:ammo[slot],service:servicePrompt()});
}
function arrangePortrait(name){
  changeScreen('playing');
  const positions={cover:[0,250],street:[-60,46],chase:[-120,53],mission:[120,3]};const [x,z]=positions[name]??positions.cover;
  person.x=x;person.z=z;person.angle=Math.PI;comet.x=x;comet.z=z;comet.angle=Math.PI+.18;alignActor(comet);
  cash=name==='cover'?19600:name==='street'?23100:27100;
  slot=name==='street'?1:name==='cover'?0:2;
  if(name==='mission'||name==='chase')sound.cycle(),sound.cycle();
  if(name!=='street'&&name!=='mission'){ride=comet;person.body.visible=false;}else{person.angle=Math.PI;alignActor(person);comet.x=x+5;comet.z=z+4;alignActor(comet);}
  // The mission still is a cinematic composite: air support frames the post-pursuit hold.
  police.raise(0,person);police.raise(name==='chase'?5:name==='cover'?3:4,name==='cover'?{x:x+25,z:z-35,angle:Math.PI}:person);
  if(name==='chase')ride.vz=-36;
  if(name==='chase'||name==='street')police.blocks.forEach((b,i)=>{b.x=x;b.z=z-(name==='street'?42:23)-i*60;b.body.position.set(b.x,0,b.z);});
  police.airTick(0,person);
  const label=document.getElementById('syslabel');label.hidden=false;label.textContent='12 STORY JOBS · 3 WEAPONS · CONDOR-1 HELICOPTER · ROADBLOCKS · GARAGE UPGRADES · RESPECT RANKS · RADIO · MINIMAP · STASHES';
  police.units.forEach((car,i)=>{car.x=x+(i%2?4:-4);car.z=z+4+i*4;car.angle=Math.PI;alignActor(car);});
  population.cars.slice(0,5).forEach((car,i)=>{car.x=x+(i%2?6:-6);car.z=z-(name==='street'?8:32)-i*13;car.angle=i%2?0:Math.PI;alignActor(car);});
  population.people.slice(0,6).forEach((p,i)=>{p.x=x+(i%2?6:-6);p.z=z-3-i*5;alignActor(p);});
  overlay.message(name==='cover'?'SOLMAR HEAT · Twelve jobs. One way out.':name==='mission'?'SOLMAR LEGEND · Hold Bay Bank for 12 seconds.':name==='street'?'SOLMAR SUPPLY · Shells, rounds and first aid.':'SOLMAR LEGEND · Five stars. CONDOR-1. Roadblock ahead.');
}
if(portrait)arrangePortrait(portrait);
// Read-only observation surface: the playtest drives exclusively through keyboard and mouse events.
function mapPoint(point){return point?{x:point.x,z:point.z}:null;}
window.solmarState=()=>({mode,x:person.x,z:person.z,hp:person.hp,car:!!ride,carHealth:ride?.health??null,speed:ride?Math.hypot(ride.vx,ride.vz):0,job:story.job,phase:story.phase,hold:story.hold,earnings:story.earnings,cash,stars:police.stars,quiet:police.quiet,target:mapPoint(story.objective()),heli:police.heli,blocks:police.blocks.map(mapPoint),units:police.units.map(c=>({x:c.x,z:c.z,recover:c.recover})),weapon:weapons[slot].name,ammo:ammo[slot],respect:story.respect,upgrades:{...upgrades},station:sound.station});
let previous=performance.now(),frames=0;
function animate(now){const dt=Math.min(.05,(now-previous)/1000);previous=now;update(dt);
  if(portrait==='cover'||portrait==='street'){
    document.getElementById('jobname').textContent=portrait==='cover'?'Solmar Heat':'Solmar Supply';
    document.getElementById('instruction').textContent=portrait==='cover'?'Twelve jobs. One coast. Build your reputation from the wheel of the Comet.':'Local ammo and first aid. Dispatch has blocked the avenue.';
  }
  painter.render(stage,lens);if(++frames>=45)window.__shotReady=true;requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
