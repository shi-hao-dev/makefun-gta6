const stations=[
  {name:'SOLMAR FM',step:.23,wave:'triangle',notes:[0,7,12,7,4,9,12,16]},
  {name:'COASTAL',step:.42,wave:'sine',notes:[0,4,7,null,11,7,4,null]},
  {name:'NIGHT DRIVE',step:.17,wave:'square',notes:[0,0,12,0,3,0,10,7]}
];
export function makeSoundtrack(){
  let audio=null,muted=false,engine=null,gain=null,beat=0,timer=0,index=0,step=0;
  function initialize(){if(audio)return;audio=new AudioContext();engine=audio.createOscillator();gain=audio.createGain();engine.type='sawtooth';gain.gain.value=0;engine.connect(gain).connect(audio.destination);engine.start();}
  // Contact alerts share the procedural oscillator path; no audio files are loaded.
  function tone(frequency,duration=.15,volume=.03,wave='sine',bend=.6){if(!audio||muted)return;const voice=audio.createOscillator(),amp=audio.createGain();voice.type=wave;voice.frequency.setValueAtTime(frequency,audio.currentTime);voice.frequency.exponentialRampToValueAtTime(frequency*bend,audio.currentTime+duration);amp.gain.setValueAtTime(volume,audio.currentTime);amp.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);voice.connect(amp).connect(audio.destination);voice.start();voice.stop(audio.currentTime+duration);}
  return {initialize,tone,mute(){muted=!muted;if(gain&&muted)gain.gain.value=0;},get station(){return stations[index].name;},
    cycle(){index=(index+1)%stations.length;timer=step=0;},
    tick(dt,speed,wanted){
      if(!audio)return;
      gain.gain.value=muted?0:speed*.0005;engine.frequency.value=45+speed*3;
      beat+=dt;if(wanted&&beat>.65){beat=0;tone(wanted%2?620:820,.3,.012);}
      const station=stations[index];timer-=dt;
      if(timer<=0){timer+=station.step;const note=station.notes[step++%station.notes.length];if(note!==null)tone((index===2?110:220)*2**(note/12),station.step*.9,index===2?.012:.026,station.wave,1);}
    }};
}
