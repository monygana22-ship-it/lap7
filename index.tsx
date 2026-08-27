<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Element Surfers بطيء</title>
<style>*{box-sizing:border-box;margin:0;padding:0;font-family:Cairo}
body{background:#0a0e18;overflow:hidden}canvas{position:fixed;inset:0;width:100%;height:100%}
.top{position:fixed;top:8px;left:8px;right:8px;height:46px;background:#000c;border-radius:12px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;color:#fff;font-weight:900;z-index:10}
.bins{position:fixed;bottom:8px;left:8px;right:8px;display:flex;gap:6px;z-index:10}
.bin{flex:1;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:#fff}
#menu{position:fixed;inset:0;background:#0a0e18;z-index:20;display:flex;align-items:center;justify-content:center}
.card{background:#141928;border:2px solid #F2A900;border-radius:20px;padding:18px;max-width:360px;width:100%;text-align:center;color:#fff}
</style></head><body><canvas id="cv"></canvas>
<div class="top"><span>❤️ <b id="hp">3</b> ⭐ <span id="sc">0</span></span><span id="ds">0m</span><button onclick="paused=!paused">⏸</button></div>
<div class="bins"><div class="bin" style="background:#FF8C42">🔥 فلز يسار</div><div class="bin" style="background:#000">⛔</div><div class="bin" style="background:#38BDF8">يمين لافلز</div></div>
<div id="menu"><div class="card"><h2>🚇 Element Surfers - بطيء</h2>
<div style="display:flex;gap:8px;margin-top:12px">
<button onclick="diff='easy';spd=2" style="flex:1;height:50px;border-radius:12px;border:2px solid #39ff14;background:#39ff1422;color:#fff">🐢 سهل</button>
<button onclick="diff='medium';spd=3.5" style="flex:1;height:50px;border-radius:12px;background:#fff1;color:#fff">🚶 متوسط</button>
<button onclick="diff='hard';spd=5.5" style="flex:1;height:50px;border-radius:12px;background:#fff1;color:#fff">⚡ سريع</button>
</div>
<button onclick="document.getElementById('menu').style.display='none';run=true" style="width:100%;height:50px;border-radius:999px;background:linear-gradient(90deg,#FF8C42,#FFD23F);font-weight:900;margin-top:12px;border:none">▶ العب الآن</button>
<p style="font-size:11px;opacity:.6;margin-top:8px">دوسي يمين/شمال عشان تغيري المسار</p></div></div>
<script>
const cv=document.getElementById('cv'),cx=cv.getContext('2d');
function rs(){cv.width=innerWidth;cv.height=innerHeight}rs();onresize=rs;
const ELS=[{s:'Fe',m:1},{s:'Al',m:1},{s:'Cu',m:1},{s:'Au',m:1},{s:'S',m:0},{s:'O',m:0},{s:'C',m:0}];
let lane=1,tx=1,x=innerWidth/2,spd=2,diff='easy',dist=0,score=0,hp=3,objs=[],t=0,run=false,paused=false;
function laneX(l){return innerWidth*0.25+l*innerWidth*0.25}
function loop(){requestAnimationFrame(loop);if(!run||paused){draw();return;}t++;x+=(laneX(tx)-x)*0.12;dist+=spd*0.25;if(t%90==0){const el=ELS[Math.random()*ELS.length|0];objs.push({lane:Math.random()*3|0,y:-60,el})}objs.forEach(o=>o.y+=spd);objs=objs.filter(o=>{if(o.y>innerHeight-130&&o.y<innerHeight-90&&o.lane==Math.round(tx)){if(o.el.m)score+=20;else hp--;return false}return o.y<innerHeight+100});document.getElementById('hp').textContent=hp;document.getElementById('sc').textContent=score;document.getElementById('ds').textContent=Math.floor(dist/10);if(hp<=0){run=false;alert('انتهت! '+score);document.getElementById('menu').style.display='flex';hp=3}draw()}
function draw(){cx.fillStyle='#0a0e18';cx.fillRect(0,0,cv.width,cv.height);cx.fillStyle='#122040';cx.fillRect(innerWidth*0.15,0,innerWidth*0.7,innerHeight);objs.forEach(o=>{cx.fillStyle=o.el.m?'#FF8C42':'#38BDF8';cx.fillRect(laneX(o.lane)-22,o.y-22,44,44);cx.fillStyle='#000';cx.fillText(o.el.s,laneX(o.lane)-8,o.y+4)});cx.fillStyle='#fff';cx.beginPath();cx.arc(x,innerHeight-110,14,0,7);cx.fill()}
cv.addEventListener('touchstart',e=>{const X=e.touches[0].clientX;if(X<innerWidth/2&&lane>0)lane--;if(X>=innerWidth/2&&lane<2)lane++;tx=lane});
cv.addEventListener('mousedown',e=>{if(e.clientX<innerWidth/2&&lane>0)lane--;else if(lane<2)lane++;tx=lane});
loop();
</script></body></html>
