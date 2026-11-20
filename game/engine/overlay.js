import {sites} from './district.js';
export function createOverlay(){
  const element=id=>document.getElementById(id),ink=element('atlas').getContext('2d');let toastUntil=0;
  return {message(text){element('notice').textContent=text;element('notice').style.display='block';toastUntil=performance.now()+5000;},
    screen(name,cash){const curtain=element('curtain');curtain.hidden=name==='playing';if(name==='title'||name==='playing')return;const names={paused:'ON HOLD',busted:'BUSTED',wasted:'WASTED',complete:'SOLMAR IS YOURS'};element('screenname').textContent=names[name];element('screenbody').textContent=name==='complete'?`Eight jobs complete. Story earnings $16,600. Wallet $${cash.toLocaleString()}. Lena: We made it.`:name==='paused'?'Take a breath. The city can wait.':'Lena has another car waiting. Retry this job with Enter.';element('resume').textContent=name==='complete'?'KEEP EXPLORING':name==='paused'?'RESUME':'TRY AGAIN';},
    render(state){const {person,ride,story,police,cash,district,population}=state;
      element('wealth').innerHTML=`<b>${'★'.repeat(police.stars)}${'☆'.repeat(5-police.stars)}</b>$${cash.toLocaleString()}`;
      element('chapter').textContent=story.job<8?`0${story.job+1} / 08`:'FREE ROAM';element('jobname').textContent=story.title;element('instruction').textContent=story.text();element('progress').style.width=((story.job===3||story.job===6)&&story.phase===1?story.hold/12*100:100)+'%';
      element('dispatch').textContent=police.stars?`DISPATCH / ${police.quiet>0?'SEARCHING — BREAK LINE OF SIGHT':(police.heli?'CONDOR-1 / ROADBLOCKS ACTIVE':'PURSUIT ACTIVE')}`:'SOLMAR FM / COASTAL FREQUENCY';
      element('vitals').textContent=`HEALTH ${Math.ceil(person.hp)}% · ${ride?Math.round(Math.hypot(ride.vx,ride.vz)*3.6)+' KM/H':'ON FOOT'}`;element('reticle').style.display=ride?'none':'block';
      if(performance.now()>toastUntil)element('notice').style.display='none';
      ink.fillStyle='#183a44';ink.fillRect(0,0,220,220);const project=(x,z)=>[110+x*.44,103+z*.44];
      ink.fillStyle='#d9bc86';ink.fillRect(0,207,220,13);ink.strokeStyle='#617e7e';ink.lineWidth=6;
      for(let avenue=-180;avenue<=180;avenue+=60){ink.beginPath();ink.moveTo(...project(avenue,-225));ink.lineTo(...project(avenue,240));ink.stroke();ink.beginPath();ink.moveTo(...project(-225,avenue));ink.lineTo(...project(225,avenue));ink.stroke();}
      function dot(p,color,size){ink.fillStyle=color;ink.beginPath();ink.arc(...project(p.x,p.z),size,0,Math.PI*2);ink.fill();}
      for(const car of population.cars)dot(car,'#b6d1cb',1.6);for(const cache of district.caches)if(!cache.taken)dot(cache,'#69ddaa',1.8);for(const unit of police.units)dot(unit,'#ff637c',3);
      for(const block of police.blocks)dot(block,'#ff9b72',3.5);if(police.heli)dot(police.heli,'#ffd166',5);
      const target=story.objective();if(target)dot(target,'#ffcd87',4);dot(person,'#ffffff',4);
      ink.fillStyle='#f7d69f';ink.font='9px Arial';ink.fillText('BAY',175,201);
    }};
}
