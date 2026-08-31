export class TransitionDirector{
  constructor(el){this.el=el;this.object=el?.querySelector('.transition-object');this.label=el?.querySelector('#transitionLabel');this.running=false;this.current=null}
  async play({kind='cut',label='',accent,from=0,to=1}){
    if(!this.el||!this.object||this.running)return;
    this.running=true;
    const obj=this.object;
    if(accent)document.documentElement.style.setProperty('--accent',accent);
    if(this.label)this.label.textContent=label;
    this.el.classList.add('is-running',`is-${kind}`);
    obj.getAnimations().forEach(a=>a.cancel());
    const frames=this.frames(kind);
    const anim=obj.animate(frames,{duration:700,easing:'cubic-bezier(.23,1,.32,1)',fill:'forwards'});
    await anim.finished.catch(()=>{});
    anim.cancel();
    this.el.classList.remove('is-running',`is-${kind}`);
    obj.style.cssText='';
    this.running=false;
  }
  frames(kind){
    if(kind==='morph')return[
      {transform:'translate3d(-50%,-50%,0) scale(.01)',borderRadius:'50%',opacity:0},
      {transform:'translate3d(-50%,-50%,0) scale(2.5)',borderRadius:'38%',opacity:1,offset:.34},
      {transform:'translate3d(-50%,-50%,0) scale(35,1.8)',borderRadius:'999px',opacity:.98,offset:.62},
      {transform:'translate3d(-50%,-50%,0) scale(.01)',borderRadius:'50%',opacity:0}
    ];
    if(kind==='slice')return[
      {transform:'translate3d(-50%,-50%,0) scaleX(.02)',borderRadius:'14px',opacity:0},
      {transform:'translate3d(-50%,-50%,0) scaleX(.9)',borderRadius:'18px',opacity:1,offset:.4},
      {transform:'translate3d(-50%,-50%,0) scaleX(35)',borderRadius:'8px',opacity:.98,offset:.67},
      {transform:'translate3d(50%,-50%,0) scaleX(.02)',borderRadius:'14px',opacity:0}
    ];
    if(kind==='depth')return[
      {transform:'translate3d(-50%,-50%,0) scale(.01) rotate(-8deg)',borderRadius:'22%',opacity:0},
      {transform:'translate3d(-50%,-50%,0) scale(1)',borderRadius:'26%',opacity:1,offset:.35},
      {transform:'translate3d(-50%,-50%,0) scale(22) rotate(4deg)',borderRadius:'18%',opacity:.98,offset:.65},
      {transform:'translate3d(-50%,-50%,0) scale(.01)',borderRadius:'50%',opacity:0}
    ];
    if(kind==='iris')return[
      {transform:'translate3d(-50%,-50%,0) scale(.01)',borderRadius:'50%',opacity:0},
      {transform:'translate3d(-50%,-50%,0) scale(1)',borderRadius:'50%',opacity:1,offset:.35},
      {transform:'translate3d(-50%,-50%,0) scale(25)',borderRadius:'50%',opacity:.98,offset:.68},
      {transform:'translate3d(-50%,-50%,0) scale(.01)',borderRadius:'50%',opacity:0}
    ];
    return[
      {transform:'translate3d(-50%,-50%,0) scaleX(.02)',borderRadius:'999px',opacity:0},
      {transform:'translate3d(-50%,-50%,0) scaleX(1)',borderRadius:'999px',opacity:1,offset:.35},
      {transform:'translate3d(-50%,-50%,0) scaleX(35)',borderRadius:'999px',opacity:.98,offset:.68},
      {transform:'translate3d(-50%,-50%,0) scaleX(.02)',borderRadius:'999px',opacity:0}
    ];
  }
}
