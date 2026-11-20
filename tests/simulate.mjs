// Exercise the real session/controller, story and pursuit with a rendering-only DOM shim.
// This does not substitute for Chromium rendering or request validation.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const require=createRequire(import.meta.url),three=require('../game/vendor/three.min.js');
let now=0,scheduled=null;
const handlers=new Map(),nodes=new Map(),memory=new Map();
const paint={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};
function node(){return {style:{},hidden:false,children:[],addEventListener(){},getContext:()=>paint,textContent:'',innerHTML:'',width:512,height:96};}
globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:()=>node()};
globalThis.window=globalThis;
window.THREE={...three,WebGLRenderer:class{constructor(){this.shadowMap={};}setSize(){}setPixelRatio(){}render(){}}};
globalThis.location={search:'',reload(){}};
globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;
globalThis.performance={now:()=>now};
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.addEventListener=(type,fn)=>{handlers.set(type,fn);};
globalThis.requestAnimationFrame=fn=>scheduled=fn;
globalThis.AudioContext=class{currentTime=0;destination={};createGain(){return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;}};}createOscillator(){return {frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;},start(){},stop(){}};}};
await import('../game/engine/session.js');
function event(type,code){handlers.get(type)({code,preventDefault(){}});}
function advance(seconds){for(let frame=0;frame<Math.ceil(seconds*60);frame++){now+=1000/60;scheduled(now);}}
function tap(code){event('keydown',code);advance(.05);event('keyup',code);advance(.05);}
function observe(){return window.solmarState();}
function travel(x,z){
  const began=now;let held=null;
  while(now-began<90000){
    const state=observe();if(state.mode==='complete')break;assert.equal(state.mode,'playing',JSON.stringify(state));
    const dx=x-state.x,dz=z-state.z;
    if(Math.abs(dx)<2&&Math.abs(dz)<2)break;
    const horizontal=Math.abs(dx)>2,delta=horizontal?dx:dz;
    const code=horizontal?(delta>0?'KeyD':'KeyA'):(delta>0?'KeyS':'KeyW');
    if(code!==held){if(held)event('keyup',held);event('keydown',code);held=code;}
    // A short brake approach prevents velocity coasting across an intersection.
    if(Math.abs(delta)<8)event('keydown','Space');else event('keyup','Space');
    advance(.04);
  }
  if(held)event('keyup',held);event('keydown','Space');advance(.4);event('keyup','Space');
  assert.ok(observe().mode==='complete'||(Math.abs(x-observe().x)<5&&Math.abs(z-observe().z)<5),`Route failed ${x},${z}: ${JSON.stringify(observe())}`);
}
const results=[];
function record(label){const state=observe();console.log(label,JSON.stringify(state));results.push({label,...state});}
tap('Enter');travel(-110,0);tap('KeyE');travel(0,0);record('job0');assert.equal(observe().job,1);
travel(0,240);tap('KeyE');record('package');assert.equal(observe().phase,1);
tap('KeyE');travel(0,120);travel(-120,120);record('job1');assert.equal(observe().job,2);
for(let lap=0;lap<4&&observe().job===2;lap++)for(const [x,z]of[[-120,0],[0,0],[0,-120],[120,-120],[120,120],[-120,120]]){travel(x,z);if(observe().job===3)break;}
record('job2');assert.equal(observe().job,3);
let state=observe();travel(state.x,Math.round(state.z/60)*60);travel(120,Math.round(observe().z/60)*60);travel(120,0);tap('KeyE');advance(12.8);record('bankHold');assert.equal(observe().phase,2);
tap('KeyE');travel(120,-120);travel(-120,-120);record('job3');
assert.equal(observe().job,4);assert.ok(observe().heli);assert.equal(observe().blocks.length,2);
travel(-120,0);travel(0,0);travel(0,-120);record('job4');assert.equal(observe().job,5);
travel(0,240);tap('KeyE');assert.equal(observe().phase,1);tap('KeyE');travel(0,120);travel(-120,120);record('job5');assert.equal(observe().job,6);
travel(-120,-60);travel(-60,-60);tap('KeyE');tap('KeyE');advance(12.8);record('clubHold');assert.equal(observe().phase,2);assert.ok(observe().heli);
travel(-60,-120);travel(-120,-120);record('job6');assert.equal(observe().job,7);assert.equal(observe().stars,5);
for(const [x,z] of [[-120,0],[0,0],[0,-120],[120,-120],[120,120]])travel(x,z);
assert.equal(observe().phase,5);assert.equal(observe().stars,0);assert.equal(observe().heli,null);assert.equal(observe().blocks.length,0);
travel(120,-120);travel(-120,-120);record('job7');
assert.equal(observe().job,8);assert.equal(observe().mode,'complete');assert.equal(observe().cash,16600);assert.equal(observe().earnings,16600);
writeFileSync(new URL('./simulation-results.json',import.meta.url),JSON.stringify({type:'Node simulation with rendering shim; not a browser playtest',results},null,2));

tap('Enter');assert.equal(observe().mode,'playing');
tap('Escape');const paused=observe();event('keydown','KeyW');advance(2);event('keyup','KeyW');assert.equal(observe().z,paused.z);tap('Escape');
tap('KeyE');assert.equal(observe().car,false);
handlers.get('mousedown')({target:{tagName:'CANVAS'}});advance(1.5);handlers.get('mouseup')({});assert.equal(observe().stars,5);
advance(3.1);const resumeRecord=JSON.parse(memory.get('solmar-attempt-five'));assert.equal(resumeRecord.story.earnings,16600);
const {slideCircle}=await import('../game/engine/geometry.js');
const wall=[{x:20,z:20,w:20,d:20}];
for(let z=5;z<=35;z+=.4){const settled=slideCircle({x:9,z},1.65,wall);assert.ok(Number.isFinite(settled.x)&&Number.isFinite(settled.z));}
assert.deepEqual(slideCircle({x:999,z:-999},1.65,[]),{x:225,z:-225});
console.log('PASS: Jobs 0–7, both twelve-second vault holds, $16,600 completion, helicopter and roadblocks, pause, combat to five stars, save and collision bounds.');
