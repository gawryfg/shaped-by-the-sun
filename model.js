// Units: metres, seconds, kelvin internally; UI dimensions in mm, temperatures in °C.
export const SIGMA = 5.67e-8;
export const PAPER = Object.freeze({mode:'paper', hType:'Mitchell', height:8, diameter:4,
  angle:90, radiation:1000, wind:0.1, air:30, absorption:0.85,
  emissivity:0.95, airEmissivity:0.88, cl:0.52, exponent:0.50});
export const LEGACY = Object.freeze({...PAPER, mode:'legacy', angle:0, wind:0.2, cl:0.34, exponent:0.60});
export function validate(p) {
  for (const k of ['height','diameter','angle','radiation','wind','air','absorption','emissivity','airEmissivity','cl','exponent']) {
    if (!Number.isFinite(p[k])) throw new Error('Preencha todos os parâmetros com números válidos.');
  }
  if (!(p.height>0 && p.diameter>0 && p.height>=p.diameter)) throw new Error('O comprimento deve ser maior ou igual ao diâmetro, ambos positivos.');
  if (p.angle<0 || p.angle>90 || p.radiation<0 || p.wind<0 || p.air<=-273.15 || p.cl<=0 || p.exponent<=0) throw new Error('Parâmetros fora do domínio do modelo.');
  for (const k of ['absorption','emissivity','airEmissivity']) if (p[k]<0 || p[k]>1) throw new Error('Absorção e emissividades devem estar entre 0 e 1.');
  if (!['paper','legacy'].includes(p.mode) || !['Mitchell','Gates','Lactin','King'].includes(p.hType)) throw new Error('Modelo desconhecido.');
  if (p.mode==='paper' && p.hType!=='Mitchell') throw new Error('O artigo utiliza Mitchell; selecione Shiny legado para outros coeficientes.');
}
export function geometry(p) {
  const height=p.height/1000, r=p.diameter/2000, a=p.angle*Math.PI/180;
  const volume=Math.PI*r*r*height, surface=2*Math.PI*r*(r+height);
  const projected=2*r*height*Math.cos(a)+Math.PI*r*r*Math.sin(a);
  return {height,r,volume,surface,projected,roundness:p.diameter/p.height};
}
export function coefficient(p,g=geometry(p)) {
  const wind=p.mode==='paper'?Math.max(0.1,p.wind):p.wind;
  const viscosity=p.mode==='paper'?15.2e-6:15.3e-6;
  const conductivity=p.mode==='paper'?25.6e-3:25.7e-3;
  if (p.hType==='Mitchell') {
    const l=Math.cbrt(g.volume);
    return p.cl*conductivity/l*(wind*l/viscosity)**p.exponent;
  }
  if (p.hType==='Gates') {
    const d=2*g.r, re=6.54e4*wind*d;
    return re<=40?1.507*wind**0.385*d**(-0.615):2.77*wind**0.466*d**(-0.534);
  }
  if (p.hType==='Lactin') {
    const massG=0.800*g.volume*1e9/1000;
    return 14.571*massG**(-0.3798)*(0.1+wind)**0.5659;
  }
  // app.R uses actual cylinder length (cm) here; the older heat_transfer_model.R uses V^(1/3).
  const lengthCm=g.height*100, volumeCm=g.volume*1e6, speedCm=wind*100;
  const d=Math.sqrt(4*volumeCm/(Math.PI*lengthCm));
  if (speedCm===0) return 0; // Continuous limit of exp(a+b*log(Re)).
  return 10*(0.26/d)*Math.exp(-0.5961460+0.3875294*Math.log(speedCm*d/(15.3e-6*1e4)));
}
export function fluxes(p,temperature,g=geometry(p),h=coefficient(p,g)) {
  const ta=p.air+273.15, ts=temperature+273.15;
  const solar=g.projected*p.radiation*p.absorption;
  const convection=h*g.surface*(ta-ts);
  // Intentionally preserves supplementary eq. 3, including both emissivities on both terms.
  const longwave=g.surface*p.emissivity*p.airEmissivity*SIGMA*(ta**4-ts**4);
  return {solar,convection,longwave,net:solar+convection+longwave};
}
export function solve(p) {
  validate(p);
  const g=geometry(p), h=coefficient(p,g);
  if (!(h>0 || p.emissivity*p.airEmissivity>0)) throw new Error('Sem convecção ou emissão térmica, não há equilíbrio único neste modelo.');
  // Solar gain is nonnegative; the unique root is at or above air temperature.
  let lo=p.air, hi=p.air+20;
  while (fluxes(p,hi,g,h).net>0 && hi<1e6) hi=p.air+2*(hi-p.air);
  if (fluxes(p,hi,g,h).net>0) throw new Error('Não foi possível delimitar a temperatura de equilíbrio.');
  for (let i=0;i<90;i++) {
    const mid=(lo+hi)/2;
    if (fluxes(p,mid,g,h).net>0) lo=mid; else hi=mid;
  }
  const temperature=(lo+hi)/2;
  return {temperature,excess:temperature-p.air,h,...g,...fluxes(p,temperature,g,h),effectiveWind:p.mode==='paper'?Math.max(.1,p.wind):p.wind};
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
