import {automobile,pedestrian,alignActor} from './population.js';
import {gap,limit,prism} from './geometry.js';
export function policeDispatch(scene,district){
  const T=window.THREE,units=[],officers=[],blocks=[];let aircraft=null;let stars=0,quiet=0,arrest=0,lastCrime=0;
  // Air support and static barricades have independent lifecycles from pursuers.
  function support(person){
    if(stars<3){
      if(aircraft){scene.remove(aircraft.body);aircraft.body.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});aircraft=null;}
    }
    if(stars<4){
      for(const block of blocks){scene.remove(block.body);block.body.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}blocks.length=0;
    }
    if(stars>=3&&!aircraft){
      const body=new T.Group();body.name='CONDOR-1';
      prism(body,[3,2.3,6],0x263d49,[0,0,0]);prism(body,[2.7,1.2,1.6],0x7dc6d2,[0,.2,2.5]);
      prism(body,[.7,.7,7],0x263d49,[0,.2,-5]);prism(body,[.4,2,1.8],0xe8bc69,[0,1,-8]);
      const rotor=prism(body,[15,.13,.5],0x182c35,[0,1.8,0]);
      const tailRotor=prism(body,[.12,3,.25],0xf6d48d,[.5,1,-8]);
      for(const x of [-1.8,1.8])prism(body,[.2,.2,6],0xbacbd0,[x,-1.8,0]);
      const beam=new T.Mesh(new T.ConeGeometry(10,27,32,1,true),new T.MeshBasicMaterial({color:0xffe6a2,transparent:true,opacity:.09,side:T.DoubleSide,depthWrite:false}));beam.position.y=-14;body.add(beam);
      scene.add(body);aircraft={body,rotor,tailRotor,beam,x:person.x+4,z:person.z-18};body.position.set(aircraft.x,28,aircraft.z);
    }
    if(stars>=4&&!blocks.length){
      const angle=person.angle??0,horizontal=Math.abs(Math.sin(angle))>.7;
      const along=horizontal?person.x:person.z,across=limit(Math.round((horizontal?person.z:person.x)/60)*60,-180,180);
      const direction=along>150?-1:along< -150?1:(horizontal?Math.sin(angle):Math.cos(angle))>=0?1:-1;
      for(let i=0;i<2;i++){
        const ahead=limit(along+direction*(32+i*65),-195,215),x=horizontal?ahead:across,z=horizontal?across:ahead,body=new T.Group();body.name='ROADBLOCK';scene.add(body);
        for(const side of [-1,1]){const car=automobile(body,side*6,0,0xe7eee8,true);car.angle=Math.PI/2;alignActor(car);}
        prism(body,[6,1.4,.6],0xf1d5a0,[0,1,0]);
        for(let stripe=-2;stripe<=2;stripe++){const bar=prism(body,[.5,1.4,.64],0x263d49,[stripe,1,0]);bar.rotation.z=-.4;}
        body.position.set(x,0,z);body.rotation.y=horizontal?Math.PI/2:0;blocks.push({x,z,body});
      }
    }
  }
  function airTick(dt,person){if(!aircraft)return;const a=aircraft,k=1-Math.exp(-dt*1.8);a.orbit=(a.orbit??0)+dt*.65;a.x+=(person.x+4+Math.sin(a.orbit)*12-a.x)*k;a.z+=(person.z-18+(1-Math.cos(a.orbit))*8-a.z)*k;a.body.position.set(a.x,28,a.z);a.rotor.rotation.y+=dt*35;a.tailRotor.rotation.x+=dt*40;const direction=new T.Vector3(person.x-a.x,-27,person.z-a.z),length=direction.length();direction.normalize();a.beam.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),direction);a.beam.position.copy(direction).multiplyScalar(length/2);a.beam.scale.y=length/27;}
  function raise(level,person){
    stars=limit(level,0,5);quiet=0;lastCrime=0;
    support(person);
    while(units.length<stars){const n=units.length;const x=limit(Math.round(person.x/60)*60+(n%2?60:-60),-180,180);const z=limit(Math.round(person.z/60)*60+(n<2?-60:60),-180,180);units.push(automobile(scene,x,z,0xe7eee8,true));}
    while(units.length>stars)scene.remove(units.pop().body);
    while(officers.length<Math.max(0,stars-2)){const n=officers.length;officers.push(pedestrian(scene,limit(person.x+35+n*8,-200,200),person.z-30,true));}
    while(officers.length>Math.max(0,stars-2))scene.remove(officers.pop().body);
  }
  function tick(dt,person,car,lockedHeat=false){
    airTick(dt,person);if(!stars)return null;lastCrime+=dt;let closest=Infinity;
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
  return {units,officers,blocks,airTick,raise,tick,get heli(){return aircraft?{x:aircraft.x,z:aircraft.z}:null;},get stars(){return stars;},get quiet(){return quiet;},get arrest(){return arrest;}};
}
