import React, { useEffect, useRef, useState, useCallback } from "react";
import logoUrl from "container:///mnt/data/src/assets/1f4e0f565803519e-element_logo_cutout.png";

type ElemType = { sym: string; name: string; isMetal: boolean; color: string; accent: string };
const ELEMENTS: ElemType[] = [
  { sym: "Fe", name: "الحديد", isMetal: true, color: "#FF8C42", accent: "#FFD9B8" },
  { sym: "Al", name: "الألمنيوم", isMetal: true, color: "#FFB347", accent: "#FFE8C6" },
  { sym: "Cu", name: "النحاس", isMetal: true, color: "#FF6B35", accent: "#FFD0B5" },
  { sym: "Au", name: "الذهب", isMetal: true, color: "#FFD23F", accent: "#FFF3B0" },
  { sym: "S", name: "الكبريت", isMetal: false, color: "#4FC3F7", accent: "#D6F0FF" },
  { sym: "O", name: "الأكسجين", isMetal: false, color: "#7ED6FF", accent: "#E1F5FF" },
  { sym: "C", name: "الكربون", isMetal: false, color: "#5BA4E5", accent: "#C9E4FF" },
  { sym: "Cl", name: "الكلور", isMetal: false, color: "#64B5F6", accent: "#D0E8FF" },
  { sym: "N", name: "النيتروجين", isMetal: false, color: "#90CAF9", accent: "#E3F2FD" },
];

const METALS = ELEMENTS.filter(e=>e.isMetal);
const NON_METALS = ELEMENTS.filter(e=>!e.isMetal);

const FUNNY_HITS = ["أووبس! ده لافلز 😅","يا ساتر!","مش فلز يا بطل!","خد بالك المرة الجاية!"];

type Difficulty = "easy"|"medium"|"hard";
const DIFFICULTY: Record<Difficulty, {label:string; sub:string; speed:number; spawnFrames:number; maxBoost:number; icon:string; desc:string}> = {
  easy: { label:"سهل", sub:"بطيء جدا", speed:2, spawnFrames:108, maxBoost:1.2, icon:"🐢", desc:"1800ms" },
  medium: { label:"متوسط", sub:"متوازن", speed:3.5, spawnFrames:72, maxBoost:1.6, icon:"🚶", desc:"1200ms" },
  hard: { label:"سريع", sub:"تحدي", speed:5.5, spawnFrames:48, maxBoost:2.0, icon:"⚡", desc:"800ms" },
};

export default function App(){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>({
    lane:1, targetLane:1, x:0, tx:0,
    speed:2, baseSpeed:2, maxBoost:1.2,
    spawnInterval:108,
    gateInterval:2700,
    dist:0, score:0, coins:0, hp:3,
    metals:0, magnet:0,
    elements:[] as any[],
    particles:[] as any[],
    gate:null as any,
    lastSpawn:0, lastGate:0, time:0,
    running:false, over:false, won:false, paused:false,
    msg:"", msgT:0,
  });
  const [hud, setHud] = useState({score:0, coins:0, hp:3, dist:0, metals:0, magnet:0});
  const [state, setState] = useState<"menu"|"playing"|"won"|"lost"|"paused">("menu");
  const [muted, setMuted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<AudioContext|null>(null);
  const touchStart = useRef<{x:number,y:number,t:number}|null>(null);

  const playTone = useCallback((f:number,d:number,type:OscillatorType="sine",vol=0.2)=>{
    if(muted) return;
    try{
      if(!audioRef.current) audioRef.current = new (window.AudioContext||(window as any).webkitAudioContext)();
      const ctx=audioRef.current;
      if(ctx.state!=="running") ctx.resume();
      const o=ctx.createOscillator(); const g=ctx.createGain();
      o.frequency.value=f; o.type=type;
      g.gain.setValueAtTime(0.0001,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(vol,ctx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+d);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime+d);
    }catch{}
  },[muted]);

  // game loop
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf=0;
    let last=performance.now();
    let trackOffset=0;

    const resize=()=>{
      const parent=containerRef.current;
      if(!parent) return;
      const dpr = Math.min(window.devicePixelRatio||1,2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width=w*dpr; canvas.height=h*dpr;
      canvas.style.width=w+"px"; canvas.style.height=h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize();
    window.addEventListener("resize",resize);

    const loop=(now:number)=>{
      raf=requestAnimationFrame(loop);
      const dt=Math.min((now-last)/16.67,2); // 60fps units
      last=now;
      const g=gameRef.current;
      const W=canvas.clientWidth;
      const H=canvas.clientHeight;
      if(!g.running){
        drawMenu(ctx,W,H,trackOffset);
        return;
      }
      if(g.paused){
        // still draw but freeze logic
        drawGame(ctx,W,H,trackOffset,g);
        return;
      }
      // update - SLOWER VERSION
      g.time+=dt;
      const speedBoost = Math.min(g.dist/1000*0.8, g.maxBoost ?? 1.5);
      const curSpeed = (g.baseSpeed ?? g.speed) + speedBoost;
      g.dist+=curSpeed*0.35*dt;
      trackOffset+=curSpeed*dt;
      if(trackOffset>40) trackOffset-=40;

      // lane lerp - slower smooth 0.12
      g.x += (g.tx - g.x)*0.12*dt;
      if(Math.abs(g.tx-g.x)<0.5) g.x=g.tx;

      // spawn elements - uses difficulty spawn interval (slow)
      const spawnInt = g.spawnInterval ?? 108; // 1800ms easy
      if(g.time - g.lastSpawn > spawnInt){
        g.lastSpawn=g.time;
        // chance magnet
        if(Math.random()<0.05 && g.magnet<=0){
          g.elements.push({lane:Math.floor(Math.random()*3), y:-80, type:{sym:"🧲",name:"مغناطيس",isMetal:true,color:"#A78BFA",accent:"#EDE9FE", power:"magnet"}, w:54,h:54});
        } else {
          const isMetal = Math.random()<0.62;
          const pool = isMetal?METALS:NON_METALS;
          const el=pool[Math.floor(Math.random()*pool.length)];
          g.elements.push({lane:Math.floor(Math.random()*3), y:-70, type:el, w:56,h:56, hit:false});
        }
      }
      // spawn gate every 45 sec (2700 frames) - slower appearance
      const gateInt = g.gateInterval ?? 2700;
      if(g.time - g.lastGate > gateInt && !g.gate){
        g.lastGate=g.time;
        const el=ELEMENTS[Math.floor(Math.random()*ELEMENTS.length)];
        g.gate={y:-220, el, h:120, passed:false};
      }

      // magnet timer
      if(g.magnet>0){
        g.magnet-=dt;
        if(g.magnet<=0) g.magnet=0;
      }

      // update elements
      const playerLaneX = laneToX(g.lane,W);
      const playerY = H-130;
      for(let i=g.elements.length-1;i>=0;i--){
        const e=g.elements[i];
        e.y+=curSpeed*dt;
        // magnet pull
        if(g.magnet>0 && e.type.isMetal && !e.type.power){
          const ex=laneToX(e.lane,W);
          const dx=playerLaneX-ex;
          e._mx=(e._mx||0)+(dx*0.04*dt);
          // fake lane shift by x offset
        } else {
          e._mx=(e._mx||0)*0.9;
        }
        if(e.y>H+100) g.elements.splice(i,1);
        // collision
        const ex=laneToX(e.lane,W)+(e._mx||0);
        const ey=e.y;
        const distX=Math.abs(ex-playerLaneX);
        const distY=Math.abs(ey-playerY);
        const sameLane = e.lane===g.targetLane || distX<36;
        if(sameLane && distY<48 && !e.hit){
          e.hit=true;
          if(e.type.power==="magnet"){
            g.magnet=300; // 5 sec
            g.score+=50;
            g.coins+=5;
            playTone(880,0.3,"sine",0.25); setTimeout(()=>playTone(1100,0.2,"sine",0.2),80);
            spawnParticles(g, ex, ey, "#A78BFA", 14);
            g.elements.splice(i,1);
          } else if(e.type.isMetal){
            g.score+=20; g.coins+=1; g.metals+=1;
            playTone(740,0.18,"sine",0.28);
            spawnParticles(g, ex, ey, e.type.color, 12);
            g.msg="+"+20+" فلز!"; g.msgT=60;
            g.elements.splice(i,1);
            if(g.metals>=20){ winGame(); }
          } else {
            // non-metal hit
            g.hp-=1; g.score=Math.max(0,g.score-10);
            g.msg=FUNNY_HITS[Math.floor(Math.random()*FUNNY_HITS.length)]; g.msgT=90;
            playTone(180,0.35,"sawtooth",0.18);
            spawnParticles(g, ex, ey, "#60A5FA", 10);
            g.elements.splice(i,1);
            if(g.hp<=0){ loseGame(); }
          }
        } else if(g.magnet>0 && e.type.isMetal && distY<80 && Math.abs((e._mx||0)+laneToX(e.lane,W)-playerLaneX)<80){
          // auto collect due to proximity with magnet
          if(!e.type.power){
            g.score+=20; g.coins+=1; g.metals+=1;
            spawnParticles(g, ex, ey, e.type.color, 8);
            g.elements.splice(i,1);
          }
        }
      }

      // gate logic
      if(g.gate){
        g.gate.y+=curSpeed*0.9*dt;
        if(g.gate.y>H+150) g.gate=null;
        else if(!g.gate.passed && g.gate.y>playerY-60 && g.gate.y<playerY+20){
          g.gate.passed=true;
          const needLeft = g.gate.el.isMetal;
          const inLeft = g.targetLane===0 || g.targetLane===1; // left 2 lanes = metals? Actually per spec left gate = metal
          // Our gate visual: left half orange metal, right half blue non-metal, middle blocked (lane 1 blocked)
          // So correct: if metal -> lane 0, if non-metal -> lane 2
          const correct = (needLeft && g.targetLane===0) || (!needLeft && g.targetLane===2);
          if(correct){
            g.score+=50; g.coins+=3;
            g.msg="تصنيف صحيح! "+g.gate.el.sym; g.msgT=90;
            playTone(660,0.15,"sine",0.25); setTimeout(()=>playTone(880,0.25,"sine",0.25),120);
            spawnParticles(g, playerLaneX, playerY, needLeft?"#FF8C42":"#60A5FA", 18);
          } else {
            if(g.targetLane===1){ // hit middle wall
              g.hp-=1; g.msg="الحاجز الوسطي! اختر جانب!"; g.msgT=90;
              playTone(120,0.4,"square",0.2);
              if(g.hp<=0) loseGame();
            } else {
              g.score=Math.max(0,g.score-20);
              g.msg="تصنيف خاطئ! "+g.gate.el.sym+" هو "+(g.gate.el.isMetal?"فلز":"لافلز");
              g.msgT=110;
              playTone(200,0.3,"sawtooth",0.2);
            }
          }
        }
      }

      // particles
      for(let i=g.particles.length-1;i>=0;i--){
        const p=g.particles[i];
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=0.12*dt; p.life-=dt;
        if(p.life<=0) g.particles.splice(i,1);
      }

      if(g.msgT>0) g.msgT-=dt;

      // win distance
      if(g.dist>=1000) winGame();

      // draw
      drawGame(ctx,W,H,trackOffset,g);
      // update hud react throttled
      if(g.time%6<1){
        setHud({score:g.score, coins:g.coins, hp:g.hp, dist:Math.floor(g.dist), metals:g.metals, magnet:Math.ceil(g.magnet/60)});
      }
    };

    const drawMenu=(ctx:CanvasRenderingContext2D,W:number,H:number,off:number)=>{
      drawBackground(ctx,W,H,off,0);
    };

    const laneToX=(lane:number,W:number)=>{
      const trackW = Math.min(W*0.78, 380);
      const start = (W-trackW)/2;
      const laneW = trackW/3;
      return start + laneW*lane + laneW/2;
    };

    const drawBackground=(ctx:CanvasRenderingContext2D,W:number,H:number,off:number,dist:number)=>{
      // sky gradient
      const grad=ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,"#0F172A");
      grad.addColorStop(0.4,"#1E293B");
      grad.addColorStop(1,"#334155");
      ctx.fillStyle=grad;
      ctx.fillRect(0,0,W,H);
      // moving lines illusion
      ctx.strokeStyle="rgba(255,255,255,0.06)";
      ctx.lineWidth=1;
      for(let y=-40+off%40;y<H;y+=40){
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }
    };

    const drawGame=(ctx:CanvasRenderingContext2D,W:number,H:number,off:number,g:any)=>{
      drawBackground(ctx,W,H,off,g.dist);
      const trackW = Math.min(W*0.78, 380);
      const startX = (W-trackW)/2;
      const laneW = trackW/3;

      // tracks base
      ctx.fillStyle="#0B1220";
      ctx.fillRect(startX-12,0,trackW+24,H);
      // sleepers
      ctx.fillStyle="#1F2A3A";
      for(let y=-30+off%40;y<H;y+=40){
        ctx.fillRect(startX-8,y,trackW+16,8);
      }
      // rails
      for(let i=0;i<=3;i++){
        const x=startX+i*laneW;
        ctx.strokeStyle=i===0||i===3?"#475569":"#334155";
        ctx.lineWidth=i===0||i===3?4:2;
        ctx.setLineDash(i===1||i===2?[18,18]:[]);
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
        ctx.setLineDash([]);
      }

      // gate
      if(g.gate){
        const gy=g.gate.y;
        const el=g.gate.el;
        const gh=g.gate.h;
        // draw arch
        // left gate
        ctx.fillStyle=el.isMetal?"#FF8C42":"#1E293B";
        ctx.globalAlpha=el.isMetal?1:0.35;
        ctx.fillRect(startX, gy, laneW-4, gh);
        // middle blocked
        ctx.globalAlpha=1;
        ctx.fillStyle="#0F172A";
        ctx.fillRect(startX+laneW, gy, laneW-4, gh);
        ctx.fillStyle="rgba(255,255,255,0.08)";
        for(let k=0;k<gh;k+=12){
          ctx.fillRect(startX+laneW, gy+k, laneW-4, 6);
        }
        // right gate
        ctx.fillStyle=!el.isMetal?"#38BDF8":"#1E293B";
        ctx.globalAlpha=!el.isMetal?1:0.35;
        ctx.fillRect(startX+laneW*2, gy, laneW-4, gh);

        ctx.globalAlpha=1;
        // labels
        ctx.fillStyle="white";
        ctx.font="bold 13px Cairo, sans-serif";
        ctx.textAlign="center";
        ctx.fillText("فلزات", startX+laneW/2, gy+22);
        ctx.fillText("⛔", startX+laneW+laneW/2, gy+28);
        ctx.fillText("لافلزات", startX+laneW*2+laneW/2, gy+22);
        // element sign center top
        ctx.fillStyle="#F8FAFC";
        ctx.fillRect(W/2-56, gy-36,112,32);
        ctx.strokeStyle="#E2E8F0"; ctx.strokeRect(W/2-56, gy-36,112,32);
        ctx.fillStyle="#0F172A";
        ctx.font="bold 16px monospace";
        ctx.fillText(el.sym+" - "+el.name, W/2, gy-16);
      }

      // elements
      for(const e of g.elements){
        const ex=laneToX(e.lane,W)+(e._mx||0);
        const ey=e.y;
        if(ey<-80||ey>H+80) continue;
        ctx.save();
        ctx.translate(ex,ey);
        // shadow
        ctx.fillStyle="rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.ellipse(0,22,20,6,0,0,Math.PI*2); ctx.fill();
        // crate
        const isPower = !!e.type.power;
        ctx.fillStyle=isPower?"#DDD6FE":e.type.color;
        ctx.strokeStyle=isPower?"#8B5CF6":"rgba(0,0,0,0.2)";
        ctx.lineWidth=2;
        roundRect(ctx,-e.w/2,-e.h/2,e.w,e.h,10);
        ctx.fill(); ctx.stroke();
        // inner highlight
        ctx.fillStyle="rgba(255,255,255,0.35)";
        roundRect(ctx,-e.w/2+4,-e.h/2+4,e.w-8,10,4);
        ctx.fill();
        ctx.fillStyle=isPower?"#4C1D95":"#0F172A";
        ctx.font=isPower?"bold 24px sans-serif":"bold 18px monospace";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(e.type.sym,0,2);
        if(!isPower){
          ctx.font="bold 9px Cairo, sans-serif";
          ctx.fillStyle="rgba(0,0,0,0.6)";
          ctx.fillText(e.type.isMetal?"فلز":"لافلز",0,18);
        }
        ctx.restore();
      }

      // particles
      for(const p of g.particles){
        ctx.globalAlpha=Math.max(0,p.life/30);
        ctx.fillStyle=p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;

      // player
      const px = laneToX(g.targetLane,W)*0.15 + g.x*0.85; // smoothed already but ensure
      // Actually g.x is interpolated, but we computed px via laneToX? Let's just use g.x
      const playerX = g.x || laneToX(g.targetLane,W);
      const py = H-130;
      ctx.save();
      ctx.translate(playerX,py);
      // shadow
      ctx.fillStyle="rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(0,38,22,8,0,0,Math.PI*2); ctx.fill();
      // trail when magnet
      if(g.magnet>0){
        ctx.fillStyle="rgba(167,139,250,0.35)";
        ctx.beginPath(); ctx.arc(0,18, 32+Math.sin(g.time*0.2)*4,0,Math.PI*2); ctx.fill();
      }
      // backpack
      ctx.fillStyle="#FF8C42";
      roundRect(ctx,-14, -6, 28, 26, 7);
      ctx.fill();
      ctx.fillStyle="#0F172A";
      ctx.font="bold 10px sans-serif"; ctx.textAlign="center";
      ctx.fillText("Fe",0,10);
      // body
      ctx.fillStyle="#F8FAFC";
      roundRect(ctx,-16, -2, 32, 28, 8);
      ctx.fill();
      // head
      ctx.fillStyle="#FDBA74";
      ctx.beginPath(); ctx.arc(0,-14,16,0,Math.PI*2); ctx.fill();
      // cap
      ctx.fillStyle="#38BDF8";
      ctx.beginPath(); ctx.arc(0,-22,16,Math.PI,0); ctx.fill();
      ctx.fillRect(-16,-22,32,6);
      // eyes
      ctx.fillStyle="#0F172A";
      ctx.beginPath(); ctx.arc(-5,-12,2.5,0,Math.PI*2); ctx.arc(5,-12,2.5,0,Math.PI*2); ctx.fill();
      // legs running wiggle
      const wig = Math.sin(g.time*0.5)*6;
      ctx.fillStyle="#1E293B";
      ctx.fillRect(-10+wig,24,8,18);
      ctx.fillRect(2-wig,24,8,18);
      // shoes
      ctx.fillStyle="#FF8C42";
      ctx.fillRect(-11+wig,40,10,6);
      ctx.fillRect(1-wig,40,10,6);
      ctx.restore();

      // floating message
      if(g.msgT>0){
        ctx.fillStyle="rgba(15,23,42,0.9)";
        roundRect(ctx,W/2-110, 84,220,34,18);
        ctx.fill();
        ctx.fillStyle="white";
        ctx.font="bold 14px Cairo, sans-serif";
        ctx.textAlign="center";
        ctx.fillText(g.msg,W/2,105);
      }
    };

    const roundRect=(ctx:any,x:number,y:number,w:number,h:number,r:number)=>{
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
    };

    const winGame=()=>{
      const g=gameRef.current;
      if(g.over) return;
      g.over=true; g.won=true; g.running=false;
      setState("won");
      playTone(523,0.2,"sine",0.3); setTimeout(()=>playTone(659,0.2,"sine",0.3),150); setTimeout(()=>playTone(784,0.4,"sine",0.3),300);
    };
    const loseGame=()=>{
      const g=gameRef.current;
      if(g.over) return;
      g.over=true; g.won=false; g.running=false;
      setState("lost");
      playTone(150,0.5,"sawtooth",0.25);
    };

    // init lane positions
    const init=()=>{
      const W=canvas.clientWidth;
      const firstX=laneToX(1,W);
      gameRef.current.x=firstX; gameRef.current.tx=firstX;
    };
    init();

    raf=requestAnimationFrame(loop);
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[playTone]);

  const startGame=(forcedDiff?:Difficulty)=>{
    const d = forcedDiff || difficulty;
    const cfg = DIFFICULTY[d];
    const g=gameRef.current;
    g.lane=1; g.targetLane=1;
    g.baseSpeed=cfg.speed;
    g.speed=cfg.speed;
    g.maxBoost=cfg.maxBoost;
    g.spawnInterval=cfg.spawnFrames;
    g.gateInterval=2700; // 45 sec - slower gate
    g.dist=0; g.score=0; g.coins=0; g.hp=3; g.metals=0; g.magnet=0;
    g.elements=[]; g.particles=[]; g.gate=null; g.lastSpawn=0; g.lastGate=0; g.time=0; g.over=false; g.won=false; g.running=true; g.paused=false;
    g.msg=""; g.msgT=0;
    const canvas=canvasRef.current;
    if(canvas){
      const W=canvas.clientWidth;
      const trackW=Math.min(W*0.78,380);
      const start=(W-trackW)/2;
      const laneW=trackW/3;
      const tx=start+laneW*1+laneW/2;
      g.x=tx; g.tx=tx;
    }
    setHud({score:0,coins:0,hp:3,dist:0,metals:0,magnet:0});
    setIsPaused(false);
    setState("playing");
    playTone(440,0.12,"sine",0.2);
  };

  const togglePause=()=>{
    const g=gameRef.current;
    if(!g.running) return;
    g.paused=!g.paused;
    setIsPaused(g.paused);
    if(g.paused){
      setState("paused" as any);
    }else{
      setState("playing");
    }
    playTone(g.paused?220:440,0.1,"sine",0.15);
  };

  const moveLane=(dir:number)=>{
    const g=gameRef.current;
    if(!g.running || g.paused) return;
    const nl=Math.max(0,Math.min(2,g.targetLane+dir));
    if(nl!==g.targetLane){
      g.targetLane=nl;
      g.lane=nl;
      const canvas=canvasRef.current;
      if(canvas){
        const W=canvas.clientWidth;
        g.tx=laneToXLocal(nl,W);
      }
      playTone(300,0.08,"square",0.08);
    }
  };
  const laneToXLocal=(lane:number,W:number)=>{
    const trackW=Math.min(W*0.78,380);
    const start=(W-trackW)/2;
    const laneW=trackW/3;
    return start+laneW*lane+laneW/2;
  };

  const handlePointerDown=(e:React.PointerEvent)=>{
    (e.target as Element).setPointerCapture?.(e.pointerId);
    touchStart.current={x:e.clientX,y:e.clientY,t:Date.now()};
  };
  const handlePointerUp=(e:React.PointerEvent)=>{
    const s=touchStart.current;
    if(!s) return;
    const dx=e.clientX-s.x;
    const dy=e.clientY-s.y;
    const dt=Date.now()-s.t;
    if(Math.abs(dx)>30 && dt<400){
      if(dx>0) moveLane(1); else moveLane(-1);
    } else {
      // tap zones
      const W=containerRef.current?.clientWidth||400;
      if(e.clientX < W*0.4) moveLane(-1);
      else if(e.clientX > W*0.6) moveLane(1);
    }
    touchStart.current=null;
  };

  // keyboard
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==="Escape"||e.key==="p"||e.key==="P") togglePause();
      if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A") moveLane(-1);
      if(e.key==="ArrowRight"||e.key==="d"||e.key==="D") moveLane(1);
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);

  const spawnParticles=(g:any,x:number,y:number,color:string,count:number)=>{
    for(let i=0;i<count;i++){
      g.particles.push({
        x,y,
        vx:(Math.random()-0.5)*8,
        vy:(Math.random()-0.5)*8-2,
        life: 20+Math.random()*20,
        size: 2+Math.random()*4,
        color
      });
    }
  };

  return (
    <div className="w-full h-[100svh] bg-[#0B1220] flex flex-col items-center justify-center font-[Cairo,system-ui] select-none overflow-hidden touch-manipulation">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;800&family=JetBrains+Mono:wght@700&display=swap');
        *{font-family:Cairo,system-ui}
        .mono{font-family:'JetBrains Mono',monospace}
      `}</style>

      <div ref={containerRef} className="relative w-full max-w-[480px] h-full max-h-[900px] bg-[#0F172A] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden md:rounded-[28px]">
        {/* logo top-left */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          <div className="relative w-12 h-12 rounded-2xl bg-[#101C2E] border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.55),0_0_40px_rgba(255,140,66,0.35)]">
            <img src={logoUrl} alt="عناصر" className="w-[36px] h-[36px] object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent pointer-events-none"/>
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[11px] tracking-[0.18em] text-white/50 mono">ELEMENT RUN</span>
            <span className="text-[13px] font-extrabold text-white -mt-0.5">عالم العناصر</span>
          </div>
        </div>

        {/* HUD - top bar with pause */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {state==="playing" || isPaused ? (
            <button onClick={togglePause} className="w-9 h-9 rounded-full bg-white/15 backdrop-blur border border-white/15 text-white flex items-center justify-center text-[14px] shadow hover:bg-white/20 transition-colors" aria-label="pause">
              {isPaused?"▶":"⏸"}
            </button>
          ):null}
          <button onClick={()=>setMuted(m=>!m)} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white flex items-center justify-center text-[14px] hover:bg-white/15 transition-colors">{muted?"🔇":"🔊"}</button>
          <div className="h-9 px-3 rounded-full bg-white text-[#0F172A] flex items-center gap-2 text-[13px] font-extrabold shadow-lg">
            <span className="mono">{hud.score}</span><span className="text-[10px] opacity-60">نقطة</span>
          </div>
        </div>

        <div className="absolute top-[58px] left-0 right-0 z-20 px-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {Array.from({length:3}).map((_,i)=>(
              <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] border transition-all ${i < hud.hp ? "bg-[#FF5A5F] border-white/20 shadow-[0_0_12px_rgba(255,90,95,0.6)]" : "bg-white/10 border-white/5 opacity-40"}`}>❤️</div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 px-2.5 rounded-full bg-[#FF8C42] text-white flex items-center gap-1.5 text-[11px] font-bold shadow">
              <span>🔥</span><span className="mono">{hud.metals}/20</span>
            </div>
            <div className="h-7 px-2.5 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white flex items-center gap-1 text-[11px] font-bold">
              <span>🪙</span><span className="mono">{hud.coins}</span>
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div className="absolute top-[94px] left-3 right-3 z-20 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FF8C42] to-[#FFD23F] transition-all duration-300" style={{width:`${Math.min(100, (hud.dist/1000)*100)}%`}}/>
          <div className="absolute inset-0 flex items-center justify-between px-2 text-[8px] mono text-white/60">
            <span>0m</span><span>1000m</span>
          </div>
        </div>
        <div className="absolute top-[108px] left-3 right-3 z-20 flex justify-between text-[10px] mono text-white/40">
          <span>{hud.dist}m</span>
          {hud.magnet>0 && <span className="text-[#A78BFA] animate-pulse font-bold">🧲 مغناطيس {hud.magnet}s</span>}
        </div>

        {/* canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        />

        {/* tap zones visual hint */}
        {state==="playing" && (
          <>
            <div className="absolute bottom-[18%] left-0 w-[38%] h-[40%] z-10 flex items-end justify-start pl-4 pb-6 opacity-[0.18] pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">←</div>
            </div>
            <div className="absolute bottom-[18%] right-0 w-[38%] h-[40%] z-10 flex items-end justify-end pr-4 pb-6 opacity-[0.18] pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">→</div>
            </div>
          </>
        )}

        {/* Start screen - SLOW VERSION with difficulty selector */}
        {state==="menu" && (
          <div className="absolute inset-0 z-30 bg-gradient-to-b from-[#0F172A]/90 via-[#0F172A]/80 to-[#0B1220]/95 backdrop-blur-[3px] flex flex-col items-center justify-start pb-8 pt-[72px] px-5 text-center overflow-y-auto">
            <div className="flex flex-col items-center w-full max-w-[360px] mx-auto">
              <div className="w-24 h-24 rounded-[26px] bg-[#0E1B2F] border border-white/10 shadow-[0_0_40px_rgba(56,189,248,0.35),0_0_70px_rgba(255,140,66,0.2)] flex items-center justify-center mb-4">
                <img src={logoUrl} alt="logo big" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-[26px] font-black text-white leading-none tracking-tight">SUBWAY ELEMENT RUN</h1>
              <p className="text-[#FF8C42] font-extrabold text-[14px] mt-1">النسخة البطيئة الهادئة ✨</p>
              
              {/* difficulty selector */}
              <div className="mt-5 w-full bg-white/[0.06] border border-white/10 rounded-[20px] p-3">
                <p className="text-white/90 text-[13px] font-black text-right mb-2.5">اختر السرعة:</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(DIFFICULTY) as Difficulty[]).map((key)=>{
                    const cfg=DIFFICULTY[key];
                    const active=difficulty===key;
                    return (
                      <button key={key} onClick={()=>setDifficulty(key)}
                        className={`relative rounded-2xl py-3 px-2 border transition-all flex flex-col items-center gap-1 ${active?"bg-white text-[#0F172A] border-white shadow-[0_6px_20px_rgba(255,255,255,0.25)] scale-[1.02]":"bg-white/10 text-white border-white/10 hover:bg-white/15"}`}>
                        <span className="text-[18px]">{cfg.icon}</span>
                        <span className="text-[13px] font-black">{cfg.label}</span>
                        <span className={`text-[9px] ${active?"text-black/60":"text-white/50"} leading-none`}>{cfg.sub}</span>
                        <span className={`mt-1 text-[8px] mono px-1.5 py-0.5 rounded-full ${active?"bg-black/10":"bg-white/10"}`}>{cfg.desc}</span>
                        {active && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#22C55E] text-white text-[11px] flex items-center justify-center border-2 border-[#0F172A]">✓</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-xl bg-[#0B1220]/70 border border-white/5 p-2.5 text-right">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/40 mono">السرعة الأساسية</span>
                    <span className="text-white font-bold mono">{DIFFICULTY[difficulty].speed}</span>
                  </div>
                  <div className="flex justify-between text-[11px] mt-1">
                    <span className="text-white/40 mono">ظهور الصناديق</span>
                    <span className="text-white font-bold mono">{DIFFICULTY[difficulty].spawnFrames*16.67|0}ms</span>
                  </div>
                  <div className="flex justify-between text-[11px] mt-1">
                    <span className="text-white/40 mono">البوابة</span>
                    <span className="text-white font-bold">كل 45 ثانية</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-right w-full">
                <p className="text-white text-[13px] font-bold leading-6">🎮 اجمع الفلزات 🔥 • تجنب اللافلزات 🌫️<br/>🚧 البوابة: <span className="text-[#FF8C42]">فلز يسار</span> و <span className="text-[#38BDF8]">لافلز يمين</span><br/>🧲 مغناطيس = جمع تلقائي</p>
                <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                  {ELEMENTS.slice(0,8).map(e=>(
                    <div key={e.sym} className="rounded-xl py-1 text-center border" style={{background:e.color, borderColor:"rgba(0,0,0,0.1)"}}>
                      <div className="mono text-[11px] font-black text-black/80">{e.sym}</div>
                      <div className="text-[7px] font-bold text-black/60">{e.isMetal?"فلز":"لافلز"}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={()=>startGame()} className="mt-5 w-full h-[54px] rounded-full bg-gradient-to-r from-[#FF8C42] to-[#FFD23F] text-[#0F172A] font-black text-[17px] shadow-[0_10px_30px_rgba(255,140,66,0.4)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                <span>العب الآن - {DIFFICULTY[difficulty].label}</span><span className="text-xl">▶</span>
              </button>
              <p className="mt-2.5 text-white/35 text-[10px] mono leading-4">حركة أبطأ • lerp 0.12 • ممرات ناعمة<br/>tap أو ← → • ⏸ للإيقاف المؤقت</p>
            </div>
          </div>
        )}

        {state==="paused" && isPaused && (
          <div className="absolute inset-0 z-30 bg-[#0F172A]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-[20px] bg-white/10 border border-white/15 flex items-center justify-center text-[32px] mb-4">⏸</div>
            <h2 className="text-[22px] font-black text-white">متوقف مؤقتاً</h2>
            <p className="text-white/50 text-[13px] mt-2">اللعبة في وضع الإيقاف - خذ نفس!</p>
            <div className="mt-5 flex flex-col gap-3 w-full max-w-[260px]">
              <button onClick={togglePause} className="h-12 rounded-full bg-white text-[#0F172A] font-black">متابعة اللعب ▶</button>
              <button onClick={()=>{ gameRef.current.paused=false; setIsPaused(false); setState("menu"); }} className="h-11 rounded-full bg-white/10 border border-white/10 text-white/70 font-bold text-[13px]">القائمة الرئيسية</button>
            </div>
            <div className="mt-6 mono text-[10px] text-white/30">السرعة: {DIFFICULTY[difficulty].speed} • الصناديق كل {DIFFICULTY[difficulty].spawnFrames*16.67|0}ms</div>
          </div>
        )}

        {state==="won" && (
          <div className="absolute inset-0 z-30 bg-[#0F172A]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="text-[64px]">🏆</div>
            <h2 className="text-[28px] font-black text-white mt-2">Chicken Dinner! 🍗</h2>
            <p className="text-white/70 mt-2 text-[14px]">وصلت {hud.dist}m على سرعة {DIFFICULTY[difficulty].label}! جمعت {hud.metals} فلز!</p>
            <div className="mt-4 bg-white rounded-2xl px-5 py-3 mono text-[#0F172A] font-black">النتيجة: {hud.score} • عملات: {hud.coins}</div>
            <button onClick={()=>startGame()} className="mt-6 h-12 px-8 rounded-full bg-white text-[#0F172A] font-black">العب مرة أخرى</button>
            <button onClick={()=>{ setIsPaused(false); setState("menu"); }} className="mt-3 text-white/40 text-[12px]">تغيير السرعة</button>
          </div>
        )}
        {state==="lost" && (
          <div className="absolute inset-0 z-30 bg-[#0F172A]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="text-[56px]">💥</div>
            <h2 className="text-[26px] font-black text-white mt-2">انتهت الطاقة!</h2>
            <p className="text-white/60 mt-2 text-[13px]">سرعة {DIFFICULTY[difficulty].label} • جمعت {hud.metals} فلز • مسافة {hud.dist}m</p>
            <p className="mt-2 text-[#FF8C42] text-[13px] font-bold">تذكر: Fe, Al, Cu, Au هي فلزات تلمع!</p>
            <div className="mt-6 flex gap-3">
              <button onClick={()=>startGame()} className="h-12 px-7 rounded-full bg-[#FF8C42] text-white font-black shadow-lg">حاول ثانية</button>
              <button onClick={()=>{ setIsPaused(false); setState("menu"); }} className="h-12 px-7 rounded-full bg-white/10 border border-white/15 text-white font-bold">القائمة</button>
            </div>
          </div>
        )}

        {/* bins bottom hint */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex gap-2 pointer-events-none">
          <div className="flex-1 h-10 rounded-full bg-gradient-to-r from-[#FF8C42]/90 to-[#FF8C42]/70 border border-white/20 flex items-center justify-center gap-2 text-white font-black text-[12px] shadow">
            <span>🔥</span><span>فلزات</span><span className="opacity-60 text-[10px]">يسار</span>
          </div>
          <div className="flex-1 h-10 rounded-full bg-[#0F172A] border border-white/10 flex items-center justify-center text-white/30 font-black text-[11px]">⛔ وسط مسدود</div>
          <div className="flex-1 h-10 rounded-full bg-gradient-to-r from-[#38BDF8]/70 to-[#38BDF8]/90 border border-white/20 flex items-center justify-center gap-2 text-white font-black text-[12px] shadow">
            <span className="opacity-60 text-[10px]">يمين</span><span>لافلزات</span><span>🌫️</span>
          </div>
        </div>
      </div>
    </div>
  );
}
