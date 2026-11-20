import {constructDistrict,sites} from './district.js';
import {automobile,pedestrian,alignActor,moveVehicle,fillStreets} from './population.js';
import {policeDispatch} from './dispatch.js';
import {createStory} from './storyline.js';
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
const story=createStory(saved?.story,text=>{overlay.message(text);sound.tone(660,.25);},pay=>cash+=pay);
if(saved?.riding)ride=comet;
if(story.job===2)police.raise(3,person);if(story.job===3&&story.phase===1)police.raise(4,person);
const keys=new Set(),pulses=new Set();let pointer={x:0,y:0};
addEventListener('keydown',event=>{if(['Space','ArrowUp','ArrowDown'].includes(event.code))event.preventDefault();if(!keys.has(event.code))pulses.add(event.code);keys.add(event.code);});
addEventListener('keyup',event=>keys.delete(event.code));addEventListener('blur',()=>{keys.clear();if(mode==='playing')changeScreen('paused');});
addEventListener('mousemove',event=>{pointer.x=event.clientX/innerWidth*2-1;pointer.y=-(event.clientY/innerHeight)*2+1;});
addEventListener('mousedown',event=>{if(event.target.tagName==='CANVAS')keys.add('Fire');});addEventListener('mouseup',()=>keys.delete('Fire'));
addEventListener('resize',()=>{lens.aspect=innerWidth/innerHeight;lens.updateProjectionMatrix();painter.setSize(innerWidth,innerHeight);});
function changeScreen(next){mode=next;overlay.screen(mode,cash);}
function storeProgress(){if(portrait)return;try{localStorage.setItem('solmar-attempt-five',JSON.stringify({cash,x:person.x,z:person.z,carX:ride?.x??comet.x,carZ:ride?.z??comet.z,riding:!!ride,story:story.snapshot(),caches:district.caches.map(c=>c.taken)}));}catch{}}
if(saved?.caches)saved.caches.forEach((taken,i)=>{if(taken&&district.caches[i]){district.caches[i].taken=true;district.caches[i].mesh.visible=false;}});
function activate(){sound.initialize();if(mode==='busted'||mode==='wasted'){
  person.hp=100;person.x=story.objective()?.x??0;person.z=(story.objective()?.z??0)+15;comet.x=person.x+4;comet.z=person.z;comet.health=100;alignActor(comet);ride=null;police.raise(story.job===2?3:story.job===3&&story.phase===1?4:0,person);
}changeScreen('playing');}
document.getElementById('resume').addEventListener('click',activate);
function switchSeat(){if(ride){ride.parked=true;ride.vx=ride.vz=0;const p=district.resolve({x:ride.x+3.7,z:ride.z},.5);person.x=p.x;person.z=p.z;ride=null;sound.tone(240);return;}
  const candidate=[comet,...population.cars,...police.units].filter(c=>c.health>0).sort((a,b)=>gap(a,person)-gap(b,person))[0];
  if(candidate&&gap(candidate,person)<7){ride=candidate;ride.parked=true;if(!ride.stolen){ride.stolen=true;police.raise(Math.max(1,police.stars),person);}overlay.message('WASD points the car down the avenue. Shift boosts. Space brakes.');sound.tone(300);}
}
const ray=new T.Raycaster();let tracer=null,tracerLife=0;
function discharge(){
  sound.tone(95,.1,.09);shootWait=.25;ray.setFromCamera(pointer,lens);
  const plane=new T.Plane(new T.Vector3(0,1,0),-1.2),aim=new T.Vector3();ray.ray.intersectPlane(plane,aim);
  let dx=aim.x-person.x,dz=aim.z-person.z,range=Math.hypot(dx,dz)||1;dx/=range;dz/=range;person.angle=Math.atan2(dx,dz);
  const start=new T.Vector3(person.x,1.4,person.z),end=new T.Vector3(person.x+dx*75,1.4,person.z+dz*75);
  if(tracer){stage.remove(tracer);tracer.geometry.dispose();tracer.material.dispose();}
  const targets=[...population.people,...police.officers,...population.cars,...police.units];let nearest=75,victim=null;
  for(const entity of targets){if(entity.down)continue;const ox=entity.x-person.x,oz=entity.z-person.z,along=ox*dx+oz*dz,across=Math.abs(ox*dz-oz*dx);if(along>0&&along<nearest&&across<(entity.limbs?.8:2)){nearest=along;victim=entity;}}
  if(victim){end.set(person.x+dx*nearest,1.4,person.z+dz*nearest);if(victim.limbs){victim.down=true;victim.body.rotation.z=Math.PI/2;}else{victim.health-=34;if(victim.health<=0)victim.body.rotation.z=.2;}}
  tracer=new T.Line(new T.BufferGeometry().setFromPoints([start,end]),new T.LineBasicMaterial({color:0xffec9a}));stage.add(tracer);tracerLife=.09;police.raise(Math.min(5,police.stars+1),person);
}
function cameraTick(dt){
  const offset=portrait?(portrait==='street'?new T.Vector3(8,6,14):portrait==='mission'?new T.Vector3(14,9,20):new T.Vector3(10,7,17)):new T.Vector3(0,19,26);
  const desired=new T.Vector3(person.x+offset.x,offset.y,person.z+offset.z);lens.position.lerp(desired,1-Math.exp(-dt*7));lens.lookAt(person.x,1.5,person.z-4);
  sunlight.position.set(person.x-70,110,person.z+60);sunlight.target.position.set(person.x,0,person.z);sunlight.target.updateMatrixWorld();
}
function update(dt){
  time+=dt;shootWait-=dt;const tap=code=>pulses.has(code);
  if(tap('KeyM'))sound.mute();
  if(tap('KeyN')&&mode==='title'){localStorage.removeItem('solmar-attempt-five');location.reload();}
  if(tap('Enter')&&mode!=='playing')activate();else if(tap('Escape'))changeScreen(mode==='playing'?'paused':'playing');
  if(mode==='playing'&&!portrait){
    if(tap('KeyE'))switchSeat();
    const dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    const boost=keys.has('ShiftLeft')||keys.has('ShiftRight');
    if(ride){moveVehicle(ride,dx,dz,dt,district,boost,keys.has('Space'));person.x=ride.x;person.z=ride.z;person.angle=ride.angle;
      // Soft traffic impacts cost speed, without pushing either participant into buildings.
      for(const other of population.cars)if(other!==ride&&gap(ride,other)<3.3){ride.vx*=.97;ride.vz*=.97;}
      if(ride.health<=0){switchSeat();overlay.message('Engine disabled. Find another car.');}
    }else{
      const size=Math.hypot(dx,dz)||1,speed=boost?10:6;const p=district.resolve({x:person.x+dx/size*speed*dt,z:person.z+dz/size*speed*dt},.5);person.x=p.x;person.z=p.z;
      if(dx||dz){person.angle=Math.atan2(dx,dz);person.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(time*11+i*Math.PI)*.55);}
      if(keys.has('Fire')&&shootWait<=0)discharge();
    }
    person.body.visible=!ride;alignActor(person);population.tick(dt,ride,time);
    arrestResult=police.tick(dt,person,ride,story.job===3&&story.phase===1);
    story.tick(dt,person,ride,comet,police);
    for(const cache of district.caches)if(!cache.taken&&gap(person,cache)<2.5){cache.taken=true;cache.mesh.visible=false;cash+=150;overlay.message('Hidden stash · +$150');sound.tone(900,.3);storeProgress();}
    if(story.job===4&&!completed){completed=true;changeScreen('complete');storeProgress();}
    if(person.hp<=0)changeScreen('wasted');else if(arrestResult)changeScreen('busted');
    if(!police.stars)person.hp=Math.min(100,person.hp+dt*1.5);
    autoSave+=dt;if(autoSave>3){storeProgress();autoSave=0;}
    sound.tick(dt,ride?Math.hypot(ride.vx,ride.vz):0,police.stars);
  }else if(mode==='title')population.tick(dt,null,time);
  if(tracerLife>0){tracerLife-=dt;if(tracerLife<=0&&tracer)tracer.visible=false;}
  district.mark(story.objective(),time);cameraTick(dt);pulses.clear();
  overlay.render({person,ride,story,police,cash,district,population});
}
function arrangePortrait(name){
  changeScreen('playing');
  const positions={cover:[0,35],street:[-60,35],chase:[0,0],mission:[120,12]};const [x,z]=positions[name]??positions.cover;
  person.x=x;person.z=z;comet.x=x;comet.z=z;comet.angle=.15;alignActor(comet);
  if(name!=='street'&&name!=='mission'){ride=comet;person.body.visible=false;}else{person.angle=Math.PI;alignActor(person);comet.x=x+5;comet.z=z+4;alignActor(comet);}
  police.raise(name==='street'?0:name==='mission'?4:3,person);
  police.units.forEach((car,i)=>{car.x=x-5+i*6;car.z=z-13-i*5;car.angle=.1;alignActor(car);});
  population.cars.slice(0,5).forEach((car,i)=>{car.x=x+(i%2?5:-5);car.z=z-24-i*13;car.angle=i%2?0:Math.PI;alignActor(car);});
  population.people.slice(0,6).forEach((p,i)=>{p.x=x+(i%2?12:-12);p.z=z-4-i*7;alignActor(p);});
  if(name==='mission'){const marker=sites.bank;district.mark(marker,0);}
  overlay.message(name==='mission'?'THE SOLMAR SCORE · Hold the entrance. Get the money.':name==='street'?'SOLMAR BAY · Every street has a story.':'HEAT WAVE · Lose the cruisers. Own the coast.');
}
if(portrait)arrangePortrait(portrait);
// Read-only observation surface: the playtest drives exclusively through keyboard and mouse events.
window.solmarState=()=>({mode,x:person.x,z:person.z,hp:person.hp,car:!!ride,carHealth:ride?.health??null,speed:ride?Math.hypot(ride.vx,ride.vz):0,job:story.job,phase:story.phase,hold:story.hold,earnings:story.earnings,cash,stars:police.stars,quiet:police.quiet,target:story.objective(),units:police.units.map(c=>({x:c.x,z:c.z,recover:c.recover}))});
let previous=performance.now(),frames=0;
function animate(now){const dt=Math.min(.05,(now-previous)/1000);previous=now;update(dt);if(portrait){document.getElementById('jobname').textContent=portrait==='mission'?'Solmar Score':portrait==='street'?'The city is alive':'Heat Wave';document.getElementById('instruction').textContent=portrait==='mission'?'BAY BANK / Hold the entrance. Escape to the safehouse.':portrait==='street'?'Explore Solmar Bay. Steal a ride. Find your next score.':'Three stars. Open avenues. Find a way out.';if(portrait==='mission')district.mark(sites.bank,time);}painter.render(stage,lens);if(++frames>=45)window.__shotReady=true;requestAnimationFrame(animate);}
requestAnimationFrame(animate);
