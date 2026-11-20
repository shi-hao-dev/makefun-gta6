import {prism,seeded,limit,gap} from './geometry.js';
const T=window.THREE;
export function automobile(scene,x,z,paint=0xeb614c,patrol=false){
  const body=new T.Group();
  prism(body,[2.8,.65,5.4],paint,[0,.85,0]);prism(body,[2.4,.7,2.7],patrol?0x183743:paint,[0,1.5,-.1]);
  prism(body,[2.2,.48,.1],0x6db6c5,[0,1.57,1.26]);prism(body,[2.2,.48,.1],0x416d7c,[0,1.57,-1.5]);
  for(const side of [-1,1]){
    prism(body,[.1,.46,2.1],0x5c9dab,[side*1.23,1.55,-.1]);
    for(const axle of [-1.65,1.65]){const tire=new T.Mesh(new T.CylinderGeometry(.56,.56,.36,12),new T.MeshStandardMaterial({color:0x172c34}));tire.rotation.z=Math.PI/2;tire.position.set(side*1.4,.55,axle);body.add(tire);}
    prism(body,[.6,.22,.1],0xffe6a9,[side*.87,.9,2.75],true);prism(body,[.65,.2,.1],0xef4d4e,[side*.87,.9,-2.75],true);
  }
  if(patrol){prism(body,[2.85,.4,3],0xe7eee8,[0,1,0]);prism(body,[1.6,.18,.5],0x253949,[0,2,0]);prism(body,[.65,.2,.5],0xef4864,[-.45,2.14,0],true);prism(body,[.65,.2,.5],0x418efa,[.45,2.14,0],true);}
  scene.add(body);return {x,z,angle:0,vx:0,vz:0,health:100,body,patrol,parked:true,stolen:false,recover:0};
}
export function pedestrian(scene,x,z,uniform=false){
  const body=new T.Group();prism(body,[.65,.85,.4],uniform?0x234f75:0x40af9e,[0,1.2,0]);
  prism(body,[.42,.42,.4],0xdba87e,[0,1.86,0]);
  const limbs=[];for(const side of [-1,1]){limbs.push(prism(body,[.22,.8,.25],0x273f51,[side*.2,.4,0]));prism(body,[.18,.7,.22],uniform?0x234f75:0xe0ab80,[side*.44,1.2,0]);}
  scene.add(body);return {x,z,angle:0,body,limbs,down:false};
}
// Roadblock cruisers can use a local Group as their scene parent.
export function alignActor(actor){actor.body.position.set(actor.x,0,actor.z);actor.body.rotation.y=actor.angle;}
export function moveVehicle(vehicle,dx,dz,seconds,district,boost=false,brake=false){
  const norm=Math.hypot(dx,dz),pace=boost?39:30;
  // Steering acts on velocity at every speed; releasing throttle gives a short, predictable coast.
  const response=1-Math.exp(-(brake?13:norm?7:5)*seconds);
  vehicle.vx+=((norm?dx/norm*pace:0)-vehicle.vx)*response;
  vehicle.vz+=((norm?dz/norm*pace:0)-vehicle.vz)*response;
  const slices=Math.max(1,Math.ceil(Math.hypot(vehicle.vx,vehicle.vz)*seconds/.7));
  for(let j=0;j<slices;j++){
    const desired={x:vehicle.x+vehicle.vx*seconds/slices,z:vehicle.z+vehicle.vz*seconds/slices};
    const settled=district.resolve(desired,1.65);vehicle.x=settled.x;vehicle.z=settled.z;
    if(Math.abs(desired.x-settled.x)>.03)vehicle.vx*=.8;
    if(Math.abs(desired.z-settled.z)>.03)vehicle.vz*=.8;
  }
  if(norm){const desiredAngle=Math.atan2(dx,dz);const turn=Math.atan2(Math.sin(desiredAngle-vehicle.angle),Math.cos(desiredAngle-vehicle.angle));vehicle.angle+=turn*Math.min(1,seconds*11);}
  alignActor(vehicle);
}
export function fillStreets(scene){
  const rng=seeded(41),cars=[],people=[];
  for(let n=0;n<18;n++){
    const horizontal=n%2===0,lane=(n%7-3)*60;
    const car=automobile(scene,horizontal?-200+rng()*400:lane+4,horizontal?lane+4:-200+rng()*400,[0xeab565,0x3b8c9e,0xcad5c4,0xa65b64][n%4]);
    car.horizontal=horizontal;car.direction=n%3?1:-1;car.parked=false;cars.push(car);
  }
  for(let n=0;n<34;n++){const p=pedestrian(scene,(n%7-3)*60+12,Math.floor(n/7)*60-140);p.phase=rng()*6;p.stride=n%2?1:-1;people.push(p);}
  return {cars,people,tick(dt,rider,time){
    for(const car of cars){if(car===rider||car.parked)continue;const axis=car.horizontal?'x':'z';car[axis]+=car.direction*9*dt;if(Math.abs(car[axis])>215)car.direction*=-1;car.angle=car.horizontal?car.direction*Math.PI/2:car.direction>0?0:Math.PI;alignActor(car);}
    for(const person of people){if(person.down)continue;person.z+=person.stride*dt;if(Math.abs(person.z)>205)person.stride*=-1;person.angle=person.stride>0?0:Math.PI;person.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(time*5+person.phase+i*Math.PI)*.5);alignActor(person);}
  }};
}
