import {prism,label,seeded,slideCircle} from './geometry.js';
const T=window.THREE;
export const sites={start:{x:-120,z:0},comet:{x:-110,z:0},garage:{x:0,z:0},pier:{x:0,z:240},motel:{x:-120,z:120},bank:{x:120,z:0},club:{x:-60,z:-60},hideout:{x:-120,z:-120}};
sites.shop={x:-60,z:43};
export function constructDistrict(scene){
  const random=seeded(),barriers=[],root=new T.Group();scene.add(root);
  prism(root,[490,.3,510],0xa3b098,[0,-.3,15]);
  prism(root,[1100,.4,450],0x2697ab,[0,-.6,480]);
  prism(root,[490,.15,48],0xe9cf97,[0,-.02,275]);
  const road=0x3d5058;
  for(let lane=-180;lane<=180;lane+=60){
    prism(root,[20,.12,440],road,[lane,0,20]);prism(root,[440,.12,20],road,[0,.01,lane]);
    for(let dash=-210;dash<=230;dash+=12){
      if(Math.abs(dash%60)>12){prism(root,[.22,.03,5],0xf8d992,[lane,.09,dash]);prism(root,[5,.03,.22],0xf8d992,[dash,.1,lane]);}
    }
    prism(root,[20,.12,60],road,[lane,.02,230]);
  }
  for(let bx=-210;bx<210;bx+=60)for(let bz=-210;bz<210;bz+=60){
    const height=8+random()*42,paint=[0xe5b69d,0xe5d6b3,0x88adb0,0xbda4a4,0xd4c4aa][Math.floor(random()*5)];
    const width=29+random()*5,depth=29+random()*5;
    prism(root,[43,.35,43],0xc9c8b0,[bx,.1,bz]);
    const tower=prism(root,[width,height,depth],paint,[bx,height/2,bz]);
    barriers.push({x:bx,z:bz,w:width,d:depth});
    prism(root,[width+1,.7,depth+1],0xf5e4bd,[bx,height+.1,bz]);
    for(let floor=3;floor<height-1;floor+=4)for(let window=-width/2+3;window<width/2-1;window+=4.5){
      prism(root,[2.1,1.9,.13],floor%3?0x416572:0xedce91,[bx+window,floor,bz+depth/2+.08]);
      prism(root,[.13,1.9,2.1],0x426575,[bx+width/2+.08,floor,bz+window]);
    }
    if(random()>.6)prism(root,[7,2,5],0x809396,[bx,height+1,bz]);
    tower.userData.building=true;
  }
  label(root,'BAY BANK',120,6,-11,20);label(root,'STARFISH MOTEL',-120,6,109,24,'#ffb7ad');
  label(root,'CRUZ CUSTOMS',0,5,-11,23,'#8ff5d9');label(root,'SOLMAR MARINA',0,5,250,27);
  label(root,'THE TIDE CLUB',-60,6,-71,22,'#ffb2c4');
  label(root,'SOLMAR SUPPLY',-60,4,35,18,'#9cffc6');
  prism(root,[17,3,.45],0x344749,[-60,3.8,34.6]);
  for(const x of [-67,-53])prism(root,[.3,2.4,.4],0x72d8ac,[x,1.2,35],true);
  prism(root,[410,.25,7],0x8d6351,[0,.08,257]);
  for(let x=-204;x<=204;x+=2)prism(root,[1.85,.12,7],x%6?0xc89263:0xd8a978,[x,.25,257]);
  for(let x=-195;x<=195;x+=30){
    palm(x,266);prism(root,[.2,5,.2],0x374a4d,[x,2.5,260]);
    prism(root,[1.5,.4,.9],0xffdfa0,[x,5,260],true);
  }
  prism(root,[10,.5,49],0xac805c,[0,.15,291]);
  for(const x of [-5,5])for(let z=272;z<316;z+=7){
    prism(root,[.45,2,.45],0x795640,[x,.1,z]);prism(root,[.25,.23,7],0xe2bb87,[x,1.1,z]);
  }
  prism(root,[25,.5,23],0xb59670,[0,.1,257]);
  for(const x of [-19,19]){prism(root,[6,2,14],0xf2ecdb,[x,.1,265]);prism(root,[4,2,5],0x5b8b95,[x,1.8,265]);}
  for(let x=-210;x<=210;x+=30) palm(x,252);
  for(let z=-180;z<=180;z+=60)for(let x=-180;x<=180;x+=60){
    palm(x+13,z+14);
    prism(root,[.22,7,.22],0x536d70,[x-12,3.5,z+11]);prism(root,[3,.3,1],0xffe1a6,[x-11,7,z+11],true);
  }
  function palm(x,z){
    const trunk=new T.Mesh(new T.CylinderGeometry(.25,.48,8,7),new T.MeshStandardMaterial({color:0x9e8460}));trunk.position.set(x,4,z);root.add(trunk);
    for(let leaf=0;leaf<7;leaf++){const a=leaf*Math.PI*2/7;const frond=prism(root,[.8,.15,5.3],0x368e72,[x+Math.sin(a)*1.8,8,z+Math.cos(a)*1.8]);frond.rotation.set(.3,a,.1);}
  }
  const ring=new T.Mesh(new T.TorusGeometry(4,.22,8,40),new T.MeshBasicMaterial({color:0xffc778}));ring.rotation.x=Math.PI/2;ring.position.y=.35;root.add(ring);
  const column=new T.Mesh(new T.CylinderGeometry(.8,.8,18,12,1,true),new T.MeshBasicMaterial({color:0xffc778,transparent:true,opacity:.18,side:T.DoubleSide,depthWrite:false}));root.add(column);
  const stashSpots=[[-194,30],[194,-30],[-74,-150],[74,150],[-134,190],[134,190],[-14,-190],[194,90]];
  const caches=stashSpots.map(([x,z])=>({x,z,taken:false,mesh:prism(root,[1.5,1.2,1.5],0x63e7ab,[x,.8,z],true)}));
  // Static architecture shares draw calls by paint, rather than issuing thousands of window draws.
  const batches=new Map();
  for(const mesh of [...root.children]){
    if(mesh.geometry?.type!=='BoxGeometry'||caches.some(cache=>cache.mesh===mesh))continue;
    const key=mesh.material.color.getHex()+':'+mesh.material.emissive.getHex();
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
  }
  for(const meshes of batches.values()){
    const combined=new T.InstancedMesh(new T.BoxGeometry(1,1,1),meshes[0].material,meshes.length);
    const dummy=new T.Object3D();
    meshes.forEach((mesh,index)=>{const size=mesh.geometry.parameters;dummy.position.copy(mesh.position);dummy.rotation.copy(mesh.rotation);dummy.scale.set(size.width,size.height,size.depth);dummy.updateMatrix();combined.setMatrixAt(index,dummy.matrix);root.remove(mesh);mesh.geometry.dispose();});
    combined.castShadow=true;combined.receiveShadow=true;root.add(combined);
  }
  return {barriers,caches,resolve:(p,r)=>slideCircle(p,r,barriers),mark(target,time){ring.visible=column.visible=!!target;if(target){ring.position.set(target.x,.3,target.z);ring.scale.setScalar(1+Math.sin(time*3)*.12);column.position.set(target.x,9,target.z);}}};
}
