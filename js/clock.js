export class MotionClock{
  constructor(){this.listeners=new Set();this.running=false;this.t0=performance.now();this.last=this.t0;this.raf=0;this.pointer={x:.5,y:.5,tx:.5,ty:.5,velocity:0}}
  add(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
  start(){if(this.running)return;this.running=true;this.last=performance.now();this.tick(this.last)}
  stop(){this.running=false;cancelAnimationFrame(this.raf)}
  tick=now=>{if(!this.running)return;const dt=Math.min(.033,(now-this.last)/1000||0);this.last=now;const p=this.pointer;p.x+=(p.tx-p.x)*Math.min(1,dt*9);p.y+=(p.ty-p.y)*Math.min(1,dt*9);for(const fn of this.listeners)fn({t:(now-this.t0)/1000,dt,pointer:p});this.raf=requestAnimationFrame(this.tick)}
}
export function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v))}
export function lerp(a,b,t){return a+(b-a)*t}
export function easeOut(t){return 1-Math.pow(1-t,3)}
export function easeInOut(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
export function damp(a,b,lambda,dt){return lerp(a,b,1-Math.exp(-lambda*dt))}
