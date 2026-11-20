import {sites} from './district.js';
import {gap} from './geometry.js';
const titles=['Warm-Up Wheels','Marina Drop','Heat Wave','Solmar Score','Condor Rising','Roadblock Run','The Vault Job','King of Solmar','Night Shift','The Getaway','Respect the Bay','Solmar Legend'];
const awards=[500,900,1200,3000,1500,2000,2500,5000,3000,3500,4000,6000];
export const JOB_COUNT=titles.length;
export const ranks=['STREET','HUSTLER','PLAYER','KINGPIN'];
export const storyStashes=[2,6,1];
export function createStory(saved,announce,deposit,caches){
  let job=saved?.job??0,phase=saved?.phase??0,hold=saved?.hold??0,earnings=saved?.earnings??0,found=saved?.found??0;
  const escape=[{x:-120,z:0},{x:0,z:0},{x:0,z:-120},{x:120,z:-120},{x:120,z:120},{x:-120,z:120}];
  const heat=()=>job===2||job===8?3:job===7||job===11?Math.max(0,5-phase):job===9||job===10||(job>=4&&job<=6)||(job===3&&phase===1)?4:0;
  const objective=()=>job===0?(phase===0?sites.comet:sites.garage):job===1||job===5?(phase===0?sites.pier:sites.motel):job===2||job===4?escape[phase%escape.length]:job===3||job===6?(phase<2?(job===3?sites.bank:sites.club):sites.hideout):job===7?(phase<5?escape[phase]:sites.hideout):job===8?(phase===0?sites.motel:sites.pier):job===9?escape[3-phase]:job===10?(phase<3?caches[storyStashes[phase]]:sites.hideout):job===11?(phase<5?escape[phase]:phase===5?sites.bank:sites.hideout):null;
  const text=()=>job===0?(phase===0?'E · Steal the red Comet nearby.':'Deliver the Comet to Cruz Customs.'):job===1?(phase===0?'Drive south to the marina. Exit with E to collect the package.':'Take the package to the Starfish Motel.'):job===2?'Lose all 3 stars. Follow the inner avenues; turn at the gold checkpoints.':job===3?(phase===0?'Reach Bay Bank. Exit your car to start the robbery.':phase===1?`Keep inside the gold ring: ${Math.ceil(12-hold)}s until the vault opens.`:'The money is yours. Drive to the safehouse!'):job===4?`CONDOR-1 deployed. Drive the Comet through gold checkpoints: ${phase} / 3.`:job===5?(phase===0?'Roadblocks active. Reach the pier on foot to collect the package.':'Package secured. Deliver to Starfish Motel through the roadblocks.'):job===6?(phase===0?'Reach The Tide Club vault. Exit to start the hold.':phase===1?`Hold the gold ring: ${Math.ceil(12-hold)}s. CONDOR-1 overhead.`:'Vault cleared. Drive to the safehouse.'):job===7?(phase<5?`Lose 5 stars: drive the gold checkpoints (${phase} / 5).`:'Heat cleared. Drive to the safehouse. Claim Solmar.'):'Solmar is yours. Explore the coast and find the eight stashes.';
  const instructions=()=>job===8?(phase===0?'Three stars locked. Deliver the first package to Starfish Motel.':'First drop made. Deliver the second package to Solmar Marina.'):job===9?`Keep the Comet moving through the gold checkpoints: ${phase} / 4.`:job===10?(phase<3?`Follow the stash lead: ${phase} / 3 secured. Dispatch is on you.`:'Stashes secured. Deliver the haul to the safehouse.'):job===11?(phase<5?`Lose five stars at the gold checkpoints: ${phase} / 5.`:phase===5?`Hold Bay Bank’s gold ring: ${Math.ceil(12-hold)}s remaining.`:'Bank cleared. Drive to the safehouse.'):text();
  function finish(police,person){
    earnings+=awards[job];deposit(awards[job]);announce(`${titles[job]} complete · +$${awards[job].toLocaleString()}`);job++;phase=0;hold=0;
    if(job===2||job>=4)police.raise(heat(),person);
  }
  return {get job(){return job;},get phase(){return phase;},get hold(){return hold;},get earnings(){return earnings;},get title(){return titles[job]??'Solmar is yours';},objective,text:instructions,heat,
    get respect(){return ranks[job>=12?3:job>=9||found>=6?2:job>=5||found>=3?1:0];},
    get holding(){return ((job===3||job===6)&&phase===1)||(job===11&&phase===5);},
    get locked(){return this.holding||job===4||job===5||job===7||(job>=8&&job<=11);},
    collect(cache){if(job===10&&phase<3&&cache===objective()){phase++;found++;return true;}return false;},
    discover(){found++;},
    snapshot:()=>({job,phase,hold,earnings,found}),
    tick(dt,person,ride,comet,police){
      if(job>=8&&job<JOB_COUNT&&police.stars!==heat())police.raise(heat(),person);
      if(job===0){if(phase===0&&ride===comet){phase=1;announce('Lena: Bring it to my garage. Keep it clean.');}else if(phase===1&&ride===comet&&gap(person,sites.garage)<10)finish(police,person);}
      else if(job===1){if(phase===0&&!ride&&gap(person,sites.pier)<9){phase=1;police.raise(Math.max(1,police.stars),person);announce('Package secured. Lena: Motel, west avenue.');}else if(phase===1&&gap(person,sites.motel)<10)finish(police,person);}
      else if(job===2){if(police.stars===0)finish(police,person);else if(gap(person,objective())<12)phase++;}
      else if(job===4){if(police.stars!==4)police.raise(4,person);if(ride===comet&&gap(person,objective())<12){phase++;if(phase===3)finish(police,person);}}
      else if(job===5){if(police.stars!==4)police.raise(4,person);if(phase===0&&!ride&&gap(person,sites.pier)<9){phase=1;announce('Smuggler package secured. Roadblocks on the motel route.');}else if(phase===1&&gap(person,sites.motel)<10)finish(police,person);}
      else if(job===7){if(phase<5&&ride&&gap(person,objective())<12){phase++;police.raise(5-phase,person);announce(phase<5?'Checkpoint cleared. Dispatch losing contact.':'All five stars lost. Return to the safehouse.');}else if(phase===5&&ride&&gap(person,sites.hideout)<11)finish(police,person);}
      else if(job===8&&gap(person,objective())<10){if(phase===0){phase=1;announce('First delivery made. Head to Solmar Marina.');}else finish(police,person);}
      else if(job===9&&ride===comet&&gap(person,objective())<12){if(++phase===4)finish(police,person);}
      else if(job===10&&phase===3&&gap(person,sites.hideout)<11)finish(police,person);
      else if(job===11){
        if(phase<5&&ride&&gap(person,objective())<12){phase++;police.raise(heat(),person);announce(phase===5?'Heat cleared. Hold the gold ring at Bay Bank.':'Checkpoint cleared. Dispatch losing contact.');}
        else if(phase===5){hold=gap(person,sites.bank)<14?hold+dt:Math.max(0,hold-dt);if(hold>=12){phase++;announce('Bank cleared. Drive to the safehouse.');}}
        else if(phase===6&&ride&&gap(person,sites.hideout)<11)finish(police,person);
      }
      else if(job===3||job===6){const vault=job===6?sites.club:sites.bank;if(phase===0&&!ride&&gap(person,vault)<10){phase=1;police.raise(4,person);announce('Alarm triggered! Hold the bank entrance for 12 seconds.');}else if(phase===1){if(police.stars!==4)police.raise(4,person);hold=gap(person,vault)<14?hold+dt:Math.max(0,hold-dt);if(hold>=12){phase=2;announce('Vault cleared. Get to the car and escape to the safehouse.');}}else if(phase===2&&ride&&gap(person,sites.hideout)<11)finish(police,person);}
    }};
}
