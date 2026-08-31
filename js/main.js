import {MotionClock,clamp,easeOut,easeInOut} from './clock.js';
import {TransitionDirector} from './transitions.js';
import {setupScenes} from './scenes.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const root=document.documentElement,body=document.body,scenes=$$('.scene');
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const fine=matchMedia('(pointer:fine)').matches;
const clock=new MotionClock();
const transitions=new TransitionDirector($('#transition'));
const sceneSystem=setupScenes({scenes,clock,reduced:false});
let theme='light',accent='violet',active=0,transportLock=false,touchY=0,buildState=0;
try{theme=localStorage.getItem('cy-theme-v23')||'light';accent=localStorage.getItem('cy-accent-v23')||'violet'}catch{}
root.dataset.theme=theme;root.dataset.accent=accent;
window.addEventListener('cy:intro-complete',()=>{body.classList.add('intro-complete');sceneSystem.enter(0)},{once:true});
function persist(){try{localStorage.setItem('cy-theme-v23',theme);localStorage.setItem('cy-accent-v23',accent)}catch{}}
const themeBtn=$('#themeBtn'),accentBtn=$('#accentBtn');
function updateControls(){if(themeBtn)themeBtn.textContent=theme==='dark'?'◑':'◐';const dot=accentBtn?.querySelector('.accent-dot');if(dot)dot.style.background='var(--accent)'}
updateControls();
themeBtn?.addEventListener('click',()=>{theme=theme==='light'?'dark':'light';root.dataset.theme=theme;persist();updateControls()});
accentBtn?.addEventListener('click',()=>{const order=['violet','blue','coral'];accent=order[(order.indexOf(accent)+1)%order.length];root.dataset.accent=accent;persist();updateControls()});
const links=$$('.nav-links a');links.forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href')?.slice(1),i=scenes.findIndex(s=>s.id===id);if(i<0)return;e.preventDefault();go(i)}));
$$('[data-scene-link]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.sceneLink))));
$$('[data-next]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.next))));
function scenePosition(i){return Math.round(i*innerHeight)}
function setSceneActive(i){active=i;scenes.forEach((s,n)=>{const on=n===i;s.classList.toggle('is-active',on);s.classList.toggle('is-live',on);s.classList.remove('is-entering','is-exiting')});$$('[data-scene-link]').forEach((b,n)=>b.classList.toggle('is-current',n===i));const name=scenes[i]?.dataset.name||'';const navName=$('#sceneName');if(navName)navName.textContent=name}
function setTransportTransform(){root.style.setProperty('--scene-index',active);root.style.setProperty('--scene-progress',String(active/Math.max(1,scenes.length-1)))}
setSceneActive(0);setTransportTransform();
async function go(index){index=clamp(index,0,scenes.length-1)|0;if(index===active||transportLock)return;if(active===4&&index===5&&buildState<1){advanceBuild(1);return}if(active===4&&index===3&&buildState>0){advanceBuild(-1);return}transportLock=true;const old=scenes[active],next=scenes[index];old.classList.add('is-exiting');next.classList.add('is-entering','is-active','is-live');const transitionKind=next.dataset.transition||'cut';const transitionPromise=transitions.play({kind:transitionKind,label:next.dataset.name||''});requestAnimationFrame(()=>{smoothScrollTo(scenePosition(index),reduced?520:690);sceneSystem.enter(index)});setTimeout(()=>{old.classList.remove('is-active','is-live','is-exiting');old.style.removeProperty('z-index');next.classList.remove('is-entering');setSceneActive(index);setTransportTransform()},reduced?560:720);await transitionPromise.catch(()=>{});transportLock=false}
let scrollAnim=0;function smoothScrollTo(target,duration){cancelAnimationFrame(scrollAnim);const start=scrollY,delta=target-start,t0=performance.now(),ease=t=>easeInOut(clamp(t)),tick=now=>{const p=clamp((now-t0)/duration);window.scrollTo(0,start+delta*ease(p));if(p<1)scrollAnim=requestAnimationFrame(tick)};scrollAnim=requestAnimationFrame(tick)}
let wheelSum=0,lastWheel=0,wheelTimer=0;addEventListener('wheel',e=>{if(!fine)return;e.preventDefault();if(transportLock)return;const now=performance.now();if(now-lastWheel>420)wheelSum=0;lastWheel=now;wheelSum+=e.deltaY;clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>wheelSum=0,180);if(Math.abs(wheelSum)<62)return;const dir=wheelSum>0?1:-1;wheelSum=0;go(active+dir)},{passive:false});
addEventListener('touchstart',e=>{touchY=e.touches[0]?.clientY||0},{passive:true});addEventListener('touchend',e=>{const y=e.changedTouches[0]?.clientY||touchY,dy=touchY-y;if(Math.abs(dy)<45){smoothScrollTo(scenePosition(active),reduced?180:280);return}go(active+(dy>0?1:-1))},{passive:true});
addEventListener('keydown',e=>{if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();go(active+1)}if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();go(active-1)}if(e.key==='Home'){e.preventDefault();go(0)}if(e.key==='End'){e.preventDefault();go(scenes.length-1)}});
let syncRaf=0;addEventListener('scroll',()=>{if(syncRaf)return;syncRaf=requestAnimationFrame(()=>{syncRaf=0;if(transportLock)return;const nearest=Math.round(scrollY/Math.max(1,innerHeight));if(Math.abs(scrollY-scenePosition(nearest))<innerHeight*.08&&nearest!==active)go(nearest)})},{passive:true});
function advanceBuild(dir){const next=clamp(buildState+dir*.25,0,1),start=buildState,t0=performance.now(),duration=reduced?430:520,tick=now=>{const p=clamp((now-t0)/duration),q=easeOut(p),v=start+(next-start)*q;buildState=v;renderBuild(v);if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}
function renderBuild(v){const shape=$('#screenShape'),word=$('#screenWord'),head=$('.process-hint');if(shape)shape.style.transform=`translate3d(${(v-.5)*12}vw,${(.5-v)*4}vh,0) rotate(${v*110}deg) scale(${1-v*.2})`;if(word)word.style.transform=`translate3d(${(v-.5)*3}vw,0,0) rotate(${(v-.5)*3}deg)`;const play=$('#buildPlayhead');if(play)play.style.left=`${8+v*84}%`;const time=$('#buildTime');if(time){const frames=Math.round(v*23.976*4);time.textContent=`00:00:${String(frames%60).padStart(2,'0')}`};if(head)head.textContent=v<.24?'TYPE / KEYFRAME':v<.5?'SHAPE / MORPH':v<.76?'CAMERA / SPACE':'IMPACT / RELEASE'}
if(fine){const cursor=$('#cursor');$$('a,button,.anchor-object').forEach(el=>{el.addEventListener('pointerenter',()=>cursor?.classList.add('big'));el.addEventListener('pointerleave',()=>cursor?.classList.remove('big'))});addEventListener('pointermove',e=>{clock.pointer.tx=clamp(e.clientX/innerWidth);clock.pointer.ty=clamp(e.clientY/innerHeight)},{passive:true})}
clock.add(({pointer})=>{const x=(pointer.x-.5),y=(pointer.y-.5);const board=$('.scene-frame.is-active .frame-board');if(board)board.style.transform=`translate3d(${x*10}px,${y*7}px,0) rotate(${3+x*1.7}deg)`;const machine=$('.scene-idea.is-active .idea-machine');if(machine)machine.style.transform=`translate3d(${x*8}px,${y*6}px,0)`;const mark=$('.scene-contact.is-active .contact-mark');if(mark)mark.style.transform=`translate3d(${x*10}px,${y*7}px,0)`});clock.start();addEventListener('resize',()=>{if(Math.abs(scrollY-scenePosition(active))<80)window.scrollTo(0,scenePosition(active))},{passive:true});
