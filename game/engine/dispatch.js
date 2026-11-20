import {automobile,pedestrian,alignActor} from './population.js';
import {gap,limit} from './geometry.js';
export function policeDispatch(scene,district){
  const units=[],officers=[];let stars=0,quiet=0,arrest=0,lastCrime=0;
  function raise(level,person){
    stars=limit(level,0,5);quiet=0;lastCrime=0;
    while(units.length<stars){const n=units.length;const x=limit(Math.round(person.x/60)*60+(n%2?60:-60),-180,180);const z=limit(Math.round(person.z/60)*60+(n<2?-60:60),-180,180);units.push(automobile(scene,x,z,0xe7eee8,true));}
    while(units.length>stars)scene.remove(units.pop().body);
    while(officers.length<Math.max(0,stars-2)){const n=officers.length;officers.push(pedestrian(scene,limit(person.x+35+n*8,-200,200),person.z-30,true));}
    while(officers.length>Math.max(0,stars-2))scene.remove(officers.pop().body);
  }
  function tick(dt,person,car,lockedHeat=false){
    if(!stars)return null;lastCrime+=dt;let closest=Infinity;
    for(const unit of units){
      unit.recover=Math.max(0,unit.recover-dt);
      const distance=gap(unit,person);
      if(distance<4.8&&unit.recover===0){
        // A ram is a single impact, never a positional shove or a persistent constraint.
        unit.recover=9;if(car){car.health-=5;car.vx*=.84;car.vz*=.84;}else person.hp-=9;
      }
      const flee=unit.recover>0;
      // Pursuers choose street intersections, keeping their route inside the city grid.
      const destination=flee?{x:limit(unit.x+(unit.x-person.x)*2,-180,180),z:limit(unit.z+(unit.z-person.z)*2,-180,180)}:person;
      const roadX=Math.round(unit.x/60)*60,roadZ=Math.round(unit.z/60)*60;
      let tx=destination.x,tz=destination.z;
      if(Math.abs(unit.x-roadX)>2.5&&Math.abs(unit.z-roadZ)>2.5){tx=roadX;}
      else if(Math.abs(destination.x-unit.x)>25&&Math.abs(unit.z-roadZ)<3){tz=roadZ;}
      else if(Math.abs(destination.z-unit.z)>12){tx=roadX;}
      const dx=tx-unit.x,dz=tz-unit.z,length=Math.hypot(dx,dz)||1;
      const pace=flee?11:16;
      const point=district.resolve({x:unit.x+dx/length*pace*dt,z:unit.z+dz/length*pace*dt},1.7);
      unit.x=point.x;unit.z=point.z;unit.angle=Math.atan2(dx,dz);alignActor(unit);
      if(!flee)closest=Math.min(closest,distance);
      const light=Math.sin(performance.now()*.015)>0;unit.body.children.slice(-2).forEach((lamp,i)=>lamp.visible=i===(light?0:1));
    }
    for(const officer of officers){if(officer.down)continue;const d=gap(officer,person);if(d>1.5){const p=district.resolve({x:officer.x+(person.x-officer.x)/d*2.8*dt,z:officer.z+(person.z-officer.z)/d*2.8*dt},.5);officer.x=p.x;officer.z=p.z;officer.angle=Math.atan2(person.x-officer.x,person.z-officer.z);alignActor(officer);}if(!car&&d<2.5){arrest+=dt;person.hp-=dt*3;}closest=Math.min(closest,d);}
    if(car||closest>3)arrest=Math.max(0,arrest-dt*2);
    if(!lockedHeat&&closest>46&&lastCrime>3){quiet+=dt;if(quiet>3.5){raise(stars-1,person);lastCrime=4;}}
    else if(closest<34)quiet=Math.max(0,quiet-dt*.5);
    return arrest>5?'busted':null;
  }
  return {units,officers,raise,tick,get stars(){return stars;},get quiet(){return quiet;},get arrest(){return arrest;}};
}
