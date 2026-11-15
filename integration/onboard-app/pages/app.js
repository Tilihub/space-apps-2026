import {compartmentLabel} from '/cabinet-labels.js';
import {POINT_BY_ID} from '/body-points.js';
import { thermalDemo } from '/demo-thermal.js';
import { createMissionViews } from '/mission-views.js';
import { CREW, SYMPTOMS, MEASUREMENTS, SCALES } from '/shared/contract/contract.js';
import { createHealthClient } from '/people/angelos/health/client.js';
import { createCompanionClient } from '/people/potest/crew-support/companion-client.js';
import { createWorkoutController } from '/demo-data/workout-session.js';

const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const time = iso => iso ? `Day ${Math.floor((Date.parse(iso)-Date.parse('2026-10-03T00:00:00Z'))/86400000)} · ${iso.slice(11,16)} UTC` : '—';
const member = id => CREW.find(c => c.id === id)?.name ?? id ?? 'Earth specialist';
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const tag = (text, red = false) => `<span class="pill ${red?'red':'blue'}">${esc(text)}</span>`;
const btn = (label, action, attrs = '', cls = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const card = (title, content, cls = '') => `<div class="card ${cls}"><div class="card-head"><h3>${title}</h3></div>${content}</div>`;
const qrFor = code => { try { return `<div class="credential-qr">${window.MedQR.svg(code,4).svg}</div>`; } catch { return '<p class="subtle">QR rendering unavailable; the same code can be typed.</p>'; } };
  const mascotSvg = () => `<svg viewBox="0 0 64 64" aria-hidden="true">
    <ellipse class="m-ring back" cx="32" cy="34" rx="29" ry="9" transform="rotate(-18 32 34)"/>
    <circle cx="32" cy="32" r="17" fill="url(#mascotGrad)"/>
    <circle class="m-cheek" cx="22.5" cy="36.5" r="2.2"/><circle class="m-cheek" cx="41.5" cy="36.5" r="2.2"/>
    <ellipse class="m-eye" cx="26.5" cy="30.5" rx="2.5" ry="3.3"/><ellipse class="m-eye" cx="37.5" cy="30.5" rx="2.5" ry="3.3"/>
    <path class="m-smile" d="M28 37 Q32 40.5 36 37"/>
    <path class="m-ring" d="M4.4 43 A29 9 -18 0 0 59.6 25"/>
  </svg>`;


const empty = text => `<p class="empty">${esc(text)}</p>`;
const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const tr = cells => `<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
const field = (label, name, { type='text', value='', attrs='', required=false }={}) => `<label class="field"><span>${label}</span><input class="input" name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${attrs}></label>`;
const select = (label,name,options,value='') => `<label class="field"><span>${label}</span><select class="input" name="${name}">${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
const note = (label='Notes', name='note', max=2000) => `<label class="field"><span>${label}</span><textarea class="input" name="${name}" rows="3" maxlength="${max}"></textarea></label>`;
const submit = label => `<button class="btn primary" type="submit">${label}</button>`;
let token = sessionStorage.getItem('pulse-token'), user = null, clock = null, data = {}, page = 'login';
let revision=0, loading=0, patient='c4', eventsAfter=0, busy=false, collection=null, suggestion=null;
let drafts={}, selectedArea=null, stagedSymptoms=[], chat=[], companionOpen=false, workout=null, workoutMode='weekly', workoutDay=null;
let replay=null, guides=[], generatedCode='';
const role = () => user?.role;
const health = createHealthClient({token:()=>token});
const companion = createCompanionClient({getToken:()=>token});
async function api(path, { method='GET', body, publicRequest=false }={}) {
  const version=revision, current=token;
  const res=await fetch(`/api${path}`,{method,cache:'no-store',headers:{'Content-Type':'application/json',...(!publicRequest&&current?{Authorization:`Bearer ${current}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await res.json();
  if(version!==revision || (!publicRequest&&current!==token)) throw new Error('Session changed. Try again.');
  if(!res.ok || !result.ok) throw Object.assign(new Error(result.error?.message ?? 'The request failed.'),{code:result.error?.code});
  return result.data;
}
let noticeTimer;
function notice(message,error=false) {
 const copy={'Today’s check-in was saved to the health module.':'Mood, stress and fatigue saved.','Symptom report saved. Medicine guidance is shown below.':'Symptom report saved.','Decision saved by the medicine module.':'Decision saved.','Workout summary saved in the health module.':'Workout saved.','Collection complete. Doses and stock were updated.':'Collection complete.','Collection opened. Confirm each dispensed item once.':'Ready to collect. Confirm each item.'};
 clearTimeout(noticeTimer);$('#notice').hidden=false;$('#notice').className=`notice ${error?'error':''}`;$('#notice').textContent=copy[message]??message;
 if(!error)noticeTimer=setTimeout(()=>{$('#notice').hidden=true;},5000);
}
function clearNotice() { $('#notice').hidden=true; }
function resetLocal() { missionViews.resetSession(); for(const key of Object.keys(sessionStorage))if(key.startsWith('pulse-wellbeing-draft:'))sessionStorage.removeItem(key);sessionStorage.removeItem('pulse-collection'); revision++; loading++; companion.clearSession(); drafts={}; data={}; chat=[]; workout=null; workoutDay=null; collection=null; suggestion=null; selectedArea=null; stagedSymptoms=[]; generatedCode=''; companionOpen=false; eventsAfter=0; }
async function login(crewId,platform='astronaut') {
  const old=token;
  // Revoke only this tab's old session. Other tabs keep their own tokens.
  if(old) await api('/session',{method:'DELETE'}).catch(()=>{});
  resetLocal(); token=null; user=null;
  const result=await api('/session',{method:'POST',body:{crewId,platform},publicRequest:true});
  token=result.token; user=result.user; sessionStorage.setItem('pulse-token',token);
  location.hash=platform==='medical'?'crew':platform==='earth'?'earth':'home';
  await show();
}
async function logout() { try { await api('/session',{method:'DELETE'}); } catch { /* Clear this tab even if its old server token expired. */ } resetLocal(); token=null; user=null; sessionStorage.removeItem('pulse-token'); location.hash='login'; await show(); }
const personQuery = () => `?crewId=${encodeURIComponent(patient)}`;
const allBins = () => (data.lockers?.lockers ?? []).flatMap(l=>l.shelves.flatMap(s=>s.bins));
const binName = id => allBins().find(b=>b.itemId===id)?.label ?? id;
const defaultNumbers = {sleepHours:'',restingHeartRateBpm:'',mood:'',stress:'',fatigue:''};
function checkInFields() {
  return Object.entries({...MEASUREMENTS,...Object.fromEntries(Object.entries(SCALES).filter(([k])=>k!=='symptomSeverity').map(([k,v])=>[k,{...v,label:k[0].toUpperCase()+k.slice(1),unit:'/10'}]))})
    .map(([key,m])=>field(`${esc(m.label)} (${m.unit})`,key,{type:'number',attrs:`min="${m.min}" max="${m.max}" step="${Object.hasOwn(SCALES,key)?1:0.1}"`,value:data.today?.checkIn?.[key]??defaultNumbers[key]??''})).join('');
}
function restoreDrafts() {
  for(const form of document.querySelectorAll('form[id]')) for(const input of form.elements) {
    const saved=drafts[form.id]?.[input.name];
    if(saved!==undefined && input.name) { if(input.type==='checkbox') input.checked=saved===true; else input.value=saved; }
  }
}
function remember(form) {
  if(!form?.id) return;
  drafts[form.id]={};
  for(const input of form.elements) if(input.name) drafts[form.id][input.name]=input.type==='checkbox'?input.checked:input.value;
}
function crewSelect(name='patientId',value=user?.crewId) { return select('Crew member',name,CREW.map(c=>[c.id,c.name]),value); }
function bodyOptions(mode) {
  const map={head:'head',eyes:'eyes','nose-throat':'neck',heart:'chest',lungs:'chest',gut:'stomach',skin:'arms',muscles:'back','whole-body':'legs'};
  const reported={};
  for(const r of data.symptoms?.reports??[]) if(r.missionDay===clock?.missionDay) for(const s of r.symptoms) {
    const sym=SYMPTOMS.find(x=>x.code===s.code);
    if(sym){
      const area=r.note?.match(/Body area: (head|eyes|neck|chest|arms|back|stomach|legs)\./)?.[1]??map[sym.area];
      const exact=r.note?.match(/Point: ([a-z-]+)\./)?.[1];
      reported[POINT_BY_ID[exact]?exact:area]={short:sym.label,severity:s.severity};
    }
  }
  return {mode,body:({c1:'female',c2:'male',c3:'female',c4:'male',c5:'male'})[user?.crewId]??'female',reported,selected:selectedArea,thermal:page==='home'&&clock?.missionDay===42?thermalDemo[user?.crewId]:null};
}
function syncBody() { const frame=$('iframe.body-frame'); frame?.contentWindow?.postMessage({type:'pulse-body-update',options:bodyOptions(page==='checkin'?'report':'view'),theme:document.documentElement.dataset.theme},location.origin); }
const bodyFrame = mode => `<iframe class="body-frame" src="/body.html?mode=${mode}&body=${bodyOptions(mode).body}&typeface=${document.documentElement.dataset.typeface}" title="Interactive 3D body"></iframe>`;
function renderChrome() {
 const logged=!!user&&page!=='login';
 $('#nav').hidden=!logged;$('#topbar').hidden=!logged;$('#app-header').hidden=!logged;$('#app-footer').hidden=!logged;
 document.body.classList.toggle('signed-out',!logged);
 $('#floating-companion').hidden=!logged||role()!=='crew';
 $('#nav-crew').href=role()==='earth'?'#earth':'#crew';$('#nav-crew span').textContent=role()==='earth'?'Earth console':'Clinical review';
 for(const a of document.querySelectorAll('[data-nav]')){
  a.hidden=role()!=='crew'&&a.id!=='nav-crew'&&!['habitat','medbay'].includes(a.dataset.nav);
  if(a.dataset.nav===page||a.id==='nav-crew'&&['crew','earth'].includes(page))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 }
 $('#nav-crew').hidden=role()==='crew';
 $('.rail-companion').hidden=true;
 const person=CREW.find(c=>c.id===user?.crewId),name=user?.name??member(user?.crewId);
 $('#app-header').innerHTML=`<a href="#${role()==='earth'?'earth':role()==='medical_officer'?'crew':'home'}" class="mission-brand"><img class="header-team-logo" src="/assets/team-logo.png" alt="May the Pulse Be With You"></a><span class="mission-clock" id="mission-label">${clock?`Day ${clock.missionDay} · ${clock.now.slice(11,19)} UTC`:''}</span><div class="header-profile"><span class="avatar">${esc(name?.split(' ').map(n=>n[0]).join('')??'E')}</span><span><b>${esc(name)}</b><small>${esc(person?.title??'Earth specialist')}</small></span>${btn(icon('sun'),'theme','aria-label="Switch appearance" title="Switch appearance"','ghost icon-button')}${btn('?','ui-help','aria-label="Help" title="Help"','ghost icon-button')}${btn('Sign out','logout','','ghost sm')}</div>`;
 const titles={home:['YOUR DAY IN ORBIT','Overview'],checkin:['A MOMENT FOR YOURSELF','Daily check-in'],fitness:['KEEP MOVING FORWARD','Exercise'],habitat:['YOUR SHARED ENVIRONMENT','Habitat'],medbay:['SUPPLIES & TREATMENT','Medical bay'],mind:['A LITTLE SPACE TO BREATHE','Wellbeing'],crew:['CREW MEDICAL OFFICER','Clinical review'],earth:['GROUND SUPPORT','Earth console']};
 const [eyebrow,title]=titles[page]??['PULSE','Mission support'];
 $('#topbar').innerHTML=`<div><span class="eyebrow">${eyebrow}</span><h1 class="page-title">${title}</h1></div><div class="page-tools"><span class="demo-label">DEMO</span>${btn(`${icon('refresh')}<span>Refresh</span>`,'refresh','aria-label="Refresh"','ghost sm')}</div>`;
 $('#emergency-banner').hidden=!(data.emergencies?.emergencies?.length);
 $('#emergency-banner').textContent=(data.emergencies?.emergencies??[]).map(e=>`OPEN EMERGENCY · ${member(e.patientId)} · ${time(e.raisedAt)}`).join(' | ');
 $('#orb-art').innerHTML=mascotSvg();$('#orb-badge').hidden=true;
 renderCompanion();
}
function chatTranscript() {
 return chat.length ? chat.map(m=>`<p class="msg ${m.mine?'me':'them'}">${esc(m.text)}</p>`).join('')
  : `<p class="msg them">How are you feeling today? I’m here if you want to talk.</p>`;
}
function chatComposer(id,label) {
 return `<form id="${id}" class="composer"><input class="input" name="message" aria-label="${label}" placeholder="Type a message" maxlength="2000" required autocomplete="off"><button class="btn primary" type="submit" aria-label="Send message">${icon('send')}</button></form>`;
}
function refreshChatViews() {
 for(const thread of document.querySelectorAll('[data-chat-thread]')) {
  thread.innerHTML=chatTranscript(); thread.scrollTop=thread.scrollHeight;
 }
}
function renderCompanion() {
 $('#cp').hidden=!companionOpen;
 $('#cp-mini').innerHTML=mascotSvg();
 $('#cp-body').innerHTML=`<div class="thread companion-thread" data-chat-thread aria-live="polite" aria-relevant="additions text">${chatTranscript()}</div>`;
 $('#cp-actions').innerHTML=`${chatComposer('chat-form','Message companion')}<a class="more" href="#mind">Open your private space</a><small class="subtle">Offline · health context</small>`;
 restoreDrafts();
}
function loginScreen() {
 return `<div class="login"><div class="login-card"><svg class="icon logo-lg" aria-hidden="true"><use href="#i-logo"/></svg><h1 class="display">PULSE</h1><p class="muted">Mars transit · connected team demo</p><div class="crew-pick">${CREW.map(c=>`<button class="crew-btn" data-action="login" data-id="${c.id}"><span class="avatar lg">${c.name.split(' ').map(x=>x[0]).join('')}</span><b>${c.name}</b><small>${c.title}</small></button>`).join('')}</div><div class="btn-row">${btn('Medical officer · Leo','login-medical','','ghost')}${btn('Earth specialist','login-earth','','ghost')}</div><p class="subtle">Synthetic crew profiles and demo sessions. Choose a role to test its actual API permissions. Registration and face authentication are not implemented.</p></div></div>`;
}
function homeScreen() {
 const row=data.today?.checkIn, doses=data.doses?.doses??[], grants=data.grants?.grants??[];
 const measurements=row?Object.entries({...MEASUREMENTS,mood:{label:'Mood',unit:'/10'},stress:{label:'Stress',unit:'/10'},fatigue:{label:'Fatigue',unit:'/10'}}).filter(([k])=>row[k]!=null):[];
 return `<div class="home-grid">${card('Body',`<div class="figure-wrap">${bodyFrame('view')}</div><p class="hint">Your reported symptoms today</p><a class="more" href="#checkin">Report a symptom ${icon('chev')}</a>`,'body-card')}${card('Today’s check-in',`${tag(row?'Saved':'Not yet saved')}<div class="reading-grid compact">${measurements.map(([k,m])=>`<div class="reading"><small class="muted">${m.label}</small><b>${esc(row[k])} <small>${m.unit}</small></b></div>`).join('')}</div>${!row?empty('Enter today’s sleep, wellbeing and measurements.'):''}<p class="compact"><a class="btn ${row?'ghost':'primary'}" href="#checkin">${row?'View today':'Start check-in'}</a></p>`)}${card('Today’s tasks',`<div class="stack"><a class="row-item" href="#checkin">${icon('checkin')}<span class="grow">Daily check-in</span>${tag(row?'Done':'Open')}</a><a class="row-item" href="#fitness">${icon('workout')}<span class="grow">Training session</span>${tag(data.workouts?.workouts?.some(w=>w.missionDay===clock.missionDay)?'Saved':'Open')}</a><a class="row-item" href="#medbay">${icon('pill')}<span class="grow">${grants.filter(g=>g.dueNow).length} course(s) due · ${doses.filter(d=>d.helped==null).length} follow-up(s)</span></a><a class="row-item" href="#habitat">${icon('habitat')}<span class="grow">Cabin readings and recovered alerts</span></a></div>`)} </div>`;
}
function symptomForm() {
 return `${bodyFrame('report')}<div class="select-chips">${Object.entries({head:'Head',eyes:'Eyes',neck:'Neck',chest:'Chest',arms:'Arms',back:'Back',stomach:'Stomach',legs:'Legs'}).map(([k,l])=>btn(l,'area',`data-id="${k}" aria-pressed="${selectedArea===k}"`,'ghost sm')).join('')}</div><p id="area-label" class="subtle">${selectedArea?`Selected body area: ${esc(selectedArea)}`:'Select an area on the body, or choose a symptom below.'}</p><form id="symptom-form">${select('Symptom','code',SYMPTOMS.map(s=>[s.code,`${s.label}${s.redFlag?' · urgent':''}`]))}${field('Severity (1–10)','severity',{type:'number',value:5,attrs:'min="1" max="10" step="1"',required:true})}<div class="btn-row">${btn('Add symptom','add-symptom','','ghost')}</div><div class="symptom-list">${stagedSymptoms.map((s,i)=>`<div class="status-line">${tag(`${SYMPTOMS.find(x=>x.code===s.code)?.label} · ${s.severity}/10`)}${btn('Remove','remove-symptom',`data-id="${i}"`,'ghost sm')}</div>`).join('')}</div>${note('Symptom notes (visible to clinical staff)')}${submit('Submit symptom report')}</form><p class="subtle">If no symptoms are added, Submit uses the selected symptom. A body area helps describe the report; it does not diagnose a condition.</p>`;
}
function suggestionsPanel() {
 if(!suggestion) return '';
 return card(suggestion.redFlag?'Contact the medical officer now':'Medicine guidance',`${(Array.isArray(suggestion.advice)?suggestion.advice:[suggestion.advice]).filter(Boolean).map(a=>`<p>${esc(a)}</p>`).join('')}${suggestion.suggestions?.map(s=>`<div class="row-item"><span class="grow"><b>${esc(s.name)}</b><small>${esc(s.why)} · ${esc(s.approval)}</small></span><a class="btn ghost sm" href="#medbay">Open med bay</a></div>`).join('')}${suggestion.blocked?.map(b=>`<p>${tag('Blocked',true)} ${esc(b.name)} · ${esc(b.why)}</p>`).join('')}`);
}
function checkinScreen() {
 return `<div class="checkin-grid"><div class="stack">${card('How are you today?',`<p class="subtle">Sleep is hours in the last 24 hours. Mood: higher is better. Stress and fatigue: higher means more. Leave unavailable measurements blank.</p>${data.today?.checkedInToday?`${tag('Already saved today')}<p class="subtle">One check-in per mission day. Your submitted values are shown below.</p>`:''}<form id="checkin-form"><fieldset ${data.today?.checkedInToday?'disabled':''} style="border:0;padding:0;margin:0"><div class="form-grid">${checkInFields()}</div>${!data.today?.checkedInToday?submit('Save today’s check-in'):''}</fieldset></form>`)}${card('Measurement instructions',guides.map(g=>`<details><summary>${esc(g.title)}</summary><ol>${g.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></details>`).join(''))}${suggestionsPanel()}</div>${card('Report a symptom',symptomForm())}</div>`;
}
function collectionPanel() {
 if(!collection) return '';
 return card('Dispenser collection',`<p>${tag(collection.status)} · ${esc(collection.source)} · ${time(collection.openedAt)}</p><p class="subtle">All eligible compartments open in one batch. Confirm each dispensed item once. This simulates the cabinet; it does not confirm ingestion.</p>${collection.compartments.map(c=>`<div class="row-item"><span class="grow"><b>${esc(binName(c.itemId))} × ${c.units}</b><small>${esc(compartmentLabel(c.compartmentId))}</small></span>${c.scanned?tag('Collected'):btn('Confirm dispensed','scan-item',`data-id="${esc(c.compartmentId)}"`,'primary sm')}</div>`).join('')}${collection.status==='open'?btn('Cancel remaining items','cancel-collection','','ghost sm'):''}`);
}
function profilePanel() {
 const p=data.profile?.profile;
 return card('Allergies and conditions',`${p?.conditions?.length?`<p>${p.conditions.map(esc).join(', ')}</p>`:''}${p?.allergies?.map(a=>`<p>${tag(a.status,a.status!=='removed')} ${esc(a.substance)} ${a.note?`· ${esc(a.note)}`:''}</p>`).join('')||empty('No allergies recorded.')}<form id="allergy-form">${field('Allergy substance (for example NSAID)','substance',{required:true})}${role()==='medical_officer'?select('Status','status',[['suspected','Suspected'],['confirmed','Confirmed'],['removed','Removed']]):''}${note('Allergy note')}${submit(role()==='crew'?'Add suspected allergy':'Save allergy update')}</form>`);
}
function grantsPanel() {
 const grants=data.grants?.grants??[];
 return card('Prescription courses',grants.map(g=>`<div class="report-card"><div class="status-line"><b>${esc(member(g.crewId))}</b>${tag(g.status)}${g.dueNow?tag('Dose due'):''}</div>${g.items.map(i=>`<p>${esc(i.name)} · ${i.units} unit(s), ${i.perDay}/day for ${i.days} day(s)<br><small class="muted">${esc(i.status)}${i.nextDue?` · next ${time(i.nextDue)}`:''}</small></p>`).join('')}<small class="muted">Course ends ${time(g.end)}</small>${role()==='crew'?`<p>${btn('Collect due items','collect-grant',`data-id="${g.id}"`,'primary sm')}</p>`:''}<details><summary>Credential</summary><code>${esc(g.code)}</code>${qrFor(g.code)}<p class="subtle">The same credential can be reused when the next dose is due. QR and typed code use the same backend.</p></details></div>`).join('')||empty('No prescription courses.'));
}
function lockersPanel() {
 return card('Connected cabinet',`<p class="subtle">Inventory and locks come from the meds API. Quantities below are usable stock; the server rechecks each collection.</p>${(data.lockers?.lockers??[]).map(l=>`<details><summary>${esc(l.name)}</summary>${l.shelves.map(s=>`<h4>${esc(s.id)} · ${esc(s.zone??'')}</h4><div class="locker-bins">${s.bins.map(b=>`<div class="locker-bin"><b>${esc(b.label)}</b><small>${esc(compartmentLabel(b.compartmentId))} · ${esc(b.tier)} · ${b.units} unit(s)</small><span class="subtle">${esc(b.why??(b.open?'Open for collection':'Available under self-care rules'))}</span>${role()==='crew'&&b.tier!=='emergency'?`<form id="item-${b.itemId}" data-item="${b.itemId}">${!b.locked?field('Quantity','units',{type:'number',value:1,attrs:'min="1" max="9" step="1"',required:true}):note('Request note')}<button class="btn ghost sm" type="submit" name="intent" value="${b.locked?'request':'collect'}">${b.locked?'Request approval':'Collect'}</button></form>`:''}</div>`).join('')}</div>`).join('')}</details>`).join('')}`);
}
function dosesPanel() {
 const doses=data.doses?.doses??[];
 return card('Collected doses and follow-up',doses.map(d=>`<div class="row-item"><span class="grow"><b>${esc(d.name)} × ${d.units}</b><small>${role()==='crew'?'':`${esc(member(d.crewId))} · `}${time(d.collectedAt)} · ${esc(d.source)}</small>${d.helped==null?'':`<small>Follow-up: ${d.helped?'helped':'did not help'}</small>`}</span>${role()==='crew'&&d.helped==null?`<div class="btn-row">${btn('Helped','follow-up',`data-id="${d.id}" data-value="true"`,'ghost sm')}${btn('Did not help','follow-up',`data-id="${d.id}" data-value="false"`,'ghost sm')}</div>`:''}</div>`).join('')||empty('No collected doses in this period.'));
}
function requestsPanel() {
 const requests=data.requests?.requests??[];
 return card(role()==='crew'?'Approval requests':'Approvals',requests.map(r=>`<div class="request-form"><div class="status-line"><b>${esc(r.name)}</b>${tag(r.status)}</div><p>${esc(member(r.crewId))} · ${time(r.createdAt)}${r.note?`<br>${esc(r.note)}`:''}</p>${r.decisionNote?`<p>${esc(r.decisionNote)}</p>`:''}${role()!=='crew'&&r.status===`waiting_${role()}`?`<form id="decision-${r.id}" data-request="${r.id}"><div class="form-grid">${field('Units per dose','units',{type:'number',value:1,attrs:'min="1" max="9"',required:true})}${field('Doses per day','perDay',{type:'number',value:1,attrs:'min="1" max="6"',required:true})}${field('Days','days',{type:'number',value:1,attrs:'min="1" max="30"',required:true})}</div>${note('Clinical decision note')}<div class="btn-row"><button class="btn primary" name="decision" value="approve">Approve course</button><button class="btn ghost" name="decision" value="deny">Deny</button></div></form>`:''}</div>`).join('')||empty('No requests waiting here.'));
}
function emergencyPanel() {
 const list=data.emergencies?.emergencies??[];
 if(role()==='crew') return card('Emergency access',`<p class="subtle">Any crew member may raise an emergency for a crewmate. Only emergency-tier medicines are released; the medical officer must complete the paperwork.</p><form id="emergency-form">${crewSelect('patientId')}${field('Emergency reason','reason',{required:true,attrs:'maxlength="2000"'})}${submit('Raise emergency')}</form>${list.map(e=>`<div class="report-card"><b>${esc(member(e.patientId))}</b>${allBins().filter(b=>b.tier==='emergency').map(b=>`<form id="emergency-item-${e.id}-${b.itemId}" data-emergency="${e.id}" data-item="${b.itemId}"><p>${esc(b.label)}</p>${field('Units','units',{type:'number',value:1,attrs:'min="1" max="9"',required:true})}<label class="checkline"><input type="checkbox" name="overrideAllergy"> Give despite an allergy only if there is no other option; log the override.</label>${submit('Release emergency item')}</form>`).join('')}</div>`).join('')}`);
 return card('Emergency paperwork',list.map(e=>`<form id="paperwork-${e.id}" data-emergency="${e.id}"><b>${esc(member(e.patientId))}</b><p>${esc(e.reason)} · due ${time(e.paperworkDueAt)}</p>${(e.released??[]).map(r=>`<p>${esc(r.name)} × ${r.units} · ${time(r.at)}</p>`).join('')}${note('Paperwork / resolution note')}${submit('Close emergency')}</form>`).join('')||empty('No open emergency.'));
}
function importPanel() {
 return card('Use prescription credential',`<p class="subtle">Paste a typed code or the exact decoded contents of a QR. Both go through the same import and dose checks. There is no 15-minute expiry.</p><form id="import-form">${field('QR contents or prescription code','code',{required:true,attrs:'autocomplete="off"'})}${submit('Use credential')}</form>${btn('Scan QR with camera','qr-camera','','ghost compact')}${btn('Stop camera','qr-stop','','ghost compact')}<video id="qr-video" hidden playsinline style="width:100%;max-height:200px"></video><p id="qr-status" class="subtle"></p>`);
}
function medbayScreen() {
 if(role()==='earth') return `<div class="stack">${requestsPanel()}<a class="btn ghost" href="#earth">Open Earth reports and code generator</a></div>`;
 return `${role()==='medical_officer'?patientPicker():''}<div class="med-grid"><div class="stack">${role()==='crew'?importPanel():''}${collectionPanel()}${suggestionsPanel()}${grantsPanel()}${requestsPanel()}${dosesPanel()}</div><div class="stack">${profilePanel()}${lockersPanel()}${emergencyPanel()}${role()==='medical_officer'?stockPanel():''}</div></div>`;
}
function stockPanel() { return card('Stock watch',table(['Medicine','Usable / reserve','Next expiry'],(data.stock?.items??[]).map(i=>tr([esc(i.name),`${i.units} / ${i.reserve} ${i.belowReserve?tag('Below reserve',true):''}`,esc(i.nextExpiry)])))); }
function mindScreen() {
 return `<div class="mind-grid"><div class="card companion-chat-card">
  <div class="chat-head"><span class="mascot-md">${mascotSvg()}</span><span class="grow"><h3>Talk to your companion</h3><span class="faint small">It listens and helps you find support, any time.</span></span>${tag('Offline')}</div>
  <div class="thread mind-thread" data-chat-thread aria-live="polite" aria-relevant="additions text">${chatTranscript()}</div>
  <div class="support-topics" aria-label="Conversation starters">${btn('Sleep & energy','support-prompt','data-topic="sleep"','ghost sm')}${btn('Stress & mood','support-prompt','data-topic="stress"','ghost sm')}${btn('Missing home','support-prompt','data-topic="home"','ghost sm')}</div>
  ${chatComposer('mind-chat-form','Type a message')}
  <p class="subtle context-note">Offline support demo · uses your latest check-in and synthetic mission history. You can talk here or ask for your mission behavioral health provider.</p>
 </div><div class="stack">${card('Private journal',`<p class="subtle">Only you can read these entries in the current demo. Medical officer and Earth sessions are denied.</p><form id="journal-form">${note('What is on your mind?','text',5000)}${submit('Save private entry')}</form>${(data.journal?.entries??[]).map(e=>`<div class="report-card"><small class="muted">${time(e.recordedAt)}</small><p class="saved-entry">${esc(e.text)}</p></div>`).join('')}`)}${card('Your psychologist on Earth',`<p class="muted">Private support through the mission behavioral health channel.</p><p class="subtle">Psychologist messaging is not connected in this demo.</p>`)}</div></div>`;
}
function chart(history) {
 const points=history?.points??[], actual=points.filter(p=>p[1]!=null); if(actual.length<2) return empty('Not enough readings for this graph.');
 const values=actual.map(p=>p[1]), lo=Math.min(...values), hi=Math.max(...values), span=hi-lo||1;
 const start=Date.parse(points[0][0]), end=Date.parse(points.at(-1)[0]), x=t=>50+(Date.parse(t)-start)/(end-start||1)*600, y=v=>160-(v-lo)/span*125;
 let pen=false,d=''; for(const [t,v] of points) {if(v==null){pen=false;continue;}d+=`${pen?'L':'M'}${x(t).toFixed(1)},${y(v).toFixed(1)} `;pen=true;}
 return `<svg class="chart-live" viewBox="0 0 680 200" role="img" aria-label="${esc(history.metric)} historical replay"><line x1="50" y1="165" x2="650" y2="165"/><path d="${d}"/><text x="0" y="40">${hi.toFixed(1)}</text><text x="0" y="163">${lo.toFixed(1)}</text><text x="50" y="190">${points[0][0].slice(11,16)}</text><text x="560" y="190">${points.at(-1)[0].slice(11,16)} UTC</text></svg>`;
}
function habitatScreen() {
 return `<div class="metric-grid">${(data.env?.readings??[]).map(r=>card(esc(r.metric),`<div class="metric-val">${r.value==null?'—':Number(r.value).toFixed(r.metric==='co2'?0:1)}<small>${esc(r.unit)}</small></div>${tag(r.state,['warning','danger'].includes(r.state))}<p class="subtle">${esc(r.source.label)}<br>Historical replay · source ${esc(r.source.sourceTime)}<br>Measured ${time(r.measuredAt)}</p>`)).join('')}</div><div class="habitat-grid"><div class="stack">${Object.values(data.histories??{}).map(h=>card(`${esc(h.metric)} · last 24 mission hours`,`${chart(h)}<p class="subtle">${esc(h.source.label)} · gaps remain empty</p>`)).join('')}</div>${card('Cabin alert history',`<p class="subtle">Potest’s two-consecutive-reading rules and illustrative thresholds. These are replayed environmental events.</p>${(data.alerts?.alerts??[]).map(a=>`<div class="report-card"><b>${esc(a.metric)}</b> ${tag(a.level,!a.recoveredAt)}<p>Opened ${time(a.openedAt)}<br>${a.recoveredAt?`Recovered ${time(a.recoveredAt)}`:'Recovery not confirmed'}<br>Observed peak ${Number(a.peak).toFixed(1)} · peak state ${esc(a.peakLevel??a.level)}</p></div>`).join('')||empty('No alert transitions in this period.')}`)}</div>`;
}
async function ensureWorkout() {
 if(!clock||role()!=='crew') return;
 if(workout && workoutDay!==clock.missionDay) {
  const s=workout.snapshot(clock.now);
  if(s.status==='active'||['pending','failed','saving'].includes(s.saveStatus)) return;
  workout=null;
 }
 if(!workout) {workout=createWorkoutController({missionDay:clock.missionDay,...(workoutMode==='stage'?{stage:true,replay}:{}),submitWorkout:health.submitWorkout});workoutDay=clock.missionDay;}
}
function fitnessScreen() {
 const s=workout?.snapshot(clock.now); if(!s) return empty('Loading training program.');
 const step=s.currentStep;
 return `<div class="fit-grid"><div class="stack">${card(esc(s.day.label),`<div class="toolbar"><label>Program <select class="input" id="workout-mode" ${s.status==='active'||['pending','failed','saving'].includes(s.saveStatus)?'disabled':''}><option value="weekly" ${workoutMode==='weekly'?'selected':''}>Weekly Mars transit plan</option><option value="stage" ${workoutMode==='stage'?'selected':''}>Stage demonstration · synthetic pulse</option></select></label></div><p class="subtle">${workoutMode==='stage'?'Petros’s synthetic 90-second exercise trace and one-minute recovery. Use the mission-clock controls below to run it quickly.':'Petros’s compact flywheel program. No wearable is paired: the checklist works, but a pulse summary cannot be saved without exercise readings. Use the stage demonstration to test the complete recording flow.'}</p>${s.day.sessions.map(session=>`<details open><summary>${esc(session.label)}</summary>${session.preparation?`<p>${esc(session.preparation)}</p>`:''}${session.recommendedMinutesAfterResistance?`<p class="subtle">Schedule 4–6 hours after resistance.</p>`:''}<ol>${session.steps.map(st=>`<li><b>${esc(st.label)}</b> · ${st.sets?`${st.sets} × ${st.repsPerSet}`:st.durationSeconds?(st.durationSeconds<60?`${st.durationSeconds} sec`:`${Math.round(st.durationSeconds/60*10)/10} min`):''}<p class="subtle">${esc(st.equipment)} · ${esc(st.instruction)}</p></li>`).join('')}</ol>${['ready','completed','stopped'].includes(s.status)&&!['pending','failed','saving'].includes(s.saveStatus)&&!s.outcomes.some(o=>o.sessionId===session.id)?btn('Start session','workout-start',`data-id="${session.id}"`,'primary'):''}</details>`).join('')||empty('Rest day.')}`)}${card('Saved workout summaries',(data.workouts?.workouts??[]).map(w=>`<div class="report-card"><b>${esc(w.kind)}</b><p>${time(w.startedAt)} → ${time(w.endedAt)}<br>${w.reps} total reps · average ${w.avgHeartRateBpm} bpm · peak ${w.peakHeartRateBpm} bpm${w.recoveryHeartRateBpm!=null?` · recovery ${w.recoveryHeartRateBpm} bpm`:''}</p><small class="muted">${esc(w.heartRateSource)}</small></div>`).join('')||empty('No saved workouts.'))}</div><div class="stack">${card('Current session',`<div id="workout-live">${workoutLive(s)}</div>${step?`<h3>${esc(step.label)}</h3><p>${esc(step.instruction)}</p><form id="workout-step" data-step="${step.id}">${step.kind==='resistance'?field('Actual total repetitions','reps',{type:'number',value:step.sets?step.sets*step.repsPerSet:25,attrs:'min="0" max="1000000" step="1"',required:true}):''}${submit('Mark this exercise done')}</form>${btn('Stop early','workout-stop','','ghost compact')}`:''}${['pending','failed'].includes(s.saveStatus)?`<p class="subtle">Save now, or wait one mission minute for the recovery reading.</p><div class="btn-row">${btn('Save summary now','workout-save','','primary')}${btn('Save with 1-min recovery','workout-recovery','','ghost')}${btn('Dismiss unsaved session','workout-skip','','ghost')}</div>`:''}`)}${demoClockPanel()}</div></div>`;
}
function workoutLive(s) { return missionViews.workoutReadout(s); }
function demoClockPanel() {
 return card('Demo mission clock',`<p class="subtle">Shared by all sessions. Advancing time changes dose eligibility, training timers and Earth delivery.</p><div class="btn-row">${[1,12,720].map(m=>btn(`+${m===720?'12 h':`${m} min`}`,'advance',`data-minutes="${m}"`,'ghost sm')).join('')}</div><details class="compact"><summary>Reset demo data</summary><p class="subtle">This clears all local demo check-ins, medicines, journal entries, reports and workout records, for all five crew members.</p>${btn('Reset all demo data','reset-demo','','ghost sm')}</details>`);
}
function patientPicker() { return `<label class="field patient-select"><span>Patient</span><select class="input" id="patient-select">${CREW.map(c=>`<option value="${c.id}" ${patient===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`; }
function clinicalPanel() {
 const daily=data.daily, weekly=data.weekly;
 if(!daily) return empty('Select a patient.');
 return card('Clinical review',`<p>${esc(daily.message)}</p>${table(['Measure','Today','Fixed reference','Change / streak'],daily.measures.map(m=>tr([esc(MEASUREMENTS[m.measure]?.label??m.measure),esc(m.today??'Missing'),esc(m.normal??'Unavailable'),m.changed?`${tag(m.direction,true)} · ${m.daysInARow} day(s)`:'—'])))}<details class="compact" open><summary>Recent clinical history</summary>${table(['Day','Sleep h','Resting bpm','Mood','Stress','Fatigue'],(data.history?.checkIns??[]).map(r=>tr([r.missionDay,...['sleepHours','restingHeartRateBpm','mood','stress','fatigue'].map(k=>esc(r[k]??'Missing'))])))}</details><details class="compact"><summary>Weekly description · ${esc(weekly?.completeness)}</summary>${table(['Measure','Current median / valid days','Previous median / valid days'],(weekly?.measures??[]).map(m=>tr([esc(m.measure),`${esc(m.current.median??'—')} / ${m.current.validDays}`,`${esc(m.previous.median??'—')} / ${m.previous.validDays}`])))}</details><p class="subtle">Synthetic demonstration records · ${esc(daily.limitations?.join(' ')??'')}</p>`);
}
function symptomHistoryPanel() { return card('Symptoms reported',(data.symptoms?.reports??[]).map(r=>`<div class="report-card"><b>${time(r.reportedAt)}</b>${r.redFlag?tag('Urgent',true):''}<p>${r.symptoms.map(s=>`${esc(SYMPTOMS.find(x=>x.code===s.code)?.label??s.code)} · ${s.severity}/10`).join('<br>')}</p><p>${esc(r.note)}</p></div>`).join('')||empty('No symptom reports.')); }
function reportContents(r) {
 return `<details><summary>Clinical report content</summary><p>${esc(r.note)}</p>${table(['Measure','Today','Reference','Streak'],(r.health?.daily?.measures??[]).map(m=>tr([esc(m.measure),esc(m.today??'Missing'),esc(m.normal??'—'),m.daysInARow])))}<p><b>Reported symptoms:</b> ${(r.meds?.reports??[]).flatMap(x=>x.symptoms).map(s=>`${esc(s.code)} ${s.severity}/10`).join(', ')||'None'}</p><p><b>Allergies:</b> ${(r.meds?.profile?.allergies??[]).map(a=>`${esc(a.substance)} (${esc(a.status)})`).join(', ')||'None'}</p><p><b>Cabin at snapshot:</b> ${(r.environment?.readings??[]).map(x=>`${esc(x.metric)} ${esc(x.value??'unavailable')} ${esc(x.unit)} (${esc(x.state)})`).join('; ')}</p><p><b>Recent cabin alerts:</b> ${(r.environment?.alerts??[]).map(a=>`${esc(a.metric)} · peak ${esc(a.peakLevel??a.level)} · opened ${time(a.openedAt)} · recovered ${time(a.recoveredAt)}`).join('<br>')||'None'}</p><details><summary>Full clinical snapshot (JSON)</summary><pre>${esc(JSON.stringify({health:r.health,meds:r.meds,environment:r.environment},null,2))}</pre></details></details>`;
}
function reportsPanel() {
 return card('Clinical reports · simulated Earth link',`${role()==='medical_officer'?`<form id="report-form">${note('Reason for specialist review')}${submit('Create and send patient report')}</form>`:''}<p class="subtle">Medical officer creates reports. Crew cannot read their content. No journal data is included. ${data.link?.delayMinutes??12} mission minutes each way.</p><div class="toolbar">${tag(data.link?.linkUp?'Link up':'Link down',!data.link?.linkUp)}${btn(data.link?.linkUp?'Take link down':'Restore link','toggle-link','','ghost sm')}${btn('+12 mission min','advance','data-minutes="12"','ghost sm')}</div>${(data.reports?.reports??[]).map(r=>`<div class="report-card"><b>${esc(member(r.crewId))}</b> ${tag(r.status)}<p class="subtle">Created ${time(r.createdAt)}${r.arrivesAt?` · arrival ${time(r.arrivesAt)}`:''}</p>${reportContents(r)}${r.replies.map(reply=>`<div class="chat-msg"><b>Earth reply · ${esc(reply.status)}</b><p>${esc(reply.note)}</p>${reply.code?`<label class="field"><span>Prescription credential for ${esc(member(r.crewId))}</span><textarea class="input" rows="3" readonly>${esc(reply.code)}</textarea></label>${qrFor(reply.code)}<p class="subtle">Give the credential to the patient to enter or scan in Med bay. The same credential is valid for later scheduled doses.</p>`:''}</div>`).join('')}${role()==='earth'?`<form id="reply-${r.id}" data-report="${r.id}">${note('Specialist reply')}${field('Prescription code (optional)','code',{value:generatedCode})}${submit('Send reply to medical officer')}</form>`:''}</div>`).join('')||empty(role()==='earth'?'No reports have arrived at Earth.':'No reports created.')}`);
}
function medicalScreen() { return `${patientPicker()}<div class="two"><div class="stack">${clinicalPanel()}${symptomHistoryPanel()}${dosesPanel()}${profilePanel()}</div><div class="stack">${reportsPanel()}${requestsPanel()}${emergencyPanel()}${stockPanel()}${demoClockPanel()}</div></div>`; }
function earthScreen() {
 const catalogue=data.catalogue??[];
 return `<div class="two"><div class="stack">${reportsPanel()}${requestsPanel()}</div><div class="stack">${card('Generate a demo prescription credential',`<p class="subtle">Uses dadis2’s original RX2 encoder. Code contents and QR payload are identical. Patient, allergy, stock and due-dose checks run when it is used on board. This code is a simulation, not a signed medical prescription.</p><form id="earth-code-form">${crewSelect('crewId','c4')}${[0,1].map(i=>`<details ${i===0?'open':''}><summary>Medicine ${i+1}${i===1?' (optional)':''}</summary>${select('Medicine',`item${i}`,[['','Choose medicine'],...catalogue.map(x=>[x.itemId,x.label])])}<div class="form-grid">${field('Units per dose',`units${i}`,{type:'number',value:1,attrs:'min="1" max="9"'})}${field('Doses per day',`perDay${i}`,{type:'number',value:1,attrs:'min="1" max="6"'})}${field('Course days',`days${i}`,{type:'number',value:3,attrs:'min="1" max="30"'})}</div></details>`).join('')}${submit('Generate credential')}</form>${generatedCode?`<label class="field compact"><span>Code / exact QR payload</span><textarea class="input" readonly rows="4">${esc(generatedCode)}</textarea></label><p class="subtle">Copy to a specialist reply or enter in the patient’s Med bay.</p>${qrFor(generatedCode)}`:''}`)}${demoClockPanel()}</div></div>`;
}
const screens={login:loginScreen,home:homeScreen,checkin:checkinScreen,medbay:medbayScreen,mind:mindScreen,habitat:habitatScreen,fitness:fitnessScreen,crew:medicalScreen,earth:earthScreen};
const missionViews=createMissionViews({
 state:()=>({user,role:role(),clock,data,page,drafts,collection,suggestion,workout,workoutMode,replay,guides,selectedArea,stagedSymptoms,CREW,SYMPTOMS,MEASUREMENTS}),
 helpers:{esc,icon,btn,field,select,note,submit,card,empty,bodyFrame,mascotSvg,time,member,chatTranscript,chatComposer},
 legacy:{suggestionsPanel,profilePanel,grantsPanel,requestsPanel,dosesPanel,emergencyPanel,stockPanel,patientPicker,demoClockPanel},
 redraw:()=>render(),remember,
});
Object.assign(screens,missionViews.screens);
function render() {
 const detailKeys = elements => {
  const counts=new Map();
  return elements.map(d=>{const label=d.querySelector(':scope > summary')?.textContent.trim()??'';const n=counts.get(label)??0;counts.set(label,n+1);return [`${label}:${n}`,d];});
 };
 const expanded = new Map(detailKeys(Array.from(document.querySelectorAll(`#${page} details`))).map(([key,d])=>[key,d.open]));
 document.querySelectorAll('.screen').forEach(s=>{s.hidden=s.id!==page; if(s.hidden)s.replaceChildren();});
 $(`#${page}`).innerHTML=screens[page]();
 for(const [key,d] of detailKeys(Array.from(document.querySelectorAll(`#${page} details`))))if(expanded.has(key))d.open=expanded.get(key);
 renderChrome(); restoreDrafts();
}
async function show() {
 const task=++loading, version=revision;
 page=!user?'login':(location.hash.slice(1)|| (role()==='medical_officer'?'crew':role()==='earth'?'earth':'home'));
 if(!screens[page] || (role()!=='crew'&&['home','checkin','fitness','mind'].includes(page)) || (role()==='crew'&&['crew','earth'].includes(page)) || (role()==='earth'&&page==='crew') || (role()==='medical_officer'&&page==='earth')) page=role()==='crew'?'home':role()==='earth'?'earth':user?'crew':'login';
 if(!user) {render();return;}
 const get=path=>api(path);
 const jobs={ clock:get('/clock') };
 if(role()!=='earth') jobs.emergencies=get('/meds/emergencies?status=open');
 if(role()==='crew') {
  if(['home','checkin','fitness'].includes(page)) {jobs.today=health.getToday();jobs.symptoms=get('/meds/symptom-reports');}
  if(['home','fitness'].includes(page)) jobs.workouts=health.getWorkouts();
  if(['home','medbay'].includes(page)) {jobs.doses=get('/meds/doses');jobs.grants=get('/meds/grants');}
  if(page==='medbay') {jobs.profile=get('/meds/profile');jobs.lockers=get('/meds/lockers');jobs.requests=get('/meds/requests');}
  if(page==='mind') jobs.journal=get('/mind/journal');
 }
 if(page==='habitat') {jobs.env=get('/env/now');jobs.alerts=get('/env/alerts'); jobs.histories=Promise.all(['co2','temperature','humidity','radiation'].map(async m=>[m,await get(`/env/history?metric=${m}`)])).then(Object.fromEntries);}
 if(role()==='medical_officer'&&['crew','medbay'].includes(page)) {
  const q=personQuery();jobs.daily=health.getDaily({crewId:patient});jobs.history=health.getHistory({crewId:patient});jobs.weekly=health.getWeekly({crewId:patient});jobs.workouts=health.getWorkouts({crewId:patient});
  jobs.symptoms=get(`/meds/symptom-reports${q}`);jobs.profile=get(`/meds/profile${q}`);jobs.doses=get(`/meds/doses${q}`);jobs.grants=get(`/meds/grants${q}`);jobs.lockers=get(`/meds/lockers${q}`);jobs.requests=get('/meds/requests');jobs.stock=get('/meds/stock');
 }
 if(role()==='earth') jobs.requests=get('/meds/requests');
 if((role()==='medical_officer'&&page==='crew')||(role()==='earth'&&page==='earth')) {jobs.reports=get('/reports');jobs.link=get('/reports/link');}
 // Earth never receives personal locker/profile endpoints. Catalogue is read-only demo metadata.
 if(role()==='earth'&&page==='earth') jobs.catalogue=get('/reports/catalogue').then(r=>r.items);
 const results=await Promise.allSettled(Object.values(jobs));
 if(task!==loading||version!==revision)return;
 const next={}, errors=[];
 Object.keys(jobs).forEach((k,i)=>{if(results[i].status==='fulfilled') next[k]=results[i].value;else errors.push(results[i].reason);});
 data=next; clock=data.clock??clock; await ensureWorkout();
 if(task!==loading||version!==revision)return;
 render();
 if(errors.length) notice(errors.map(e=>e.message).join(' '),true);
}
async function collect(body) {
 collection=(await api('/meds/collections',{method:'POST',body})).collection;
 notice('Collection opened. Confirm each dispensed item once.'); await show();
}
function formObject(form) { return Object.fromEntries(new FormData(form)); }
function numberFields(values,keys) { const out={};for(const k of keys)if(values[k]!==undefined&&values[k]!=='')out[k]=Number(values[k]);return out; }
function addSymptom() {
 const form=$('#symptom-form'); if(!form.reportValidity())return;
 const s=formObject(form), severity=Number(s.severity);
 if(!Number.isInteger(severity)||severity<1||severity>10) throw new Error('Severity must be a whole number from 1 to 10.');
 const old=stagedSymptoms.findIndex(x=>x.code===s.code);
 if(old>=0)stagedSymptoms[old]={code:s.code,severity};else stagedSymptoms.push({code:s.code,severity});
 remember(form); render();
}
async function handleForm(form,submitter) {
 const v=formObject(form), id=form.id;
 if(id==='checkin-form') {
  const values=numberFields(v,[...Object.keys(MEASUREMENTS),'mood','stress','fatigue']);
  await health.submitCheckIn(values);delete drafts[id];notice('Today’s check-in was saved to the health module.');
 } else if(id==='symptom-form') {
  const symptoms=stagedSymptoms.length?[...stagedSymptoms]:[{code:v.code,severity:Number(v.severity)}];
  suggestion=await api('/meds/symptom-reports',{method:'POST',body:{symptoms,note:[selectedArea?`Body area: ${POINT_BY_ID[selectedArea]?.area??selectedArea}. ${POINT_BY_ID[selectedArea]?`Point: ${selectedArea}. Location: ${POINT_BY_ID[selectedArea].label} (${POINT_BY_ID[selectedArea].view}).`:''}`:'',v.note].filter(Boolean).join(' ')}});
  stagedSymptoms=[]; delete drafts[id]; notice(suggestion.redFlag?'Urgent symptoms: contact the medical officer now.':'Symptom report saved. Medicine guidance is shown below.',suggestion.redFlag);
 } else if(id==='import-form') {
  const result=await api('/meds/grants/import',{method:'POST',body:{code:v.code.trim()}});
  notice(result.alreadyImported?'Existing course found. Its dose schedule is unchanged.':'Prescription credential imported.');
  delete drafts[id];
  try { collection=(await api('/meds/collections',{method:'POST',body:{grantId:result.grant.id}})).collection; }
  catch(e) { notice(`Course found. ${e.message}`); }
 } else if(id==='allergy-form') {
  await api('/meds/allergies',{method:'POST',body:{substance:v.substance,status:v.status??'suspected',note:v.note, ...(role()==='medical_officer'?{crewId:patient}:{})}});
  delete drafts[id]; notice('Allergy profile updated.');
 } else if(id==='journal-form') {
  await api('/mind/journal',{method:'POST',body:{text:v.text}});delete drafts[id];notice('Private entry saved.');
 } else if(id==='chat-form'||id==='mind-chat-form') {
  const version=revision;
  const response=await companion.send(v.message);
  if(version!==revision)return;
  chat.push({mine:true,text:v.message},{mine:false,text:response.reply});delete drafts[id];form.elements.message.value='';
  renderCompanion();refreshChatViews();return;
 } else if(form.hasAttribute('data-cabinet-emergency')) {
  if(role()!=='crew'||!missionViews.emergencyEnabled())throw new Error('Enable Emergency above first.');
  const reason=(v.reason??'').trim();
  if(!reason||reason.length>500)throw new Error('Enter an emergency reason, up to 500 characters.');
  // Compose the existing incident and collection APIs. The server owns eligibility, defaults and logging.
  const result=await api('/meds/emergencies',{method:'POST',body:{patientId:v.patientId,reason}});
  await collect({emergencyId:result.emergency.id,itemId:form.dataset.item,overrideAllergy:form.elements.overrideAllergy.checked});
  delete drafts[id];
  if(result.alreadyOpen)notice('Ready to collect. The open emergency keeps its original reason.');
  return;
 } else if(id==='emergency-form') {
  await api('/meds/emergencies',{method:'POST',body:{patientId:v.patientId,reason:v.reason}});
  delete drafts[id];notice('Emergency raised. Emergency-only releases are available below.',true);
 } else if(form.dataset.emergency&&form.dataset.item) {
  await collect({emergencyId:form.dataset.emergency,itemId:form.dataset.item,units:Number(v.units),overrideAllergy:form.elements.overrideAllergy.checked}); return;
 } else if(id.startsWith('paperwork-')) {
  await api(`/meds/emergencies/${form.dataset.emergency}/paperwork`,{method:'POST',body:{note:v.note}});delete drafts[id];notice('Emergency paperwork closed.');
 } else if(form.dataset.request) {
  await api(`/meds/requests/${form.dataset.request}/decision`,{method:'POST',body:{decision:submitter.value,...numberFields(v,['units','perDay','days']),note:v.note}});delete drafts[id];notice('Decision saved by the medicine module.');
 } else if(form.dataset.item) {
  if(submitter.value==='request') {
   await api('/meds/requests',{method:'POST',body:{itemId:form.dataset.item,note:v.note}});notice('Approval request submitted.');
  } else {await collect({itemId:form.dataset.item,units:Number(v.units)});return;}
 } else if(id==='workout-step') {
  clock=await api('/clock');workout.completeStep(form.dataset.step,clock.now,numberFields(v,['reps']));delete drafts[id];
 } else if(id==='report-form') {
  // Refresh every section for this patient; no mind endpoint is requested.
  const reportPatient=patient, q=`?crewId=${encodeURIComponent(reportPatient)}`;
  const [daily,history,weekly,workouts,symptoms,doses,profile,environment]=await Promise.all([
   health.getDaily({crewId:reportPatient}),health.getHistory({crewId:reportPatient}),health.getWeekly({crewId:reportPatient}),health.getWorkouts({crewId:reportPatient}),
   api(`/meds/symptom-reports${q}`),api(`/meds/doses${q}`),api(`/meds/profile${q}`),Promise.all([api('/env/now'),api('/env/alerts?hours=48'),api('/env/history?metric=co2&hours=48')]).then(([now,alerts,history])=>({...now,alerts:alerts.alerts,co2History:history}))]);
  await api('/reports',{method:'POST',body:{crewId:reportPatient,note:v.note,health:{daily,history,weekly,workouts:workouts.workouts},meds:{reports:symptoms.reports,doses:doses.doses,profile:profile.profile},environment}});
  delete drafts[id];notice('Clinical snapshot created. Delivery follows the Earth link and mission clock.');
 } else if(form.dataset.report) {
  await api(`/reports/${form.dataset.report}/replies`,{method:'POST',body:{note:v.note,code:v.code}});delete drafts[id];notice('Specialist reply queued for the return link.');
 } else if(id==='earth-code-form') {
  const items=[0,1].filter(i=>v[`item${i}`]).map(i=>({itemId:v[`item${i}`],units:Number(v[`units${i}`]),perDay:Number(v[`perDay${i}`]),days:Number(v[`days${i}`])}));
  generatedCode=(await api('/reports/grants-code',{method:'POST',body:{crewId:v.crewId,items}})).code;
  notice('Demo credential generated with dadis2’s RX2 format.');
 }
 await show();
}
let cameraStream=null, cameraFrame=null;
function stopCamera() {if(cameraFrame)cancelAnimationFrame(cameraFrame);cameraFrame=null;cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;}
async function scanQr() {
 const status=$('#qr-status');
 if(!('BarcodeDetector' in window)||!navigator.mediaDevices?.getUserMedia) {status.textContent='Camera QR decoding is unavailable in this browser. Paste the decoded QR text into the same credential field.';return;}
 stopCamera();
 const detector=new BarcodeDetector({formats:['qr_code']});
 cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
 const video=$('#qr-video');video.srcObject=cameraStream;video.hidden=false;await video.play();
 status.textContent='Show the prescription QR to the camera.';
 const scan=async()=>{
  if(!cameraStream||!document.contains(video)){stopCamera();return;}
  try {
   const found=await detector.detect(video);
   if(found.length){$('#import-form').elements.code.value=found[0].rawValue;remember($('#import-form'));stopCamera();video.hidden=true;status.textContent='QR read. Press Use credential to apply the same code checks.';return;}
  }catch{status.textContent='Could not decode this frame. Keep the QR steady, or paste its text.';}
  cameraFrame=requestAnimationFrame(scan);
 };cameraFrame=requestAnimationFrame(scan);
}
async function action(el) {
 const a=el.dataset.action,id=el.dataset.id;
 if(a.startsWith('ui-'))return missionViews.action(el);
 if(a==='login')return login(id);
 if(a==='login-medical')return login('c2','medical');
 if(a==='login-earth')return login(null,'earth');
 if(a==='logout')return logout();
 if(a==='refresh')return show();
 if(a==='theme'){const theme=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=theme;localStorage.setItem('ui-look-theme',theme);syncBody();return;}
 if(a==='companion'){companionOpen=!companionOpen;renderCompanion();return;}
 if(a==='support-prompt'){
  const prompts={sleep:'I feel worn down and tired today. Can you help me think through a next step?',stress:'I feel stressed and find it hard to switch off.',home:'I miss talking with my family after dinner.'};
  const form=$('#mind-chat-form');form.elements.message.value=prompts[el.dataset.topic];remember(form);
  return handleForm(form,form.querySelector('button'));
 }
 if(a==='area'){selectedArea=id;missionViews.selectArea(id);syncBody();return;}
 if(a==='add-symptom')return addSymptom();
 if(a==='remove-symptom'){stagedSymptoms.splice(Number(id),1);render();return;}
 if(a==='qr-camera')return scanQr();
 if(a==='qr-stop'){stopCamera();if($('#qr-video'))$('#qr-video').hidden=true;return;}
 if(a==='collect-grant')return collect({grantId:id});
 if(a==='scan-item'){
  collection=(await api(`/meds/collections/${collection.id}/scan`,{method:'POST',body:{compartmentId:id}})).collection;
  notice(collection.status==='complete'?'Collection complete. Doses and stock were updated.':'Dispensed item confirmed.');
 }
 if(a==='cancel-collection')collection=(await api(`/meds/collections/${collection.id}`,{method:'DELETE'})).collection;
 if(a==='follow-up'){await api(`/meds/doses/${id}/follow-up`,{method:'POST',body:{helped:el.dataset.value==='true'}});notice('Dose follow-up saved.');}
 if(a==='advance') {clock=await api('/clock/advance',{method:'POST',body:{minutes:Number(el.dataset.minutes)}});notice('Mission clock advanced for every session.');}
 if(a==='toggle-link'){await api('/reports/link',{method:'POST',body:{linkUp:!data.link.linkUp}});notice('Simulated Earth link updated.');}
 if(a==='reset-demo') {
  if(window.prompt('This clears all demo records for all crew. Type RESET to continue.')!=='RESET')return;
  clock=await api('/demo/reset',{method:'POST',body:{}});resetLocal();notice('All demo modules reset to day 42 at 07:30 UTC.');
 }
 if(a.startsWith('workout-')){
  clock=await api('/clock');
  if(a==='workout-start')workout.start(clock.now,id);
  if(a==='workout-stop')workout.stop(clock.now);
  if(a==='workout-save'||a==='workout-recovery'){
   const s=await workout.save(clock.now,{withRecovery:a==='workout-recovery'});
   notice(s.saveStatus==='unavailable'?'No exercise pulse available: checklist retained, no numeric summary was invented.':'Workout summary saved in the health module.');
  }
  if(a==='workout-skip')workout.skipSave(clock.now);
 }
 await show();
}
async function guarded(fn,button) {
 if(busy)return;
 busy=true;if(button)button.disabled=true;
 try{clearNotice();await fn();}catch(e){notice(e.message,true);}finally{busy=false;if(collection&&role()==='crew')sessionStorage.setItem('pulse-collection',JSON.stringify({token,collection}));if(button&&document.contains(button))button.disabled=false;}
}
document.addEventListener('submit',e=>{e.preventDefault();remember(e.target);void guarded(()=>handleForm(e.target,e.submitter),e.submitter);});
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el){e.preventDefault();void guarded(()=>action(el),el);}});
document.addEventListener('input',e=>{if(e.target.form)remember(e.target.form);if(e.target.name==='severity'){if($('#severity-value'))$('#severity-value').textContent=e.target.value;e.target.style.setProperty('--range-fill',`${(Number(e.target.value)-1)/9*100}%`);}});
document.addEventListener('change',e=>{
 if(e.target.form)remember(e.target.form);
 if(e.target.id==='patient-select'){if(busy){e.target.value=patient;return;}patient=e.target.value;drafts={};void guarded(show);}
 if(e.target.id==='workout-mode'){workoutMode=e.target.value;workout=null;void guarded(async()=>{await ensureWorkout();render();});}
});
window.addEventListener('message',e=>{
 const frame=$('iframe.body-frame');if(e.origin!==location.origin||e.source!==frame?.contentWindow)return;
 if(e.data?.type==='pulse-body-ready')syncBody();
 if(e.data?.type==='pulse-body-selection'&&page==='checkin')void action({dataset:{action:'area',id:e.data.area}});
});
window.addEventListener('hashchange',()=>{stopCamera();void show().then(()=>{window.scrollTo(0,0);document.querySelector('.content').scrollTop=0;}).catch(e=>notice(e.message,true));});
window.addEventListener('pagehide',stopCamera);
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('help-panel').hidden=true;});
let pollCount=0;
async function poll() {
 if(!token||busy)return;
 const version=revision;
 try {
  const [next,events]=await Promise.all([api('/clock'),api(`/events?after=${eventsAfter}`)]);
  if(version!==revision)return;
  const reset=events.events.some(e=>e.type==='demo.reset');
  const last=events.lastId;
  if(reset){resetLocal();clock=next;eventsAfter=last;await show();return;}
  eventsAfter=last;clock=next;
  missionViews.tick();
  const label=$('#mission-label');if(label)label.textContent=`Day ${clock.missionDay} · ${clock.now.slice(11,19)} UTC`;
  if(page==='fitness'&&workout){const live=$('#workout-live');if(live)live.innerHTML=workoutLive(workout.snapshot(clock.now));}
  if(role()!=='earth'&&events.events.some(e=>e.type.startsWith('meds.emergency-'))){
   data.emergencies=await api('/meds/emergencies?status=open');
   $('#emergency-banner').hidden=!data.emergencies.emergencies.length;
   $('#emergency-banner').textContent=data.emergencies.emergencies.map(e=>`OPEN EMERGENCY · ${member(e.patientId)} · ${time(e.raisedAt)}`).join(' | ');
  }
  const clinicalRefresh=++pollCount%5===0&&((role()==='earth'&&page==='earth')||(role()==='medical_officer'&&page==='crew'));
  const medicationRefresh=pollCount%5===0&&page==='medbay';
  const relevant=events.events.some(e=>!e.type.startsWith('clock.')&&(!e.crewId||e.crewId===user.crewId||role()==='medical_officer'));
  if((relevant||clinicalRefresh||medicationRefresh)&&!document.activeElement?.closest('form'))await show();
 } catch(e){if(version===revision)notice(`Connection issue: ${e.message}. Unsaved inputs are kept.`,true);}
}
async function init() {
 try {
  const loaded=await Promise.all([fetch('/demo-data/workout-heart-rate.json').then(r=>r.json()),fetch('/demo-data/measurement-guides.json').then(r=>r.json())]);
  [replay,guides]=loaded;
  if(token){try{user=(await api('/session')).user;}catch{token=null;sessionStorage.removeItem('pulse-token');}}
  if(user){const events=await api('/events');eventsAfter=events.lastId;
   try {const cached=JSON.parse(sessionStorage.getItem('pulse-collection')??'null');if(cached?.token===token&&cached.collection?.crewId===user.crewId)collection=cached.collection;}catch{sessionStorage.removeItem('pulse-collection');}
  }
  await show();
 }catch(e){notice(`Could not initialize the connected demo: ${e.message}`,true);}
}
void init();setInterval(()=>void poll(),3000);
