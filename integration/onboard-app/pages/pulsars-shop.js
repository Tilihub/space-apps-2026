import {CATALOG,ITEM_BY_ID,DEFAULT_LOOK} from '/pulsars/catalog.js';
import {mascotSvg,coin} from '/pulsars-mascot.js';
const sections={body:'Colors',ring:'Orbits',expression:'Expressions',accessory:'Accessories'};
export function createPulsarsShop({state,redraw,api,onWallet,esc}){
 let slot='body',selected='body-cyan',look=null;
 const wallet=()=>state().wallet;
 const preview=()=>look??wallet()?.equipped??DEFAULT_LOOK;
 function screen(){
  const w=wallet();if(!look&&w)selected=w.equipped[slot];
  const item=ITEM_BY_ID[selected],owned=w?.owned.includes(item.id),equipped=w?.equipped[item.slot]===item.id;
  const balance=w?.balance??0,enough=balance>=item.price;
  return `<div class="shop-intro"><div><h2>A little more you.</h2><p>Your pace. Your progress. Your companion.</p></div><div class="shop-wallet">${coin()}<span><b>${balance.toLocaleString('en-US')}</b><small>Pulsars</small></span></div></div><div class="shop-layout"><aside class="shop-fitting card"><div class="shop-stage"><span class="eyebrow">YOUR COMPANION</span><div class="shop-halo"></div><div class="shop-planet">${mascotSvg(preview())}</div><span class="shop-preview-label">${look?'Trying on':'Currently wearing'}</span></div><div class="shop-selection"><span class="eyebrow">${sections[item.slot]}</span><h3>${esc(item.name)}</h3><div class="shop-purchase-row"><span class="shop-price">${owned?'In your collection':`${coin()} ${item.price.toLocaleString('en-US')}`}</span><button class="btn primary" data-action="pulsars-${owned?'equip':'buy'}" data-id="${item.id}" ${!w||equipped||(!owned&&!enough)?'disabled':''}>${equipped?'Wearing':owned?'Wear it':'Unlock & wear'}</button></div>${!owned&&!enough?`<p class="shop-saving">${(item.price-balance).toLocaleString('en-US')} more Pulsars to go. One day at a time.</p>`:''}<button class="shop-reset" data-action="pulsars-preview-reset">Back to my look</button></div><div class="shop-progress"><div><span>Exercise streak</span><b>${w?.trainingStreak??0}<small> days</small></b></div><div><span>Wellbeing streak</span><b>${w?.wellbeingStreak??0}<small> days</small></b></div></div><details class="shop-earning"><summary>How you earn Pulsars</summary><p>Complete a main exercise or daily wellbeing: 100 Pulsars. From your fourth consecutive completed day: 200. From your sixth: 300.</p><p>A new load PR with all assigned sets and reps: +100. Your first record sets the baseline. Warm-up, cool-down and rest days do not earn points; planned rest preserves your exercise streak.</p><p>Exercise and wellbeing have separate streaks. No rankings, lost coins or scores for your answers.</p></details></aside><div class="shop-browse"><div class="shop-tabs" role="group" aria-label="Shop categories">${Object.entries(sections).map(([id,name])=>`<button class="btn ghost" data-action="pulsars-tab" data-id="${id}" aria-pressed="${slot===id}">${name}</button>`).join('')}</div><div class="shop-grid">${CATALOG.filter(x=>x.slot===slot).map(x=>{const own=w?.owned.includes(x.id),wear=w?.equipped[x.slot]===x.id;return `<button class="shop-product ${selected===x.id?'is-selected':''}" data-action="pulsars-preview" data-id="${x.id}" aria-pressed="${selected===x.id}" aria-label="Try ${esc(x.name)}${own?', owned':`, ${x.price} Pulsars`}"><span class="shop-product-badge">${wear?'Wearing':own?'Owned':x.premium?'SPECIAL EDITION':''}</span><span class="shop-product-art">${mascotSvg({...preview(),[x.slot]:x.id})}</span><b>${esc(x.name)}</b><span class="shop-product-price">${own?'In your collection':`${coin()} ${x.price.toLocaleString('en-US')}`}</span></button>`;}).join('')}</div></div></div>`;
 }
 async function action(el){
  const a=el.dataset.action,id=el.dataset.id,w=wallet();
  if(a==='pulsars-tab'){slot=id;selected=CATALOG.find(x=>x.slot===id&&x.price>0).id;look={...preview(),[slot]:selected};}
  if(a==='pulsars-preview'){selected=id;look={...preview(),[ITEM_BY_ID[id].slot]:id};}
  if(a==='pulsars-preview-reset')look=null;
  if(a==='pulsars-buy'||a==='pulsars-equip'){
   if(!w)throw Error('Your wallet is reconnecting. Try again shortly.');
   const result=await api(`/pulsars/${a==='pulsars-buy'?'purchase':'equip'}`,{method:'POST',body:{itemId:id}});onWallet(result.wallet);look=null;
  }
  redraw();
 }
 return {screen,action,reset:()=>{slot='body';selected='body-cyan';look=null;}};
}
