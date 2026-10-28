// Units: metres, seconds, kelvin internally; UI dimensions in mm, temperatures in °C.
export const SIGMA = 5.67e-8;
export const AMBIENT_EMISSIVITY = 0.95;
export const PAPER = Object.freeze({mode:'paper', hType:'Mitchell', height:8, diameter:4,
  angle:90, radiation:1000, wind:0.1, air:30, absorption:0.85,
  emissivity:0.95, airEmissivity:0.88, cl:0.52, exponent:0.50, longwaveModel:'paper'});
export function validate(p) {
  for (const k of ['height','diameter','angle','radiation','wind','air','absorption','emissivity','airEmissivity','cl','exponent']) {
    if (!Number.isFinite(p[k])) throw new Error('Preencha todos os parâmetros com números válidos.');
  }
  if (!(p.height>0 && p.diameter>0 && p.height>=p.diameter)) throw new Error('O comprimento deve ser maior ou igual ao diâmetro, ambos positivos.');
  if (p.angle<0 || p.angle>90 || p.radiation<0 || p.wind<0 || p.air<=-273.15 || p.cl<=0 || p.exponent<=0) throw new Error('Parâmetros fora do domínio do modelo.');
  for (const k of ['absorption','emissivity','airEmissivity']) if (p[k]<0 || p[k]>1) throw new Error('Absorção e emissividades devem estar entre 0 e 1.');
  if ((p.mode??'paper')!=='paper' || (p.hType??'Mitchell')!=='Mitchell') throw new Error('Apenas a configuração de convecção do artigo (Mitchell) está disponível.');
  if (!['paper','sky-environment'].includes(p.longwaveModel??'paper')) throw new Error('Modelo de ondas longas desconhecido.');
}
export function geometry(p) {
  const height=p.height/1000, r=p.diameter/2000, a=p.angle*Math.PI/180;
  const volume=Math.PI*r*r*height, surface=2*Math.PI*r*(r+height);
  const projected=2*r*height*Math.cos(a)+Math.PI*r*r*Math.sin(a);
  return {height,r,volume,surface,projected,roundness:p.diameter/p.height};
}
export function coefficient(p,g=geometry(p)) {
  const wind=Math.max(0.1,p.wind),l=Math.cbrt(g.volume);
  return p.cl*0.0256/l*(wind*l/(15.2e-6))**p.exponent;
}
export function fluxes(p,temperature,g=geometry(p),h=coefficient(p,g)) {
  const ta=p.air+273.15, ts=temperature+273.15;
  const solar=g.projected*p.radiation*p.absorption;
  const convection=h*g.surface*(ta-ts);
  const split=p.longwaveModel==='sky-environment';
  // Each hemisphere sees half the surface. Both incoming terms include sigma (W).
  const longwaveSkyReceived=split?g.surface/2*SIGMA*p.emissivity*p.airEmissivity*ta**4:null;
  const longwaveAmbientReceived=split?g.surface/2*SIGMA*p.emissivity*AMBIENT_EMISSIVITY*ta**4:null;
  const longwaveReceived=split?longwaveSkyReceived+longwaveAmbientReceived:g.surface*p.emissivity*p.airEmissivity*SIGMA*ta**4;
  const longwaveEmitted=g.surface*p.emissivity*SIGMA*ts**4*(split?1:p.airEmissivity);
  // Preserve the original expression and its reference results in the default model.
  const longwave=split?longwaveReceived-longwaveEmitted:g.surface*p.emissivity*p.airEmissivity*SIGMA*(ta**4-ts**4);
  return {solar,convection,longwave,longwaveReceived,longwaveEmitted,longwaveSkyReceived,longwaveAmbientReceived,net:solar+convection+longwave};
}
export function solve(p) {
  validate(p);
  const g=geometry(p), h=coefficient(p,g);
  const emissionFactor=p.emissivity*(p.longwaveModel==='sky-environment'?1:p.airEmissivity);
  if (!(h>0 || emissionFactor>0)) throw new Error('Sem convecção ou emissão térmica, não há equilíbrio único neste modelo.');
  // Radiative cooling can put the new model below air temperature. Absolute zero
  // is a physical lower bound with nonnegative net input for valid parameters.
  let lo=fluxes(p,p.air,g,h).net>=0?p.air:-273.15, hi=p.air+20;
  while (fluxes(p,hi,g,h).net>0 && hi<1e6) hi=p.air+2*(hi-p.air);
  if (fluxes(p,hi,g,h).net>0) throw new Error('Não foi possível delimitar a temperatura de equilíbrio.');
  for (let i=0;i<90;i++) {
    const mid=(lo+hi)/2;
    if (fluxes(p,mid,g,h).net>0) lo=mid; else hi=mid;
  }
  const temperature=(lo+hi)/2;
  return {temperature,excess:temperature-p.air,h,...g,...fluxes(p,temperature,g,h),effectiveWind:Math.max(.1,p.wind)};
}
export function shapeAtVolume(p,roundness) {
  const {volume}=geometry(p), r=Math.cbrt(volume*roundness/(2*Math.PI));
  return {...p,diameter:2*r*1000,height:2*r/roundness*1000};
}
export function angleSweep(p) {
  return Array.from({length:91},(_,angle)=>({angle,...solve({...p,angle})}));
}
export function shapeMap(p) {
  return Array.from({length:19},(_,i)=>{
    const roundness=0.1+i*0.05, shape=shapeAtVolume(p,roundness);
    return Array.from({length:31},(_,j)=>({roundness,angle:j*3,...solve({...shape,angle:j*3})}));
  });
}
