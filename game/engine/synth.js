export function makeSoundtrack(){
  let audio=null,muted=false,engine=null,gain=null,beat=0;
  function initialize(){if(audio)return;audio=new AudioContext();engine=audio.createOscillator();gain=audio.createGain();engine.type='sawtooth';gain.gain.value=0;engine.connect(gain).connect(audio.destination);engine.start();}
  // Contact alerts share the procedural oscillator path; no audio files are loaded.
  function tone(frequency,duration=.15,volume=.03){if(!audio||muted)return;const voice=audio.createOscillator(),amp=audio.createGain();voice.frequency.setValueAtTime(frequency,audio.currentTime);voice.frequency.exponentialRampToValueAtTime(frequency*.6,audio.currentTime+duration);amp.gain.setValueAtTime(volume,audio.currentTime);amp.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);voice.connect(amp).connect(audio.destination);voice.start();voice.stop(audio.currentTime+duration);}
  return {initialize,tone,mute(){muted=!muted;},tick(dt,speed,wanted){if(!audio)return;gain.gain.value=muted?0:speed*.0005;engine.frequency.value=45+speed*3;beat+=dt;if(wanted&&beat>.65){beat=0;tone(wanted%2?620:820,.3,.012);}}};
}
