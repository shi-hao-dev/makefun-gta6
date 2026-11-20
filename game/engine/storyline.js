import {sites} from './district.js';
import {gap} from './geometry.js';
const titles=['Warm-Up Wheels','Marina Drop','Heat Wave','Solmar Score','Condor Rising','Roadblock Run','The Vault Job','King of Solmar'];
const awards=[500,900,1200,3000,1500,2000,2500,5000];
export function createStory(saved,announce,deposit){
  let job=saved?.job??0,phase=saved?.phase??0,hold=saved?.hold??0,earnings=saved?.earnings??0;
  const escape=[{x:-120,z:0},{x:0,z:0},{x:0,z:-120},{x:120,z:-120},{x:120,z:120},{x:-120,z:120}];
  const objective=()=>job===0?(phase===0?sites.comet:sites.garage):job===1?(phase===0?sites.pier:sites.motel):job===2?escape[phase%escape.length]:job===3?(phase<2?sites.bank:sites.hideout):job===4?escape[phase%escape.length]:job===5?(phase===0?sites.pier:sites.motel):job===6?(phase<2?sites.club:sites.hideout):job===7?(phase<5?escape[phase%escape.length]:sites.hideout):null;
  const text=()=>job===0?(phase===0?'E · Steal the red Comet nearby.':'Deliver the Comet to Cruz Customs.'):job===1?(phase===0?'Drive south to the marina. Exit with E to collect the package.':'Take the package to the Starfish Motel.'):job===2?'Lose all 3 stars. Follow the inner avenues; turn at the gold checkpoints.':job===3?(phase===0?'Reach Bay Bank. Exit your car to start the robbery.':phase===1?`Keep inside the gold ring: ${Math.ceil(12-hold)}s until the vault opens.`:'The money is yours. Drive to the safehouse!'):job===4?`CONDOR-1 deployed. Drive the Comet through gold checkpoints: ${phase} / 3.`:job===5?(phase===0?'Roadblocks active. Reach the pier on foot to collect the package.':'Package secured. Deliver to Starfish Motel through the roadblocks.'):job===6?(phase===0?'Reach The Tide Club vault. Exit to start the hold.':phase===1?`Hold the gold ring: ${Math.ceil(12-hold)}s. CONDOR-1 overhead.`:'Vault cleared. Drive to the safehouse.'):job===7?(phase<5?`Lose 5 stars: drive the gold checkpoints (${phase} / 5).`:'Heat cleared. Drive to the safehouse. Claim Solmar.'):'Solmar is yours. Explore the coast and find the eight stashes.';
  function finish(police,person){
    earnings+=awards[job];deposit(awards[job]);announce(`${titles[job]} complete · +$${awards[job].toLocaleString()}`);job++;phase=0;hold=0;
    if(job===2)police.raise(3,person);
    if(job>=4)police.raise(job===7?5:job===8?0:4,person);
  }
  return {get job(){return job;},get phase(){return phase;},get hold(){return hold;},get earnings(){return earnings;},get title(){return titles[job]??'Solmar is yours';},objective,text,
    snapshot:()=>({job,phase,earnings}),
    tick(dt,person,ride,comet,police){
      if(job===0){if(phase===0&&ride===comet){phase=1;announce('Lena: Bring it to my garage. Keep it clean.');}else if(phase===1&&ride===comet&&gap(person,sites.garage)<10)finish(police,person);}
      else if(job===1){if(phase===0&&!ride&&gap(person,sites.pier)<9){phase=1;police.raise(Math.max(1,police.stars),person);announce('Package secured. Lena: Motel, west avenue.');}else if(phase===1&&gap(person,sites.motel)<10)finish(police,person);}
      else if(job===2){if(police.stars===0)finish(police,person);else if(gap(person,objective())<12)phase++;}
      else if(job===4){if(police.stars!==4)police.raise(4,person);if(ride===comet&&gap(person,objective())<12){phase++;if(phase===3)finish(police,person);}}
      else if(job===5){if(police.stars!==4)police.raise(4,person);if(phase===0&&!ride&&gap(person,sites.pier)<9){phase=1;announce('Smuggler package secured. Roadblocks on the motel route.');}else if(phase===1&&gap(person,sites.motel)<10)finish(police,person);}
      else if(job===7){if(phase<5&&ride&&gap(person,objective())<12){phase++;police.raise(5-phase,person);announce(phase<5?'Checkpoint cleared. Dispatch losing contact.':'All five stars lost. Return to the safehouse.');}else if(phase===5&&ride&&gap(person,sites.hideout)<11)finish(police,person);}
      else if(job===3||job===6){const vault=job===6?sites.club:sites.bank;if(phase===0&&!ride&&gap(person,vault)<10){phase=1;police.raise(4,person);announce('Alarm triggered! Hold the bank entrance for 12 seconds.');}else if(phase===1){if(police.stars!==4)police.raise(4,person);hold=gap(person,vault)<14?hold+dt:Math.max(0,hold-dt);if(hold>=12){phase=2;announce('Vault cleared. Get to the car and escape to the safehouse.');}}else if(phase===2&&ride&&gap(person,sites.hideout)<11)finish(police,person);}
    }};
}
