import {clamp,lerp,easeOut,easeInOut} from './clock.js';

const sceneDefs=[
  {name:'THE FRAME',cut:'cut'},
  {name:'KINETIC TYPE',cut:'morph'},
  {name:'EDITORIAL RHYTHM',cut:'slice'},
  {name:'SPACE / COMPOSITING',cut:'depth'},
  {name:'INSIDE THE BUILD',cut:'reframe'},
  {name:'MAKE SOMETHING MOVE',cut:'iris'}
];

export function setupScenes({scenes,clock}){
  scenes.forEach((scene,i)=>{
    scene.dataset.index=i;
    scene.dataset.sceneReady='true';
    scene.classList.toggle('is-active',i===0);
    scene.classList.toggle('is-visible',i===0);
    scene.classList.add('scene-ready');
  });

  const enterMap={0:()=>enterFrame(scenes[0]),1:()=>enterType(scenes[1]),2:()=>enterEdit(scenes[2]),3:()=>enterSpace(scenes[3]),4:()=>enterProcess(scenes[4]),5:()=>enterContact(scenes[5])};
  clock.add(state=>{
    const p=state.pointer,active=scenes.find(s=>s.classList.contains('is-active'));
    if(!active)return;
    if(active.matches('.scene-frame')){const board=active.querySelector('.frame-board');if(board)board.style.transform=`translate3d(${(p.x-.5)*8}px,${(p.y-.5)*6}px,0) rotate(${3+(p.x-.5)*1.4}deg)`}
    if(active.matches('.scene-type')){const axis=active.querySelector('.type-axis');if(axis)axis.style.transform=`translate3d(${(p.x-.5)*20}px,${(p.y-.5)*8}px,0)`}
    if(active.matches('.scene-space')){const world=active.querySelector('.space-world');if(world)world.style.transform=`perspective(1100px) rotateY(${(p.x-.5)*6}deg) rotateX(${(.5-p.y)*5}deg)`}
    const total=Math.max(1,document.documentElement.scrollHeight-innerHeight),progress=(scrollY||0)/total;document.documentElement.style.setProperty('--page-progress',progress.toFixed(4));
  });
  return {enter(index){const fn=enterMap[index];if(fn)fn()},prepare(index){const scene=scenes[index];if(scene)scene.classList.remove('is-active','is-visible','is-entering','is-exiting')},sceneDefs};
}
function animateGroup(elements,keyframes,{delay=0,duration=720}={}){return Promise.all(elements.map((el,i)=>el.animate(keyframes,{duration:duration,delay:i*48+delay,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'}).finished.catch(()=>{})))}
function reveal(scene){scene.classList.add('is-entering','is-active','is-visible');requestAnimationFrame(()=>scene.classList.add('is-live'))}
function enterFrame(scene){reveal(scene);animateGroup([...scene.querySelectorAll('.scene-copy>*')],{opacity:[0,1],transform:['translateY(25px)','none']},{duration:680});scene.querySelector('.frame-board')?.animate([{opacity:0,transform:'translate3d(28px,10px,0) rotate(8deg) scale(.94)'},{opacity:1,transform:'translate3d(0,0,0) rotate(3deg) scale(1)'}],{duration:820,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'})}
function enterType(scene){reveal(scene);scene.querySelector('.type-composition')?.animate([{clipPath:'inset(0 100% 0 0)',transform:'translateX(4vw)'},{clipPath:'inset(0)',transform:'none'}],{duration:760,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'});scene.querySelectorAll('.type-main span').forEach((el,i)=>el.animate([{transform:`translateY(${24-i*4}px) rotate(${i%2?2:-2}deg)`,opacity:0},{transform:'none',opacity:1}],{duration:560,delay:70+i*40,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'}));scene.querySelector('.type-copy')?.animate([{opacity:0,transform:'translate3d(-20px,0,0)'},{opacity:1,transform:'none'}],{duration:640,delay:150,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'})}
function enterEdit(scene){reveal(scene);scene.querySelector('.edit-rack')?.animate([{clipPath:'inset(0 0 100% 0)',transform:'translateY(3vh)'},{clipPath:'inset(0)',transform:'none'}],{duration:800,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'});scene.querySelectorAll('.edit-columns i').forEach((el,i)=>el.animate([{height:'12%'},{height:i%3===0?'74%':'54%'},{height:'26%'}],{duration:680,delay:i*42,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'}));scene.querySelector('.edit-copy')?.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'none'}],{duration:620,delay:160,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'})}
function enterSpace(scene){reveal(scene);scene.querySelector('.space-world')?.animate([{opacity:0,transform:'perspective(1100px) translateZ(-130px) rotateY(-14deg) scale(.82)'},{opacity:1,transform:'perspective(1100px) translateZ(0) rotateY(0) scale(1)'}],{duration:900,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'});scene.querySelectorAll('.plane').forEach((el,i)=>el.animate([{opacity:0,transform:`rotateX(68deg) rotateZ(${14-i*12}deg) translateY(22px)`},{opacity:1}],{duration:700,delay:i*70,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'}));scene.querySelector('.space-copy')?.animate([{opacity:0,transform:'translateX(-24px)'},{opacity:1,transform:'none'}],{duration:660,delay:110,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'})}
function enterProcess(scene){reveal(scene);scene.querySelector('.process-copy')?.animate([{opacity:0,transform:'translateY(28px)'},{opacity:1,transform:'none'}],{duration:660,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'});scene.querySelector('.breakdown')?.animate([{opacity:0,transform:'translate3d(32px,14px,0) scale(.96)'},{opacity:1,transform:'none'}],{duration:820,delay:100,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'})}
function enterContact(scene){reveal(scene);animateGroup([...scene.querySelectorAll('.scene-copy>*')],{opacity:[0,1],transform:['translateY(22px)','none']},{duration:660});scene.querySelector('.contact-mark')?.animate([{opacity:0,transform:'scale(.82) rotate(-8deg)'},{opacity:1,transform:'scale(1) rotate(0deg)'}],{duration:820,delay:100,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'})}
export {clamp,lerp,easeOut,easeInOut};
