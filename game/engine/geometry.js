const T = window.THREE;
export const limit = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Planar distances deliberately ignore aircraft altitude and actor mesh height.
export const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export function prism(parent, dimensions, tint, position, luminous=false) {
  const material = new T.MeshStandardMaterial({color:tint,roughness:.7,metalness:.08,emissive:luminous?tint:0,emissiveIntensity:luminous?.6:0});
  const solid = new T.Mesh(new T.BoxGeometry(...dimensions),material);
  solid.position.set(...position); solid.castShadow=true;solid.receiveShadow=true;parent.add(solid);return solid;
}
export function label(parent, text, x,y,z, width=20, color='#ffe4b8') {
  const sheet=document.createElement('canvas');sheet.width=512;sheet.height=96;
  const ink=sheet.getContext('2d');ink.fillStyle='#183540';ink.fillRect(0,0,512,96);
  ink.fillStyle=color;ink.font='bold 39px Arial';ink.textAlign='center';ink.fillText(text,256,63);
  const board=new T.Mesh(new T.PlaneGeometry(width,width*96/512),new T.MeshBasicMaterial({map:new T.CanvasTexture(sheet),side:T.DoubleSide}));
  board.position.set(x,y,z);parent.add(board);return board;
}
export function seeded(seed=714) {
  let value=seed;return ()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};
}
export function slideCircle(position, radius, obstacles) {
  let x=limit(position.x,-225,225),z=limit(position.z,-225,271);
  for (let pass=0;pass<2;pass++) for(const box of obstacles){
    const nearX=limit(x,box.x-box.w/2,box.x+box.w/2),nearZ=limit(z,box.z-box.d/2,box.z+box.d/2);
    let dx=x-nearX,dz=z-nearZ;const length=Math.hypot(dx,dz);
    if(length>=radius)continue;
    if(length>.001){x+=dx/length*(radius-length);z+=dz/length*(radius-length);}
    else {const px=box.w/2+radius-Math.abs(x-box.x),pz=box.d/2+radius-Math.abs(z-box.z);if(px<pz)x+=(x>=box.x?1:-1)*px;else z+=(z>=box.z?1:-1)*pz;}
  }
  return {x,z};
}
