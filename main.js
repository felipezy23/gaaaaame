const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
const mapImg=new Image();
mapImg.src="mapa.jpg";

const MAP_W=1456, MAP_H=688;
const keys={};
let last=0, msgTimer=0;

const walkZones=[
  [[20,300],[395,300],[430,390],[385,470],[20,470]],
  [[350,300],[690,285],[780,390],[690,480],[430,450]],
  [[20,455],[455,430],[570,500],[650,625],[20,625]],
  [[430,110],[1130,105],[1130,475],[800,520],[650,450],[430,390]],
  [[1030,330],[1450,320],[1450,665],[980,665],[980,535]],
  [[1080,95],[1450,80],[1450,330],[1110,330]]
];

const bridges=[
  {x1:390,y1:395,x2:500,y2:500},
  {x1:690,y1:345,x2:1040,y2:470}
];

const blockedRects=[
  [55,145,300,300],[690,205,970,330],[1190,430,1450,665],
  [1110,90,1455,270],[500,350,690,475]
];

const player={x:355,y:365,r:9,speed:145,dirX:1,dirY:0,hp:10,attackUntil:0};

const villain={
  x:1005,y:330,r:20,hp:12,maxHp:12,
  state:"idle",
  frameIndex:0,
  frameTime:0,
  attackCooldown:0,
  flash:0
};

/*
  A sprite sheet NÃO é mais desenhada diretamente.
  Cada uma das 26 poses foi separada em um PNG individual.
  Assim o jogo mostra SOMENTE UM FRAME por vez.
*/
const frameFiles=Array.from({length:26},(_,i)=>`sentry_frames/frame_${String(i).padStart(2,"0")}.png`);
const sentryFrames=[];
let loadedFrames=0;

function loadSentryFrames(){
  return Promise.all(frameFiles.map((src,i)=>new Promise(resolve=>{
    const im=new Image();
    im.onload=()=>{
      sentryFrames[i]=im;
      loadedFrames++;
      resolve();
    };
    im.onerror=resolve;
    im.src=src;
  })));
}

/*
  As poses foram organizadas de acordo com a imagem original:
  0-4  = guarda/espera
  5-8  = ataque 1
  9-12 = ataque 2
  13-17 = mudança de postura
  18-22 = caminhada
  23-25 = continuação da caminhada
*/
const anims={
  idle:[0,1,2,3,4],
  attack:[5,6,7,8],
  attack2:[9,10,11,12],
  turn:[13,14,15,16,17],
  walk:[18,19,20,21,22,23,24,25]
};

const camera={x:0,y:0,w:1000,h:600};

function resize(){
  const scale=Math.min(window.innerWidth/MAP_W,(window.innerHeight-52)/MAP_H,1);
  canvas.width=Math.floor(MAP_W*scale);
  canvas.height=Math.floor(MAP_H*scale);
  camera.w=canvas.width/scale;
  camera.h=canvas.height/scale;
}
addEventListener("resize",resize);
resize();

addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(k==="e"&&!e.repeat)interact();
  if(k==="j"&&!e.repeat)playerAttack();
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

function pointInPoly(px,py,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [xi,yi]=poly[i],[xj,yj]=poly[j];
    if(((yi>py)!=(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}

function inWalkable(x,y){
  if(x<8||y<8||x>MAP_W-8||y>MAP_H-8)return false;
  if(x>1110&&y<270)return false;
  return walkZones.some(z=>pointInPoly(x,y,z));
}

function nearBridge(x,y){
  return bridges.some(b=>{
    const dx=b.x2-b.x1,dy=b.y2-b.y1;
    const t=Math.max(0,Math.min(1,((x-b.x1)*dx+(y-b.y1)*dy)/(dx*dx+dy*dy)));
    const qx=b.x1+t*dx,qy=b.y1+t*dy;
    return Math.hypot(x-qx,y-qy)<28;
  });
}

function inBlocked(x,y){
  return blockedRects.some(([x1,y1,x2,y2])=>x>=x1&&x<=x2&&y>=y1&&y<=y2);
}

function canStand(x,y){
  if(!inWalkable(x,y))return false;
  if(inBlocked(x,y)&&!nearBridge(x,y))return false;
  return true;
}

function movePlayer(dt){
  let dx=0,dy=0;
  if(keys["arrowleft"]||keys["a"])dx--;
  if(keys["arrowright"]||keys["d"])dx++;
  if(keys["arrowup"]||keys["w"])dy--;
  if(keys["arrowdown"]||keys["s"])dy++;
  if(!dx&&!dy)return;

  const len=Math.hypot(dx,dy);
  dx/=len;dy/=len;
  player.dirX=dx;player.dirY=dy;

  const speed=keys["shift"]?player.speed*1.65:player.speed;
  const nx=player.x+dx*speed*dt;
  const ny=player.y+dy*speed*dt;

  if(canStand(nx,player.y))player.x=nx;
  if(canStand(player.x,ny))player.y=ny;
}

function playerAttack(){
  if(villain.hp<=0)return;

  player.attackUntil=performance.now()+260;

  const d=Math.hypot(player.x-villain.x,player.y-villain.y);
  if(d<75){
    villain.hp=Math.max(0,villain.hp-2);
    villain.flash=.2;

    if(villain.hp<=0){
      villain.state="dead";
      showMessage("Sentry derrotado! O caminho para o castelo está livre.");
    }else{
      showMessage("Você acertou o Sentry!");
    }
  }
}

function updateVillain(dt){
  if(villain.state==="dead")return;

  villain.attackCooldown-=dt;
  villain.flash-=dt;

  const dx=player.x-villain.x;
  const dy=player.y-villain.y;
  const d=Math.hypot(dx,dy);

  if(d<230){
    if(d>62){
      villain.state="walk";

      const nx=villain.x+dx/d*55*dt;
      const ny=villain.y+dy/d*55*dt;

      if(canStand(nx,villain.y))villain.x=nx;
      if(canStand(villain.x,ny))villain.y=ny;
    }else if(villain.attackCooldown<=0){
      villain.state=Math.random()<.5?"attack":"attack2";
      villain.attackCooldown=1.1;

      player.hp=Math.max(0,player.hp-1);
      if(player.hp<=0){
        showMessage("Você foi derrotado. Recarregue a página para tentar novamente.");
      }
    }
  }else{
    villain.state="idle";
  }

  const seq=anims[villain.state]||anims.idle;

  // Cada frame fica visível sozinho antes de passar para o próximo.
  let rate=.13;
  if(villain.state==="idle")rate=.20;
  if(villain.state==="attack"||villain.state==="attack2")rate=.10;

  villain.frameTime+=dt;
  if(villain.frameTime>=rate){
    villain.frameTime=0;
    villain.frameIndex=(villain.frameIndex+1)%seq.length;
  }
}

function updateCamera(){
  camera.x=Math.max(0,Math.min(MAP_W-camera.w,player.x-camera.w/2));
  camera.y=Math.max(0,Math.min(MAP_H-camera.h,player.y-camera.h/2));
}

function interact(){
  if(villain.hp>0&&Math.hypot(player.x-villain.x,player.y-villain.y)<140){
    showMessage("O Sentry guarda o templo! Aproxime-se e pressione J para atacar.");
  }else if(player.x>1260&&player.y>470){
    showMessage("Entrada do complexo do castelo alcançada.");
  }else if(nearBridge(player.x,player.y)){
    showMessage("Ponte atravessada.");
  }else{
    showMessage("Explore o mapa e encontre o caminho até o templo.");
  }
}

function showMessage(t){
  const el=document.getElementById("msg");
  el.textContent=t;
  el.classList.add("show");
  clearTimeout(msgTimer);
  msgTimer=setTimeout(()=>el.classList.remove("show"),2300);
}

function drawSentryFrame(frameIndex,x,y,height=150,flip=false,alpha=1){
  const img=sentryFrames[frameIndex];
  if(!img)return;

  // O arquivo já contém UMA única pose. Nunca desenhamos a sprite sheet.
  const ratio=img.width/img.height;
  const w=height*ratio;

  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(x,y);
  if(flip)ctx.scale(-1,1);

  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,-w/2,-height,w,height);
  ctx.restore();
}

function drawPlayer(){
  ctx.save();
  ctx.translate(player.x-camera.x,player.y-camera.y);

  ctx.beginPath();
  ctx.arc(0,0,9,0,Math.PI*2);
  ctx.fillStyle="#f2cf9a";
  ctx.fill();
  ctx.strokeStyle="#111";
  ctx.lineWidth=2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-7,7);
  ctx.lineTo(0,-4);
  ctx.lineTo(7,7);
  ctx.fillStyle="#315b9a";
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawVillain(){
  if(villain.hp<=0)return;

  const seq=anims[villain.state]||anims.idle;
  const frame=seq[villain.frameIndex%seq.length];

  // O vilão olha para o jogador.
  const flip=player.x<villain.x;

  const x=villain.x-camera.x;
  const y=villain.y-camera.y;

  drawSentryFrame(frame,x,y,145,flip,villain.flash>0?.55:1);

  // Barra de vida
  ctx.save();
  ctx.translate(x,y-162);

  ctx.fillStyle="rgba(0,0,0,.65)";
  ctx.fillRect(-31,0,62,7);

  ctx.fillStyle="#b52222";
  ctx.fillRect(-31,0,62*(villain.hp/villain.maxHp),7);

  ctx.strokeStyle="#111";
  ctx.strokeRect(-31,0,62,7);

  ctx.fillStyle="#fff";
  ctx.font="12px Arial";
  ctx.textAlign="center";
  ctx.fillText("SENTRY",0,-6);

  ctx.restore();
}

function drawHUD(){
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);

  ctx.fillStyle="rgba(0,0,0,.55)";
  ctx.fillRect(10,10,170,55);

  ctx.fillStyle="#fff";
  ctx.font="13px Arial";
  ctx.fillText("Vida: "+player.hp+"/10",20,30);

  ctx.fillStyle="#333";
  ctx.fillRect(20,38,140,9);

  ctx.fillStyle="#4caf50";
  ctx.fillRect(20,38,14*player.hp,9);

  if(villain.hp>0&&Math.hypot(player.x-villain.x,player.y-villain.y)<260){
    ctx.fillStyle="#fff";
    ctx.fillText("J = atacar",20,61);
  }

  ctx.restore();
}

function draw(){
  const scale=canvas.width/MAP_W;

  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.clearRect(0,0,MAP_W,MAP_H);

  // Cenário original, sem alterações.
  ctx.drawImage(mapImg,0,0);

  // Marcador discreto do Sentry junto ao templo.
  if(villain.hp>0){
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      villain.x,
      villain.y-4,
      25+Math.sin(performance.now()/160)*3,
      0,
      Math.PI*2
    );
    ctx.strokeStyle="rgba(255,220,80,.65)";
    ctx.lineWidth=2;
    ctx.stroke();
    ctx.restore();
  }

  drawVillain();
  drawPlayer();
  drawHUD();
}

function loop(t){
  const dt=Math.min((t-last)/1000,.033);
  last=t;

  movePlayer(dt);
  updateVillain(dt);
  updateCamera();
  draw();

  requestAnimationFrame(loop);
}

Promise.all([
  new Promise(resolve=>{
    if(mapImg.complete)resolve();
    else mapImg.onload=resolve;
  }),
  loadSentryFrames()
]).then(()=>{
  requestAnimationFrame(loop);
});
