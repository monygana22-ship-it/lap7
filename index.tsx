<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Element Surfers - بطيء</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Cairo',sans-serif}
body{background:#0a0e18;overflow:hidden;touch-action:none}
#cv{position:fixed;inset:0;width:100%;height:100%}
.top{position:absolute;top:8px;left:8px;right:8px;height:46px;background:#000c;border-radius:12px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;color:#fff;font-size:12px;font-weight:900;z-index:10}
.logo{position:fixed;top:62px;left:8px;background:#000;border:2px solid #F2A900;border-radius:10px;padding:4px 8px;color:#F2A900;font-weight:900;font-size:10px;line-height:1;text-align:center;z-index:10}
.bins{position:fixed;bottom:8px;left:8px;right:8px;display:flex;gap:6px;z-index:10}
.bin{flex:1;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:#fff}
#menu{position:fixed;inset:0;background:radial-gradient(#1e3a5a,#0a0e18);z-index:20;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:#141928;border:2px solid #F2A900;border-radius:20px;padding:18px;max-width:360px;width:100%;text-align:center;color:#fff}
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div class="top"><span>❤️ <b id="hp">3</b> ⭐ <span id="sc">0</span> 🪙 <span id="co">0</span></span><span>📏 <b id="ds">0</b>m</span><button id="pauseBtn" onclick="paused=!paused" style="background:#fff2;border:none;color:#fff;border-radius:8px;padding:4px 8px">⏸</button></div>
<div class="logo">Fe<br>VS<br>O</div>
<div class="bins"><div class="bin" style="background:linear-gradient(90deg,#FF8C42,#FFB347)">🔥 فلز يسار</div><div class="bin" style="background:#000">⛔ وسط</div><div class="bin" style="background:linear-gradient(90deg,#38BDF8,#7ED6FF)">يمين لافلز 🌫️</div></div>
<div id="menu"><div class="card">
<h2 style="font-weight:900">🚇 Element Surfers</h2>
<p style="font-size:12px;opacity:.7;margin-top:6px">النسخة البطيئة - سهلة للموبايل</p>
<div style="display:flex;gap:8px;margin-top:14px">
<button onclick="diff='easy';spd=2;updateBtn()" id="b1" style="flex:1;height:56px;border-radius:14px;border:2px solid #39ff14;background:#39ff1422;color:#fff;font-weight:900">🐢<br>سهل</button>
<button onclick="diff='medium';spd=3.5;updateBtn()" id="b2" style="flex:1;height:56px;border-radius:14px;border:1px solid #fff2;background:#fff1;color:#fff;font-weight:900">🚶<br>متوسط</button>
<button onclick="diff='hard';spd=5.5;updateBtn()" id="b3" style="flex:1;height:56px;border-radius:14px;border:1px solid #fff2;background:#fff1;color:#fff;font-weight:900">⚡<br>سريع</button>
</div>
<p id="info" style="font-size:10px;opacity:.5;margin-top:10px">السرعة: 2 - بطيء جدا</p>
<button onclick="startGame()" style="width:100%;height:52px;border-radius:999px;border:none;background:linear-gradient(90deg,#FF8C42,#FFD23F);font-weight:900;font-size:16px;margin-top:14px">▶ العب الآن</button>
<p style="font-size:11px;opacity:.6;margin-top:8px">دوسي يمين/شمال الشاشة عشان تغيري المسار</p>
</div></div>
<script>
const cv=document.getElementById('cv'),cx=cv.getContext('2d');
function rs(){cv.width=innerWidth;cv.height=innerHeight}rs();addEventListener('resize',rs);
const ELS=[{sym:'Fe',name:'الحديد',m:true,c:'#FF8C42'},{sym:'Al',name:'الالومنيوم',m:true,c:'#FFB347'},{sym:'Cu',name:'النحاس',m:true,c:'#FF6B35'},{sym:'Au',name:'الذهب',m:true,c:'#FFD23F'},{sym:'S',name:'الكبريت',m:false,c:'#4FC3F7'},{sym:'O',name:'الاكسجين',m:false,c:'#7ED6FF'},{sym:'C',name:'الكربون',m:false,c:'#5BA4E5'}];
let lane=1,tx=1,x=innerWidth/2,spd=2,diff='easy',dist=0,score=0,coins=0,hp=3,objs=[],t=0,run=false,paused=false,msg='',msgT=0;
function laneX(l){return innerWidth*0.25+l*innerWidth*0.25}
function updateBtn(){document.getElementById('b1').style.border=diff=='easy'?'2px solid #39ff14':'1px solid #fff2';document.getElementById('b2').style.border=diff=='medium'?'2px solid #F2A900':'1px solid #fff2';document.getElementById('b3').style.border=diff=='hard'?'2px solid #ef4444':'1px solid #fff2';document.getElementById('info').textContent='السرعة: '+spd+' - '+(diff=='easy'?'بطيء جدا':diff=='medium'?'متوسط':'سريع')}
function startGame(){document.getElementById('menu').style.display='none';run=true;paused=false;dist=0;score=0;coins=0;hp=3;objs=[];lane=tx=1;x=laneX(1);}
function loop(){requestAnimationFrame(loop);const W=innerWidth,H=innerHeight;if(!run){draw();return}if(paused){draw();return}t++;x+=(laneX(tx)-x)*0.12;dist+=spd*0.25;if(t%100==0){const el=ELS[Math.floor(Math.random()*ELS.length)];objs.push({lane:Math.floor(Math.random()*3),y:-70,el,sym:el.sym,m:el.m,c:el.c})}objs.forEach(o=>o.y+=spd);objs=objs.filter(o=>{if(o.y>H-130&&o.y<H-90&&o.lane==Math.round(tx)){if(o.m){score+=20;coins++;msg='✅ '+o.el.name;msgT=40}else{hp--;msg='❌ '+o.el.name;msgT=40;if(hp<=0){run=false;setTimeout(()=>{alert('انتهت! النقاط: '+score);document.getElementById('menu').style.display='flex';},200)}}return false}return o.y<H+100});document.getElementById('hp').textContent=hp;document.getElementById('sc').textContent=score;document.getElementById('co').textContent=coins;document.getElementById('ds').textContent=Math.floor(dist/10);if(msgT>0)msgT--;draw()}
function draw(){const W=innerWidth,H=innerHeight;cx.fillStyle='#0a0e18';cx.fillRect(0,0,W,H);cx.fillStyle='#122040';cx.fillRect(W*0.15,0,W*0.7,H);for(let i=0;i<3;i++){cx.strokeStyle='#ffffff12';cx.beginPath();cx.moveTo(laneX(i),0);cx.lineTo(laneX(i),H);cx.stroke()}objs.forEach(o=>{cx.fillStyle=o.c;cx.fillRect(laneX(o.lane)-26,o.y-26,52,52);cx.fillStyle='#000';cx.font='900 18px Cairo';cx.fillText(o.sym,laneX(o.lane)-12,o.y+6)});cx.fillStyle='#fff';cx.beginPath();cx.arc(x,H-110,18,0,Math.PI*2);cx.fill();cx.fillStyle='#F2A900';cx.beginPath();cx.arc(x,H-110,11,0,Math.PI*2);cx.fill();if(msgT>0){cx.fillStyle='#000a';cx.fillRect(W/2-80,H/2-18,160,32);cx.fillStyle='#fff';cx.font='900 13px Cairo';cx.fillText(msg,W/2-cx.measureText(msg).width/2,H/2+2)}}
cv.addEventListener('touchstart',e=>{const X=e.touches[0].clientX;if(X<W/2&&lane>0){lane--}else if(X>=W/2&&lane<2){lane++}tx=lane},{passive:true});
cv.addEventListener('mousedown',e=>{if(e.clientX<innerWidth/2&&lane>0)lane--;else if(lane<2)lane++;tx=lane});
addEventListener('keydown',e=>{if(e.key=='ArrowLeft'&&lane>0){lane--;tx=lane}if(e.key=='ArrowRight'&&lane<2){lane++;tx=lane}});
loop();
</script>
</body>
</html>
