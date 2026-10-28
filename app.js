import {PAPER,AMBIENT_EMISSIVITY,solve,geometry,angleSweep,shapeMap,shapeAtVolume} from './model.js';
const $=id=>document.getElementById(id);
const numeric=['height','diameter','angle','radiation','wind','air','absorption','emissivity','airEmissivity','cl','exponent'];
const fields=['longwaveModel',...numeric];
const dimensions=['height','diameter'];
const fmt=(n,d=1)=>n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const signed=(n,d=2)=>`${n<0?'−':'+'}${fmt(Math.abs(n),d)}`;
const longwaveName=p=>p.longwaveModel==='sky-environment'?'Céu + entorno':'Artigo (ondas longas)';
let state={...PAPER}, pinned=null, metric='temperature', sweep=[], map=[], result=null;
const units={angle:'°',radiation:' W/m²',wind:' m/s',air:' °C',absorption:'',emissivity:'',airEmissivity:''};
const precision={angle:0,radiation:0,wind:1,air:0,absorption:2,emissivity:2,airEmissivity:2};
function syncDimension(key){$(key).value=Number.isFinite(state[key])?state[key].toFixed(1):'';}
function syncInputs(){for(const k of fields)if(dimensions.includes(k))syncDimension(k);else $(k).value=state[k];}
// Read only the edited field: formatted dimensions must not round the model state.
function readInput(key){const value=$(key).value;state[key]=numeric.includes(key)?(value===''?NaN:Number(value)):value;}
function controlLabels(){
  for(const [key,unit] of Object.entries(units))$(key+'-value').textContent=fmt(state[key],precision[key])+unit;
  const split=state.longwaveModel==='sky-environment';
  $('air-emissivity-label').textContent=split?'Emissividade da atmosfera εsky':'Emissividade do ar εₐ';
  $('longwave-note').textContent=split?`Metade da superfície recebe radiação do céu e metade do entorno. Emissividade do entorno fixa em ${fmt(AMBIENT_EMISSIVITY,2)}; ambos usam a temperatura do ar.`:'Equação do artigo: a emissividade do ar multiplica a radiação recebida e a emitida.';
  const standard=state.cl===.52&&state.exponent===.5&&state.absorption===.85&&state.emissivity===.95&&state.airEmissivity===.88;
  $('model-badge').textContent=split?'Céu + entorno':standard?'Artigo · referência':'Artigo · exploração';
  document.querySelectorAll('[data-radiation]').forEach(b=>{const active=Number(b.dataset.radiation)===state.radiation;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  $('pin').textContent=pinned?'Remover comparação ×':'Fixar comparação ＋';
}
function render(){
  controlLabels();
  try{
    result=solve(state);
    $('error').hidden=true;document.body.classList.remove('invalid');
    $('pin').disabled=$('export').disabled=$('share').disabled=false;
    const r=result;
    $('temperature').textContent=fmt(r.temperature,1);
    $('excess').innerHTML=`<strong>${signed(r.excess,1)} °C</strong> em relação ao ar (${fmt(state.air,0)} °C)`;
    $('projected').textContent=fmt(r.projected*1e6,2)+' mm²';
    $('h-value').textContent=fmt(r.h,1)+' W/(m²·K)';
    $('roundness').value=r.roundness; $('roundness-value').textContent=fmt(r.roundness,2);
    $('geometry-note').textContent=`Volume ${fmt(r.volume*1e9,2)} mm³ · D/H ${fmt(r.roundness,2)}`;
    const colors=['var(--solar)','var(--convection)','var(--infrared)'];
    const values=[r.solar,r.convection,r.longwave], max=Math.max(...values.map(Math.abs),1e-15);
    const names=['Sol absorvido','Convecção','Infravermelho líquido'];
    $('flux-grid').innerHTML=names.map((name,i)=>`<div class="flux-item"><div><span>${name} ${values[i]>=0?'↘':'↗'}</span><strong>${signed(values[i]*1000)}</strong></div><div class="flux-track"><span style="width:${100*Math.abs(values[i])/max}%;background:${colors[i]}"></span></div></div>`).join('');
    $('longwave-breakdown').hidden=state.longwaveModel!=='sky-environment';
    $('longwave-breakdown').textContent=state.longwaveModel==='sky-environment'?`Ondas longas · emitida: ${fmt(r.longwaveEmitted*1000,2)} mW; recebida do céu: ${fmt(r.longwaveSkyReceived*1000,2)} mW; recebida do entorno: ${fmt(r.longwaveAmbientReceived*1000,2)} mW. Líquido = recebida − emitida.`:'';
    $('pinned-summary').hidden=!pinned;$('pinned-legend').hidden=!pinned;
    if(pinned){const pr=solve(pinned),delta=r.temperature-pr.temperature;$('pinned-summary').textContent=`${longwaveName(pinned)} fixado: ${fmt(pr.temperature,1)} °C · atual ${delta>=0?'+':''}${fmt(delta,1)} °C. Comparação mantém os parâmetros fixados; nas curvas, apenas θ varia.`;}
    drawScene();if($('analysis').open) updateAnalysis();
  }catch(e){
    result=null;$('error').textContent=e.message;$('error').hidden=false;document.body.classList.add('invalid');
    $('temperature').textContent='—';$('pin').disabled=$('export').disabled=$('share').disabled=true;
  }
}
// The illustration is schematic. Geometry and flux magnitudes come from the steady-state model.
function bodyColor(temperature){
  const stops=[[0,[52,125,160]],[30,[217,149,36]],[60,[189,64,49]]];
  const t=Math.min(60,Math.max(0,temperature)),i=t<=30?0:1,f=(t-stops[i][0])/30;
  return stops[i][1].map((v,k)=>Math.round(v+(stops[i+1][1][k]-v)*f));
}
const rgb=c=>`rgb(${c.map(v=>Math.round(v)).join(',')})`;
function drawScene(){
  const r=result, pixelsPerMm=Math.min(36,320/Math.max(state.height,state.diameter));
  const h=state.height*pixelsPerMm,d=state.diameter*pixelsPerMm;
  const a=state.angle*Math.PI/180, cx=500,cy=410;
  const base=bodyColor(r.temperature),light=base.map(v=>v+(255-v)*.36),dark=base.map(v=>v*.64);
  $('body-light').setAttribute('stop-color',rgb(light));$('body-mid').setAttribute('stop-color',rgb(base));$('body-dark').setAttribute('stop-color',rgb(dark));
  $('glow-core').setAttribute('stop-color',rgb(base));
  document.documentElement.style.setProperty('--temperature-color',rgb(base.map(v=>v*.48)));
  $('body-group').innerHTML=`<g transform="translate(${cx} ${cy}) rotate(${-state.angle})" filter="url(#soft-shadow)"><rect x="${-h/2}" y="${-d/2}" width="${h}" height="${d}" fill="url(#cylinder-fill)" stroke="${rgb(dark)}" stroke-width="1.2"/><ellipse cx="${-h/2}" cy="0" rx="${d*.14}" ry="${d/2}" fill="${rgb(dark.map(v=>v*1.1))}" stroke="${rgb(dark)}"/><ellipse cx="${h/2}" cy="0" rx="${d*.14}" ry="${d/2}" fill="${rgb(light)}" stroke="${rgb(base.map(v=>v*.8))}"/><path d="M${-h/2} ${-d/2+2}H${h/2}" stroke="${rgb(light)}" stroke-width="2" opacity=".7"/><path d="M${-h/2} ${d/2-3}H${h/2}" stroke="${rgb(dark)}" stroke-width="2" opacity=".4"/></g>`;
  // Parallel sunbeams stop at the silhouette bounding envelope, as a schematic of direct irradiance.
  const top=cy-(h*Math.sin(a)+d*Math.cos(a))/2;
  const rayCount=Math.max(0,Math.round(state.radiation/120));
  $('solar-rays').innerHTML=Array.from({length:rayCount},(_,i)=>{
    const x=rayCount===1?500:385+i/(rayCount-1)*230,end=Math.max(170,top-18);
    return `<path d="M${x} 155V${end}" stroke-dasharray="2 7" opacity=".45"/><path d="M${x-3} ${end-6}L${x} ${end}L${x+3} ${end-6}" opacity=".8"/><circle class="solar-particle" cx="${x}" cy="${(155+end)/2}" r="2" style="animation-delay:${-i*.37}s"/>`;
  }).join('');
  $('sun-spokes').innerHTML=Array.from({length:16},(_,i)=>{const b=i*Math.PI/8;return `<path class="sun-spoke" d="M${500+Math.cos(b)*57} ${82+Math.sin(b)*57}L${500+Math.cos(b)*65} ${82+Math.sin(b)*65}"/>`;}).join('');
  $('scene-sun').style.opacity=.18+.82*Math.min(1,state.radiation/1000);
  $('sunlight-beam').style.opacity=Math.min(1,state.radiation/1000);
  const effectiveWind=r.effectiveWind;
  $('air-streams').style.setProperty('--wind-duration',`${Math.max(1.1,8/(effectiveWind+.7))}s`);
  $('air-streams').style.opacity=effectiveWind===0?0:Math.min(.65,.24+effectiveWind*.1);
  $('air-streams').innerHTML=[290,370,455,520].map((y,i)=>{
    const path=`M-80 ${y}C170 ${y-18} 220 ${y+13} 360 ${y}S720 ${y-10} 1080 ${y+6}`;
    return `<path d="${path}" opacity=".27"/><path class="wind-particle" d="${path}" style="animation-delay:${-i*1.7}s"/>`;
  }).join('');
  const waveAmount=r.longwave===0?0:6;
  $('heat-waves').innerHTML=Array.from({length:waveAmount},(_,i)=>{
    const b=(i/5*1.5+.25)*Math.PI,x=cx+Math.cos(b)*205,y=cy+Math.sin(b)*145;
    return `<path class="heat-wave" d="M${x} ${y}q-9-10 0-20t0-20t0-20" transform="rotate(${i*22-55} ${x} ${y})" style="animation-delay:${-i*.5}s"/>`;
  }).join('');
  $('solar-label').textContent=`+${fmt(r.solar*1000,2)} mW`;
  $('conv-label').textContent=`${signed(r.convection*1000)} mW`;
  $('infra-label').textContent=`${signed(r.longwave*1000)} mW`;
  $('solar-detail').textContent=`${fmt(state.radiation,0)} W/m² incidentes`;
  $('wind-label').textContent=`Vento a ${fmt(effectiveWind,1)} m/s`;
  $('mobile-solar').textContent=`+${fmt(r.solar*1000,2)} mW`;
  $('mobile-conv').textContent=`${signed(r.convection*1000)} mW`;
  $('mobile-infra').textContent=`${signed(r.longwave*1000)} mW`;
  const endX=cx+Math.cos(a)*212,endY=cy-Math.sin(a)*212;
  $('angle-indicator').innerHTML=`<path d="M${cx} ${cy}L${endX} ${endY}" stroke="var(--muted)" stroke-opacity=".23" stroke-dasharray="3 7"/><circle cx="${endX}" cy="${endY}" r="4" fill="var(--accent)"/><text x="${cx+Math.cos(a)*243+12}" y="${cy-Math.sin(a)*243+5}" class="angle-text">${fmt(state.angle,0)}°</text>`;
  const barLength=2*pixelsPerMm;
  $('scale-bar').innerHTML=`<path d="M800 620v6h${barLength}v-6" fill="none"/><text x="${800+barLength/2}" y="647" text-anchor="middle">2 mm</text>`;
  $('reference-zero').style.visibility=state.angle<8?'hidden':'visible';
  $('reference-ninety').style.visibility=state.angle>82?'hidden':'visible';
  $('scene-desc').textContent=`Sol absorvido: ${fmt(r.solar*1000,2)} miliwatts; convecção (${r.convection>=0?'entrada':'saída'}): ${fmt(Math.abs(r.convection)*1000,2)} miliwatts; infravermelho líquido (${r.longwave>=0?'entrada':'saída'}): ${fmt(Math.abs(r.longwave)*1000,2)} miliwatts. Arraste para girar ou use as setas do teclado. Animação ilustrativa dos fluxos no equilíbrio.`;
  $('body-interaction').setAttribute('aria-valuenow',state.angle);
  $('body-interaction').setAttribute('aria-valuetext',`${fmt(state.angle,0)} graus acima da horizontal`);
  $('scene-title').textContent=`Cilindro suspenso a ${fmt(state.angle,0)} graus, temperatura de equilíbrio ${fmt(r.temperature,1)} graus Celsius. Comprimento ${fmt(state.height,1)} mm e diâmetro ${fmt(state.diameter,1)} mm.`;
  document.querySelectorAll('[data-angle]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.angle)===state.angle));
}
function drawLine(){
  const W=760,H=275,left=56,right=22,top=28,bottom=43,pw=W-left-right,ph=H-top-bottom;
  const area=metric==='projected', factor=area?1e6:1;
  const other=pinned?angleSweep(pinned):null;
  const values=[...sweep,...(other||[])].map(r=>r[metric]*factor);
  let min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.17,area?.1:.7);
  min=area?Math.max(0,min-pad):min-pad;max+=pad;
  const X=a=>left+a/90*pw,Y=y=>top+(max-y)/(max-min)*ph;
  const path=rows=>rows.map((r,i)=>`${i?'L':'M'}${X(r.angle).toFixed(2)},${Y(r[metric]*factor).toFixed(2)}`).join(' ');
  const line=path(sweep), current=result[metric]*factor;
  const grid=Array.from({length:5},(_,i)=>{const y=min+(max-min)*i/4;return `<path d="M${left} ${Y(y)}H${W-right}" stroke="var(--line)"/><text x="${left-10}" y="${Y(y)+4}" text-anchor="end">${fmt(y,1)}</text>`;}).join('');
  const xaxis=[0,15,30,45,60,75,90].map(a=>`<text x="${X(a)}" y="${H-21}" text-anchor="middle">${a}°</text>`).join('');
  $('line-chart').innerHTML=`<svg id="line-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="line-title line-desc"><title id="line-title">${area?'Área projetada':'Temperatura de equilíbrio'} por inclinação</title><desc id="line-desc">${area?'Área em mm²':'Temperatura em graus Celsius'}; inclinação de zero a noventa graus. Use o controle Inclinação para selecionar com teclado. Valor atual: ${fmt(current,2)}.</desc><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".12"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><text x="${left}" y="11" class="axis-title">${area?'Área ao sol (mm²)':'Temperatura (°C)'}</text>${grid}${xaxis}<text x="${W-right}" y="${H-1}" text-anchor="end" class="axis-title">Inclinação do eixo acima da horizontal</text><path d="${line} L${X(90)},${H-bottom} L${left},${H-bottom}Z" fill="url(#chart-fill)"/>${other?`<path d="${path(other)}" fill="none" stroke="var(--comparison)" stroke-width="2" stroke-dasharray="6 5"/>`:''}<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round"/><path d="M${X(state.angle)},${top}V${H-bottom}" stroke="var(--accent)" opacity=".35" stroke-dasharray="3 4"/><circle cx="${X(state.angle)}" cy="${Y(current)}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/><text x="${Math.min(W-right-18,Math.max(left+18,X(state.angle)))}" y="${Math.max(top-4,Y(current)-13)}" text-anchor="middle" class="current-label">${fmt(current,1)}${area?'':' °C'}</text><g id="hover-guide" pointer-events="none" hidden><path stroke="var(--muted)" stroke-dasharray="3 3"/><circle r="4" fill="var(--accent)"/><rect width="116" height="25" rx="5" fill="var(--surface)" stroke="var(--line)"/><text class="hover-text"/></g><rect id="line-hit" x="${left}" y="${top}" width="${pw}" height="${ph}" fill="transparent" class="chart-point"/></svg>`;
  const hit=$('line-hit'),svg=$('line-svg');
  const angleAt=e=>{const rect=svg.getBoundingClientRect();return Math.round(Math.min(90,Math.max(0,((e.clientX-rect.left)/rect.width*W-left)/pw*90)));};
  const show=e=>{const a=angleAt(e),r=sweep[a],v=r[metric]*factor,x=X(a),y=Y(v),guide=$('hover-guide');guide.removeAttribute('hidden');const els=guide.children;els[0].setAttribute('d',`M${x} ${top}V${H-bottom}`);els[1].setAttribute('cx',x);els[1].setAttribute('cy',y);const bx=Math.max(left,Math.min(W-right-116,x-58)),by=Math.max(0,y-40);els[2].setAttribute('x',bx);els[2].setAttribute('y',by);els[3].setAttribute('x',bx+58);els[3].setAttribute('y',by+17);els[3].setAttribute('text-anchor','middle');els[3].textContent=`${a}° · ${fmt(v,1)} ${area?'mm²':'°C'}`;};
  hit.addEventListener('pointermove',show);hit.addEventListener('pointerleave',()=>$('hover-guide').setAttribute('hidden',''));
  hit.addEventListener('click',e=>{state.angle=angleAt(e);syncInputs();render();});
  $('line-readout').textContent=`θ = ${fmt(state.angle,0)}° · ${fmt(current,1)} ${area?'mm²':'°C'}`;
}
const stops=[[42,111,153],[244,215,133],[218,139,55],[164,47,42]];
function color(t){const a=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(a)),f=a-i;return `rgb(${stops[i].map((v,k)=>Math.round(v+(stops[i+1][k]-v)*f)).join(',')})`;}
function drawMap(){
  const W=760,H=295,left=56,right=22,top=26,bottom=42,pw=W-left-right,ph=H-top-bottom;
  const values=map.flat().map(r=>r.temperature),min=Math.min(...values),max=Math.max(...values);
  const cw=pw/31,ch=ph/19;
  const cells=map.map((row,i)=>row.map((r,j)=>`<rect class="map-cell" data-row="${i}" data-col="${j}" x="${left+j*cw}" y="${top+(18-i)*ch}" width="${cw+.2}" height="${ch+.2}" fill="${color((r.temperature-min)/(max-min||1))}"><title>θ ${r.angle}°; D/H ${fmt(r.roundness,2)}; ${fmt(r.temperature,2)} °C</title></rect>`).join('')).join('');
  const ytick=[0,.25,.5,.75,1].filter(r=>r>=.1).map(r=>{const y=top+ph-(r-.1)/.9*(ph-ch)-ch/2;return `<text x="${left-10}" y="${y+4}" text-anchor="end">${fmt(r,2)}</text>`;}).join('');
  const xtick=[0,15,30,45,60,75,90].map(a=>`<text x="${left+cw/2+a/90*(pw-cw)}" y="${H-20}" text-anchor="middle">${a}°</text>`).join('');
  const ri=(result.roundness-.1)/.9*18,ci=state.angle/90*30;
  const marker=result.roundness>=.1&&result.roundness<=1?`<g class="heat-focus"><circle cx="${left+(ci+.5)*cw}" cy="${top+(18-ri+.5)*ch}" r="7" fill="none" stroke="white" stroke-width="3"/><circle cx="${left+(ci+.5)*cw}" cy="${top+(18-ri+.5)*ch}" r="8.5" fill="none" stroke="var(--ink)" stroke-width="1.5"/></g>`:'';
  $('heatmap').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="map-svg-title map-svg-desc"><title id="map-svg-title">Temperatura por forma e inclinação, a volume constante</title><desc id="map-svg-desc">Formas de D/H 0,10 a 1,00 e ângulos de 0 a 90 graus. Temperatura mínima ${fmt(min,2)} °C e máxima ${fmt(max,2)} °C. Para explorar com teclado, use os controles de forma e inclinação.</desc><text x="${left}" y="11" class="axis-title">Forma · D/H</text>${cells}${marker}${ytick}${xtick}<text x="${W-right}" y="${H-1}" text-anchor="end" class="axis-title">Inclinação do eixo acima da horizontal</text></svg>`;
  $('map-min').textContent=fmt(min,1)+' °C';$('map-max').textContent=fmt(max,1)+' °C';
  $('map-readout').textContent=`Atual: D/H = ${fmt(result.roundness,2)} · θ = ${fmt(state.angle,0)}° · Volume ${fmt(result.volume*1e9,2)} mm³${result.roundness<.1?' (forma fora da faixa exibida)':''}.`;
  $('heatmap').querySelectorAll('.map-cell').forEach(el=>{
    const cell=map[Number(el.dataset.row)][Number(el.dataset.col)];
    el.addEventListener('pointerenter',()=>{$('map-readout').textContent=`D/H = ${fmt(cell.roundness,2)} · θ = ${cell.angle}° · T = ${fmt(cell.temperature,2)} °C · Volume ${fmt(result.volume*1e9,2)} mm³`;});
    el.addEventListener('click',()=>{state={...shapeAtVolume(state,cell.roundness),angle:cell.angle};syncInputs();render();$('map-readout').textContent=`Aplicado: D/H = ${fmt(cell.roundness,2)} · θ = ${cell.angle}°; volume conservado.`;});
  });
}
$('roundness').addEventListener('input',()=>{if(!result)return;state=shapeAtVolume(state,Number($('roundness').value));syncInputs();render();});
for(const key of fields)$(key).addEventListener('input',()=>{readInput(key);render();});
for(const key of dimensions)$(key).addEventListener('blur',()=>syncDimension(key));
$('reset').addEventListener('click',()=>{state={...PAPER,longwaveModel:state.longwaveModel};pinned=null;syncInputs();render();$('action-status').textContent='Referência restaurada.';});
for(const b of document.querySelectorAll('[data-radiation]'))b.addEventListener('click',()=>{state.radiation=Number(b.dataset.radiation);syncInputs();render();});
$('pin').addEventListener('click',()=>{pinned=pinned?null:{...state};render();$('action-status').textContent=pinned?'Cenário fixado. Altere os parâmetros para comparar.':'Comparação removida.';});
function setMetric(next){metric=next;$('show-temp').setAttribute('aria-pressed',next==='temperature');$('show-area').setAttribute('aria-pressed',next==='projected');if(result)drawLine();}
$('show-temp').addEventListener('click',()=>setMetric('temperature'));$('show-area').addEventListener('click',()=>setMetric('projected'));
$('share').addEventListener('click',async()=>{const url=new URL(location.href);url.hash='';url.search='';for(const key of fields)url.searchParams.set(key,state[key]);try{await navigator.clipboard.writeText(url.href);$('action-status').textContent='Link do cenário copiado.';}catch{history.replaceState(null,'',url);$('action-status').textContent='Cenário salvo na barra de endereço. Copie o endereço para compartilhar.';}});
$('export').addEventListener('click',()=>{
  sweep=angleSweep(state);map=shapeMap(state);
  const columns=['dataset','mode','h_type','height_mm','diameter_mm','angle_deg','radiation_W_m2','wind_input_m_s','wind_effective_m_s','air_C','absorption','emissivity','air_emissivity','cl','exponent','roundness_D_H','volume_mm3','projected_mm2','h_W_m2_K','temperature_C','solar_mW','convection_mW','longwave_mW','residual_W','longwave_model','ambient_emissivity','longwave_emitted_mW','longwave_received_mW','longwave_sky_received_mW','longwave_ambient_received_mW'];
  const row=(name,p,r)=>[name,p.mode,p.hType,p.height,p.diameter,p.angle,p.radiation,p.wind,r.effectiveWind,p.air,p.absorption,p.emissivity,p.airEmissivity,p.cl,p.exponent,r.roundness,r.volume*1e9,r.projected*1e6,r.h,r.temperature,r.solar*1000,r.convection*1000,r.longwave*1000,r.net,p.longwaveModel??'paper',p.longwaveModel==='sky-environment'?AMBIENT_EMISSIVITY:'',r.longwaveEmitted*1000,r.longwaveReceived*1000,r.longwaveSkyReceived===null?'':r.longwaveSkyReceived*1000,r.longwaveAmbientReceived===null?'':r.longwaveAmbientReceived*1000];
  const rows=[row('current',state,result),...sweep.map(r=>row('angle_sweep',{...state,angle:r.angle},r)),...map.flat().map(r=>row('shape_map',{...shapeAtVolume(state,r.roundness),angle:r.angle},r))];
  if(pinned)rows.push(row('pinned',pinned,solve(pinned)),...angleSweep(pinned).map(r=>row('pinned_sweep',{...pinned,angle:r.angle},r)));
  const blob=new Blob([columns.join(',')+'\r\n'+rows.map(r=>r.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shaped-by-the-sun.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('action-status').textContent='CSV exportado com os parâmetros e os resultados dos gráficos.';
});

function updateAnalysis(){
  if(!result)return;
  sweep=angleSweep(state);map=shapeMap(state);drawLine();drawMap();
}
$('analysis').addEventListener('toggle',()=>{if($('analysis').open)updateAnalysis();});
$('open-analysis').addEventListener('click',()=>{$('analysis').open=true;});
function selectControlTab(name,focus=false){
  for(const tab of ['environment','body']){
    const selected=tab===name,button=$(tab+'-tab');
    button.setAttribute('aria-selected',selected);button.tabIndex=selected?0:-1;
    $(tab+'-controls').hidden=!selected;
  }
  if(focus)$(name+'-tab').focus();
}
for(const tab of ['environment','body']){
  $(tab+'-tab').addEventListener('click',()=>selectControlTab(tab));
  $(tab+'-tab').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();selectControlTab(e.key==='Home'?'environment':e.key==='End'?'body':tab==='environment'?'body':'environment',true);}});
}
for(const button of document.querySelectorAll('[data-angle]'))button.addEventListener('click',()=>{state.angle=Number(button.dataset.angle);syncInputs();render();});
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let paused=motionPreference.matches;
function applyMotion(){
  $('simulation').classList.toggle('paused',paused);$('motion').setAttribute('aria-pressed',paused);
  $('motion').textContent=paused?'Ativar animação ▷':'Pausar animação Ⅱ';
}
$('motion').addEventListener('click',()=>{paused=!paused;applyMotion();});applyMotion();
const mobileScene=matchMedia('(max-width: 730px)');
function resizeScene(){$('scene').setAttribute('viewBox',mobileScene.matches?'110 0 780 700':'0 0 1000 700');}
mobileScene.addEventListener('change',resizeScene);resizeScene();
const rotationTarget=$('body-interaction'),scene=$('scene');
let dragging=false,dragOffset=0;
function applySceneAngle(angle){if(!result)return;const next=Math.round(Math.min(90,Math.max(0,angle)));if(next===state.angle)return;state.angle=next;$('angle').value=next;render();}
function pointerAngle(event){
  const point=scene.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
  const local=point.matrixTransform(scene.getScreenCTM().inverse());
  // Either end of the cylinder can be grabbed; mirror the axis into the first quadrant.
  return Math.atan2(Math.abs(local.y-410),Math.abs(local.x-500))*180/Math.PI;
}
rotationTarget.addEventListener('pointerdown',e=>{if(!result)return;e.preventDefault();dragging=true;dragOffset=state.angle-pointerAngle(e);rotationTarget.setPointerCapture(e.pointerId);});
rotationTarget.addEventListener('pointermove',e=>{if(dragging)applySceneAngle(pointerAngle(e)+dragOffset);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])rotationTarget.addEventListener(type,()=>{dragging=false;});
rotationTarget.addEventListener('keydown',e=>{
  const moves={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1};
  if(e.key in moves){e.preventDefault();applySceneAngle(state.angle+moves[e.key]*(e.shiftKey?5:1));}
  if(e.key==='Home'||e.key==='End'){e.preventDefault();applySceneAngle(e.key==='Home'?0:90);}
});

const params=new URLSearchParams(location.search);
for(const k of fields)if(params.has(k))state[k]=numeric.includes(k)?(params.get(k)===''?NaN:Number(params.get(k))):params.get(k);
// Do not silently reinterpret links that selected a removed convection model.
for(const key of ['mode','hType'])if(params.has(key))state[key]=params.get(key);
if(state.mode!==PAPER.mode||state.hType!==PAPER.hType)$('action-status').textContent='Use Restaurar para aplicar a configuração do artigo a este cenário.';
syncInputs();render();
