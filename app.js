const API = "https://xaus.com/api/v1";
const $ = id => document.getElementById(id);
const fmt = n => Number.isFinite(n) ? n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—";
const fmtTime = d => d ? new Date(d).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—";
let lastSignal = "";
let lastSpot = null;
let lastSeriesFetch = 0;
let candles = [];
let lastAnalysis = null;
let alerts = [];

function setStatus(kind, text){ $("connection").className="status "+kind; $("connection").lastChild.textContent=" "+text; }
async function getJson(url){
  const r = await fetch(url, {cache:"no-store"});
  const j = await r.json();
  if(!r.ok) throw new Error(j?.detail || j?.error || `HTTP ${r.status}`);
  return j;
}
function normalizeTimestamp(t){
  if(typeof t === "number") return t < 1e12 ? t*1000 : t;
  const n = Number(t);
  if(Number.isFinite(n) && String(t).trim()!=="") return n < 1e12 ? n*1000 : n;
  return Date.parse(t);
}
function ema(values, period){
  if(values.length < period) return [];
  const k=2/(period+1), out=[];
  let v=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
  for(let i=0;i<period-1;i++) out.push(null);
  out.push(v);
  for(let i=period;i<values.length;i++){v=values[i]*k+v*(1-k);out.push(v);}
  return out;
}
function rsi(values, period=14){
  if(values.length <= period) return null;
  let gains=0, losses=0;
  for(let i=1;i<=period;i++){const d=values[i]-values[i-1];if(d>0)gains+=d;else losses-=d;}
  let avgG=gains/period, avgL=losses/period;
  for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];avgG=(avgG*(period-1)+Math.max(0,d))/period;avgL=(avgL*(period-1)+Math.max(0,-d))/period;}
  if(avgL===0) return 100;
  return 100-100/(1+avgG/avgL);
}
function macd(values){
  const e12=ema(values,12),e26=ema(values,26), line=[];
  for(let i=0;i<values.length;i++) line.push(e12[i]!=null&&e26[i]!=null?e12[i]-e26[i]:null);
  const valid=line.filter(v=>v!=null), sig=ema(valid,9);
  return {line:line.at(-1), signal:sig.at(-1), hist:line.at(-1)-sig.at(-1)};
}
function atr(c,period=14){
  if(c.length<period+1)return null;
  const tr=[];
  for(let i=1;i<c.length;i++) tr.push(Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c)));
  return tr.slice(-period).reduce((a,b)=>a+b,0)/Math.min(period,tr.length);
}
// Convert the sampled API points into approximate candles. These are not broker OHLC candles.
function aggregate(points, minutes){
  const bins=new Map();
  for(const p of points){
    const t=normalizeTimestamp(p.t), price=Number(p.p);
    if(!Number.isFinite(t)||!Number.isFinite(price)||price<=0)continue;
    const bucket=Math.floor(t/(minutes*60000))*(minutes*60000);
    const c=bins.get(bucket);
    if(!c) bins.set(bucket,{t:bucket,o:price,h:price,l:price,c:price});
    else {c.h=Math.max(c.h,price);c.l=Math.min(c.l,price);c.c=price;}
  }
  return [...bins.values()].sort((a,b)=>a.t-b.t);
}
function trend(cs){
  if(cs.length<30)return "Insufficient data";
  const closes=cs.map(c=>c.c), e9=ema(closes,9).at(-1), e26=ema(closes,26).at(-1);
  const last=closes.at(-1);
  if(last>e9&&e9>e26)return "Bullish";
  if(last<e9&&e9<e26)return "Bearish";
  return "Neutral";
}
function analyze(m5,m15,h1,spot){
  const closes=m5.map(c=>c.c);
  if(closes.length<30) throw new Error("More historical data is required to calculate the indicators.");
  const e9=ema(closes,9).at(-1), e26=ema(closes,26).at(-1), prev9=ema(closes,9).at(-2), prev26=ema(closes,26).at(-2);
  const rv=rsi(closes), mc=macd(closes), av=atr(m5), last=m5.at(-1).c;
  const trend15=trend(m15), trend1=trend(h1);
  const recent=m5.slice(-24), resistance=Math.max(...recent.map(c=>c.h)), support=Math.min(...recent.map(c=>c.l));
  let score=0, reasons=[];
  if(e9>e26){score++;reasons.push("EMA 9 este peste EMA 26");}else{score--;reasons.push("EMA 9 este sub EMA 26");}
  if(mc.hist>0){score++;reasons.push("MACD histogram is positive");}else{score--;reasons.push("MACD histogram is negative");}
  if(rv>=52&&rv<70){score++;reasons.push("RSI supports bullish momentum");}
  else if(rv<=48&&rv>30){score--;reasons.push("RSI supports bearish momentum");}
  else if(rv>=70){reasons.push("RSI is elevated; overbought conditions are possible");}
  else if(rv<=30){reasons.push("RSI is low; oversold conditions are possible");}
  if(trend15==="Bullish"){score++;reasons.push("M15 confirms the bullish trend");}
  if(trend15==="Bearish"){score--;reasons.push("M15 confirms the bearish trend");}
  if(trend1==="Bullish"&&score>0){score++;reasons.push("H1 confirms the upward direction");}
  if(trend1==="Bearish"&&score<0){score--;reasons.push("H1 confirms the downward direction");}
  const crossedUp=prev9<=prev26&&e9>e26, crossedDown=prev9>=prev26&&e9<e26;
  let signal="WAIT FOR CONFIRMATION", side="neutral", confidence="LOW";
  if(score>=4 && rv<70 && trend15!=="Bearish"){signal="BULLISH BIAS";side="bull";confidence=score>=5?"STRONGER":"MODERATE";}
  else if(score<=-4 && rv>30 && trend15!=="Bullish"){signal="BEARISH BIAS";side="bear";confidence=score<=-5?"STRONGER":"MODERATE";}
  else if(crossedUp){signal="POSSIBLE BULLISH REVERSAL";side="bull";confidence="UNCONFIRMED";}
  else if(crossedDown){signal="POSSIBLE BEARISH REVERSAL";side="bear";confidence="UNCONFIRMED";}
  const entry=side==="bull"?last:side==="bear"?last:null;
  const stop=av&&side==="bull"?last-1.5*av:av&&side==="bear"?last+1.5*av:null;
  const target=av&&side==="bull"?last+2*av:av&&side==="bear"?last-2*av:null;
  return {e9,e26,rv,mc,av,trend15,trend1,resistance,support,last,signal,side,confidence,reasons,entry,stop,target,crossedUp,crossedDown,score};
}
function addAlert(title, body){
  const item={time:new Date(),title,body}; alerts.unshift(item); alerts=alerts.slice(0,8); renderAlerts();
  if($("inAppAlerts").checked){
    try{if(navigator.vibrate)navigator.vibrate([100,50,100]);}catch(e){}
  }
  if($("browserAlerts").checked && Notification.permission==="granted"){
    try{new Notification(title,{body,tag:"xau-signal"});}catch(e){}
  }
}
function renderAlerts(){
  $("alerts").innerHTML=alerts.length?alerts.map(a=>`<div class="alert-item"><time>${fmtTime(a.time)}</time><strong>${a.title}</strong><br>${a.body}</div>`).join(""):'<p class="small">No alerts yet.</p>';
}
function renderChart(cs){
  const el=$("priceChart");
  if(!cs || cs.length<10){el.innerHTML='<p class="small">Not enough chart data available.</p>';return;}
  const data=cs.slice(-60), closes=data.map(c=>c.c), e9=ema(closes,9), e26=ema(closes,26);
  const W=700,H=270,left=12,right=58,top=12,bottom=24,plotW=W-left-right,plotH=H-top-bottom;
  const lows=data.map(c=>c.l),highs=data.map(c=>c.h);let min=Math.min(...lows),max=Math.max(...highs);
  const pad=(max-min)*0.08||max*0.001;min-=pad;max+=pad;
  const x=i=>left+(i/(data.length-1))*plotW,y=v=>top+(max-v)/(max-min)*plotH;
  const candleW=Math.max(3,Math.min(8,plotW/data.length*0.52));
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Approximate XAU/USD M5 chart with EMA 9 and EMA 26">`;
  for(let i=0;i<5;i++){const gy=top+i*plotH/4,val=max-i*(max-min)/4;svg+=`<line x1="${left}" y1="${gy}" x2="${W-right+4}" y2="${gy}" stroke="#2a3950" stroke-width="1"/><text x="${W-4}" y="${gy+4}" fill="#9aa9bf" font-size="11" text-anchor="end">${val.toFixed(1)}</text>`;}
  data.forEach((c,i)=>{const xx=x(i),yo=y(c.o),yc=y(c.c),yh=y(c.h),yl=y(c.l),color=c.c>=c.o?"#35d39a":"#ff6b78";svg+=`<line x1="${xx}" y1="${yh}" x2="${xx}" y2="${yl}" stroke="${color}" stroke-width="1.4"/>`;const bodyY=Math.min(yo,yc),bodyH=Math.max(1.5,Math.abs(yc-yo));svg+=`<rect x="${xx-candleW/2}" y="${bodyY}" width="${candleW}" height="${bodyH}" rx="0.7" fill="${color}" opacity=".9"/>`;});
  const pathFor=arr=>{let d="",started=false;arr.forEach((v,i)=>{if(v==null)return;d+=(started?" L":"M")+x(i).toFixed(2)+" "+y(v).toFixed(2);started=true;});return d;};
  svg+=`<path d="${pathFor(e9)}" fill="none" stroke="#53d5a4" stroke-width="2.2" stroke-linejoin="round"/><path d="${pathFor(e26)}" fill="none" stroke="#f2c66d" stroke-width="2.2" stroke-linejoin="round"/>`;
  const last=data.at(-1),lastY=y(last.c);svg+=`<line x1="${left}" y1="${lastY}" x2="${W-right+4}" y2="${lastY}" stroke="#d5dfed" stroke-dasharray="4 4" opacity=".65"/>`;
  svg+=`<text x="${left}" y="${H-5}" fill="#9aa9bf" font-size="11">${new Date(data[0].t).toLocaleTimeString("ro-MD",{hour:"2-digit",minute:"2-digit"})}</text><text x="${W-right}" y="${H-5}" fill="#9aa9bf" font-size="11" text-anchor="end">${new Date(last.t).toLocaleTimeString("ro-MD",{hour:"2-digit",minute:"2-digit"})}</text></svg>`;
  el.innerHTML=svg;$("chartRange").textContent=`${data.length} approximate candles`;$("chartLast").textContent=`Last price: ${fmt(last.c)}`;
}

function render(a, spotData){
  renderChart(candles);
  $("price").textContent=fmt(spotData.spot_usd_oz);
  $("updated").textContent="Updated "+fmtTime(spotData.updated_at);
  $("freshness").textContent=spotData.data_state?.status==="stale"||spotData.stale?"STALE DATA":"API data";
  $("source").textContent="Source: "+(spotData.price_source||spotData.source||"XAUS API");
  $("changeTag").textContent=spotData.data_state?.status==="stale"||spotData.stale?"STALE PRICE":"XAU/USD SPOT";
  $("changeTag").className="pill "+((spotData.data_state?.status==="stale"||spotData.stale)?"neutral":"bull");
  $("signalCard").className="signal-card "+a.side;
  $("signal").textContent=a.signal;
  $("signalReason").textContent=a.reasons.join(" · ")+". This is a heuristic assessment, not a prediction.";
  $("confidence").textContent=a.confidence;$("confidence").className="pill "+a.side;
  $("signalTime").textContent=fmtTime(new Date());
  $("ema").textContent=`${fmt(a.e9)} / ${fmt(a.e26)}`;
  $("rsi").textContent=fmt(a.rv);
  $("macd").textContent=`${fmt(a.mc.line)} / ${fmt(a.mc.signal)}`;
  $("atr").textContent=fmt(a.av);
  $("m15").textContent=a.trend15;$("h1").textContent=a.trend1;
  $("resistance").textContent=fmt(a.resistance);$("support").textContent=fmt(a.support);
  $("toSupport").textContent=fmt(Math.max(0,a.last-a.support));
  $("toResistance").textContent=fmt(Math.max(0,a.resistance-a.last));
  $("entry").textContent=a.entry?fmt(a.entry):"No clear setup";
  $("stop").textContent=a.stop?fmt(a.stop):"—";
  $("target").textContent=a.target?fmt(a.target):"—";
  $("planNote").textContent=a.av?`Stop-loss/target levels are estimated using ATR (${fmt(a.av)}); they are not personal recommendations. Last price in the intraday series: ${fmt(a.last)}.`:"Insufficient history for ATR.";
  if(lastSignal && lastSignal!==a.signal) addAlert("Semnal schimbat: "+a.signal,a.reasons.join("; "));
  lastSignal=a.signal;lastAnalysis=a;lastSpot=spotData;
}
async function refresh(forceSeries=false){
  try{
    setStatus("", "Refreshing…");
    const spotPromise=getJson(API+"/spot?compact=1");
    let seriesPromise;
    if(forceSeries || Date.now()-lastSeriesFetch>120000){
      seriesPromise=getJson(API+"/intraday?symbol=xau&hours=48").then(d=>{lastSeriesFetch=Date.now();return d;});
    } else seriesPromise=Promise.resolve(null);
    const [spot, series]=await Promise.all([spotPromise,seriesPromise]);
    if(series){
      const points=Array.isArray(series.points)?series.points:[];
      if(points.length<30)throw new Error("The API returned too few historical data points.");
      candles=aggregate(points,5);
      const m15=aggregate(points,15), h1=aggregate(points,60);
      const a=analyze(candles,m15,h1,spot.spot_usd_oz);
      render(a,spot);
    } else if(lastAnalysis && lastSpot){
      render(lastAnalysis,spot);
    }
    const st=spot.data_state?.status;
    if(st==="unavailable") throw new Error("The spot price is currently unavailable.");
    setStatus("ok", st==="stale"||spot.stale?"Stale price":"Connected");
  }catch(e){
    setStatus("err","Data error");
    $("signalReason").textContent=e.message+" Check your connection or try again.";
  }
}
$("refreshBtn").addEventListener("click",()=>refresh(true));
$("clearAlerts").addEventListener("click",()=>{alerts=[];renderAlerts();});
$("notifyBtn").addEventListener("click",async()=>{
  if(!("Notification" in window)){alert("This browser does not support notifications.");return;}
  const p=await Notification.requestPermission();
  $("browserAlerts").checked=p==="granted";
  alert(p==="granted"?"Notifications are enabled.":"Notifications were not enabled.");
});
$("autoRefresh").addEventListener("change",e=>{
  localStorage.setItem("autoRefresh",e.target.checked?"1":"0");
});
$("inAppAlerts").addEventListener("change",e=>localStorage.setItem("inAppAlerts",e.target.checked?"1":"0"));
$("browserAlerts").addEventListener("change",e=>localStorage.setItem("browserAlerts",e.target.checked?"1":"0"));
for(const id of ["autoRefresh","inAppAlerts","browserAlerts"]){
  const saved=localStorage.getItem(id);
  if(saved!==null)$(id).checked=saved==="1";
}
refresh(true);
setInterval(()=>{if($("autoRefresh").checked)refresh(false);},30000);
