(()=>{
'use strict';
const q=s=>document.querySelector(s),intro=q('#intro');
if(!intro||intro.dataset.sequenceStarted==='1')return;
intro.dataset.sequenceStarted='1';
const state=q('#introState'),pct=q('#introPct'),bar=q('#introBar'),ready=q('#introReady'),logo=q('#introLogo');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease='cubic-bezier(.23,1,.32,1)';

/* The intro owns itself. Cancel CSS animations so no second timeline can fight it. */
if(intro.getAnimations)intro.getAnimations({subtree:true}).forEach(a=>a.cancel());
intro.classList.remove('is-hidden','gone','out');
intro.hidden=false;
intro.style.display='grid';
intro.style.visibility='visible';
intro.style.opacity='1';

const phases=[
 ['BUILDING FORM',16,'CALIBRATING',160],
 ['TRACKING RHYTHM',36,'CALIBRATING',500],
 ['SHAPING TYPE',61,'COMPOSING',830],
 ['COMPOSING DEPTH',83,'COMPOSING',1180],
 ['FRAME LOCKED',100,'READY',1510]
];
const timers=[];
for(const [label,value,status,delay] of phases){timers.push(setTimeout(()=>{if(state)state.textContent=label;if(pct)pct.textContent=String(value).padStart(2,'0');if(bar)bar.style.width=value+'%';if(ready)ready.textContent=status},delay))}
const play=(el,frames,opts={})=>el?.animate(frames,{fill:'both',easing:ease,...opts});

/* WAAPI owns every moving intro element so the intro remains deterministic. */
if(logo){
 const lift=reduce?'9vh':'44vh';
 play(logo,[{opacity:0,transform:`translateY(${lift}) scale(.72)`},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:reduce?820:1050,delay:80});
 logo.querySelectorAll('i,b').forEach((part,i)=>play(part,[{transform:'translateY(0) scale(1)'},{transform:`translateY(${reduce?-(i===1?2:1):(i===1?0:i?6:-6)}px) scale(${reduce?1.015:1.055})`},{transform:'translateY(0) scale(1)'}],{duration:reduce?1000:1450,delay:reduce?700:1050+i*55,direction:'alternate',iterations:2}));
}
intro.querySelectorAll('.intro-orbit').forEach((orbit,i)=>play(orbit,[{transform:'rotate(0deg) scale(1)'},{transform:`rotate(${i?'140deg':'220deg'}) scale(${reduce?1:1.04})`}],{duration:reduce?(i?6200:7800):(i?4300:6800),iterations:Infinity}));
intro.querySelectorAll('.intro-satellite').forEach((sat,i)=>play(sat,[{transform:'translate3d(0,0,0) scale(1)',opacity:.72},{transform:`translate3d(${i?'-11vw':'14vw'},${i?'7vh':'-8vh'},0) scale(${i?.82:1.4})`,opacity:.34}],{duration:reduce?3400:2400,delay:i*100,direction:'alternate',iterations:Infinity}));
const axis=intro.querySelector('.intro-axis');
if(axis)play(axis,[{transform:'scaleX(1)',opacity:.3},{transform:'scaleX(.7)',opacity:.6}],{duration:reduce?2600:1800,direction:'alternate',iterations:Infinity});
const curtain=intro.querySelector('.intro-curtain');
if(curtain)play(curtain,[{transform:'translateY(100%)'},{transform:'translateY(0)',offset:.56},{transform:'translateY(-100%)'}],{duration:reduce?1050:980,delay:2550});

timers.push(setTimeout(()=>{const out=play(intro,[{opacity:1},{opacity:1,offset:.82},{opacity:0}],{duration:reduce?360:440,easing:'cubic-bezier(.7,0,.2,1)'});out.finished.catch(()=>{}).finally(()=>{intro.hidden=true;intro.style.display='none';document.body.classList.add('intro-complete');window.dispatchEvent(new CustomEvent('cy:intro-complete'))})},3180));
window.addEventListener('beforeunload',()=>timers.forEach(clearTimeout),{once:true});
})();
