<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Element Surfers - بطيء</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Cairo',sans-serif}
body{background:#0a0e18;overflow:hidden;touch-action:none}
#cv{position:fixed;inset:0;width:100%;height:100%}
.top{position:fixed;top:8px;left:8px;right:8px;height:46px;background:#000c;border-radius:12px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;color:#fff;font-size:12px;font-weight:900;z-index:10}
.bins{position:fixed;bottom:8px;left:8px;right:8px;display:flex;gap:6px;z-index:10}
.bin{flex:1;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:#fff;box-shadow:0 4px 12px #0006}
#menu{position:fixed;inset:0;background:radial-gradient(at 50% 0%,#1e3a5a,#0a0e18);z-index:20;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:#141928;border:2px solid #F2A900;border-radius:20px;padding:18px;max-width:360px;width:100%;text-align:center;color:#fff}
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div class="top">
  <span>❤️ <b id="hp">3</b> ⭐ <b id="sc">0</b> 🪙 <b id="co">0</b></span>
  <span>📏 <b id="ds">0</b>m <button onclick="paused=!paused" style="margin-right:8px;background:#fff2;border:none;color:#fff;border-radius:8px;padding:4px 10px">⏸</button></span>
</div>
<div class="bins">
  <div class="bin" style="background:linear-gradient(90deg,#FF8C42,#FFB347)">🔥 فلز يسار</div>
  <div class="bin" style="background:#0f172a;border:1px solid #fff1">⛔</div>
  <div class="bin" style="background:linear-gradient(90deg,#38BDF8,#7ED6FF)">يمين لافلز 🌫️</div>
</div>
<div id="menu">
  <div class="card">
    <h2 style="font-weight:900;font-size:20px">🚇 Element Surfers</h2>
    <p style="font-size:12px;opacity:.6;margin-top:6px">سب واي كيمياء - النسخة البطيئة السهلة</p>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="setD('easy')" id="b1" style="flex:1;height:58px;border-radius:14px;border:2px solid #39ff14;background:#39ff1422;color:#fff;font-weight:900">🐢<br>سهل<br><small>بطيء</small></button>
      <button onclick="setD('medium')" id="b2" style="flex:1;height:58px;border-radius:14px;border:1px solid #fff2;background:#fff1;color:#fff;font-weight:900">🚶<br>متوسط</button>
      <button onclick="setD('hard')" id="b3" style="flex:1;height:58px;border-radius:14px;border:1px solid #fff2;background:#fff1;color:#fff;font-weight:900">⚡<br>سريع</button>
    </div>
    <p id="inf" style="font-size:11px;opacity:.5;margin-top:10px">سرعة 2 • صندوق كل 1.6 ثانية</p>
    <button onclick="start()" style="width:100%;height:54px;border-radius:999px;border:none;background:linear-gradient(90deg,#FF8C42,#FFD23F);font-weight:900;font-size:17px;margin-top:14px;color:#000">▶ العب الآن</button>
    <p style="font-size:11px;opacity:.6;margin-top:10px">👆 دوسي يمين / شمال الشاشة<br>اجمعي الفلزات 🔥 وتجنبي اللافلزات 🌫️</p>
  </div>
</div>
<script>
const cv=document.getElementById('cv'),cx=cv.getContext('2d');
function rs(){cv.width=innerWidth;cv.height=innerHeight}rs();addEventListener('resize',rs);
const ELS=[
 {s:'Fe',n:'الحديد',m:1,c:'#FF8C42'},{s:'Al',n:'الالومنيوم',m:1,c:'#FFB347'},
 {s:'Cu',n:'النحاس',m:1,c:'#FF6B35'},{s:'Au',n:'الذهب',m:1,c:'#FFD23F'},
 {s:'S',n:'الكبريت',m:0,c:'#4FC3F7'},{s:'O',n:'الاكسجين',m:0,c:'#7ED6FF'},
 {s:'C',n:'الكربون',m:0,c:'#5BA4E5'},{s:'Cl',n:'الكلور',m:0,c:'#64B5F6'}
];
let lane=1,tx=1,spd=2,diff='easy',dist=0,score=0,coins=0,hp=3,objs=[],t=0,run=false,paused=false,msg='',msgT=0;
function LX(l){return innerWidth*0.25+l*innerWidth*0.25}
function setD(d){diff=d;spd=d=='easy'?2:d=='medium'?3.5:5.5;
 document.getElementById('b1').style.border=d=='easy'?'2px solid #39ff14':'1px solid #fff2';
 document.getElementById('b2').style.border=d=='medium'?'2px solid #F2A900':'1px solid #fff2';
 document.getElementById('b3').style.border=d=='hard'?'2px solid #ef4444':'1px solid #fff2';
 document.getElementById('inf').textContent=d=='easy'?'سرعة 2 • بطيء جدا - مناسب للموبايل':d=='medium'?'سرعة 3.5 • متوسط':'سرعة 5.5 • سريع';
}
function start(){document.getElementById('menu').style.display='none';run=true;dist=score=coins=0;hp=3;objs=[];lane=tx=1;t=0;msg='';}
function loop(){
 requestAnimationFrame(loop);
 const W=innerWidth,H=innerHeight;
 let x=LX(lane); // smooth
 window._x = window._x || x;
 window._x += (LX(tx)-window._x)*0.12;
 if(!run){draw();return}
 if(paused){draw();return}
 t++;dist+=spd*0.25;
 if(t% (diff=='easy'?100:diff=='medium'?70:45) ==0){
  const el=ELS[Math.floor(Math.random()*ELS.length)];
  objs.push({lane:Math.floor(Math.random()*3),y:-60,el});
 }
 objs.forEach(o=>o.y+=spd);
 objs=objs.filter(o=>{
  if(o.y>H-130 && o.y<H-80 && o.lane==Math.round(tx)){
   if(o.el.m){score+=20;coins++;msg='✅ '+o.el.n+' فلز!';msgT=50}else{hp--;msg='❌ '+o.el.n+' لافلز!';msgT=50;if(hp<=0){run=false;setTimeout(()=>{alert('انتهت القلوب! النقاط: '+score);document.getElementById('menu').style.display='flex';},150)}}
   return false;
  }
  return o.y<H+120;
 });
 document.getElementById('hp').textContent=hp;
 document.getElementById('sc').textContent=score;
 document.getElementById('co').textContent=coins;
 document.getElementById('ds').textContent=Math.floor(dist/10);
 if(msgT>0)msgT--;
 draw();
}
function draw(){
 const W=innerWidth,H=innerHeight;
 cx.fillStyle='#0a0e18';cx.fillRect(0,0,W,H);
 cx.fillStyle='#122040';cx.fillRect(W*0.15,0,W*0.7,H);
 for(let i=0;i<3;i++){cx.strokeStyle='#ffffff12';cx.beginPath();cx.moveTo(LX(i),0);cx.lineTo(LX(i),H);cx.stroke()}
 objs.forEach(o=>{
  cx.fillStyle=o.el.c;cx.fillRect(LX(o.lane)-26,o.y-26,52,52);
  cx.fillStyle='#000';cx.font='900 18px Cairo';cx.textAlign='center';cx.fillText(o.el.s,LX(o.lane),o.y+6);
 });
 const px=window._x||LX(lane);
 cx.fillStyle='#fff';cx.beginPath();cx.arc(px,H-110,18,0,Math.PI*2);cx.fill();
 cx.fillStyle='#F2A900';cx.beginPath();cx.arc(px,H-110,11,0,Math.PI*2);cx.fill();
 if(msgT>0){
  cx.fillStyle='#000c';cx.fillRect(W/2-90,H/2-18,180,34);
  cx.fillStyle='#fff';cx.font='900 13px Cairo';cx.textAlign='center';cx.fillText(msg,W/2,H/2+4);
 }
}
cv.addEventListener('touchstart',e=>{
 const X=e.touches[0].clientX;
 if(X<W/2){if(lane>0)lane--}else{if(lane<2)lane++}
 tx=lane;
},{passive:true});
cv.addEventListener('mousedown',e=>{
 if(e.clientX<innerWidth/2&&lane>0)lane--;else if(e.clientX>=innerWidth/2&&lane<2)lane++;
 tx=lane;
});
addEventListener('keydown',e=>{if(e.key=='ArrowLeft'&&lane>0){lane--;tx=lane}if(e.key=='ArrowRight'&&lane<2){lane++;tx=lane}});
loop();
setD('easy');
</script>
</body>
</html>
