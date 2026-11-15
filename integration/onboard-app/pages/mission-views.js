import {trainingTrace} from '/training-demo.js';
import {compartmentLabel} from '/cabinet-labels.js';
import {readingTint,scaleTint} from '/overview-colors.js';
import {EXTRA_QUESTIONS,WELLBEING_SCALE_IDS} from '/wellbeing-questions.js';
import {POINT_BY_ID} from '/body-points.js';
import {MEDICAL_OFFICER_ID} from '/shared/contract/contract.js';
// Presentation only. API calls, permissions, data rules and controllers stay in app.js/owner modules.
import { getDailyWorkout } from '/demo-data/workout-program.js';

export function createMissionViews({ state, helpers: h, legacy, redraw, remember }) {
  const { esc, icon, btn, field, select, note, submit, card, empty, bodyFrame, mascotSvg, time, member, chatTranscript, chatComposer } = h;
  const ui = { chartId:0,setChecks:{},stageReps:{},wellbeingStep:0, emergencyEnabled:false,medTab: 'cabinet', lockerId: null, binId: null, cabinetPage: 0,
    welcome: sessionStorage.getItem('pulse-welcome') === 'done' };
  const pill = (label, tone='cyan') => `<span class="status-pill ${tone}"><i></i>${esc(label)}</span>`;
  const heading = (eyebrow,title,action='') => `<div class="section-heading"><div><span class="eyebrow">${eyebrow}</span><h3>${title}</h3></div>${action}</div>`;
  const disclosure = (label,content,cls='') => `<details class="disclosure ${cls}"><summary>${label}</summary><div class="disclosure-body">${content}</div></details>`;
  const binsOf = locker => locker?.shelves.flatMap(s=>s.bins.map(b=>({...b,shelf:s.id}))) ?? [];
  const gauge = (label,value,unit,{fraction=1,color='cyan',caption='',link='',tint=null,compact=false}={}) => {
    const missing=value===null||value===undefined||value==='—';
    const arc=435.6,amount=missing?0:Math.max(0,Math.min(1,fraction));
    return `<${link?'a':'div'} class="gauge-card ${color}${compact?' gauge-compact-value':''}" style="--instrument-color:${tint??scaleTint(amount)}" ${tint?'aria-description="Illustrative value tint, not a health rating"':''} ${link?`href="${link}"`:''}><span class="gauge-label">${label}</span><div class="gauge-ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="gauge-track" cx="100" cy="100" r="78" pathLength="${arc+55}" stroke-dasharray="${arc} 55" transform="rotate(110 100 100)"/><circle class="gauge-value" style="opacity:${amount?1:0}" cx="100" cy="100" r="78" pathLength="${arc+55}" stroke-dasharray="${arc*amount} ${arc+55}" transform="rotate(110 100 100)"/></svg><span class="gauge-center"><b>${esc(missing?'—':value)}</b><small>${unit}</small></span></div>${caption===false?'':`<span class="gauge-caption">${caption||'Today’s check-in'}</span>`}</${link?'a':'div'}>`;
  };
  function login() {
    const { CREW }=state();
    if(!ui.welcome) return `<div class="login mission-welcome"><div class="welcome-stars"></div><div class="welcome-content"><img class="team-logo" src="/assets/team-logo.png" alt="May the Pulse Be With You" width="420" height="420">${btn('Begin mission','ui-begin','','primary welcome-button')}</div></div>`;
    return `<div class="login mission-login"><div class="login-card"><div class="login-identity"><img class="login-team-logo" src="/assets/team-logo.png" alt="May the Pulse Be With You"><span class="eyebrow">PULSE / CREW HEALTH</span></div><h1 class="display">Welcome aboard.</h1><p class="muted">Choose a demo profile to continue.</p><div class="crew-pick">${CREW.map(c=>`<button class="crew-btn" data-action="login" data-id="${c.id}"><span class="avatar">${c.name.split(' ').map(x=>x[0]).join('')}</span><span><b>${c.name}</b><small>${c.title}</small></span>${icon('chev')}</button>`).join('')}</div><div class="login-roles">${btn('Medical officer','login-medical','','ghost sm')}${btn('Earth console','login-earth','','ghost sm')}</div><span class="subtle">Synthetic crew profiles · Demo access</span></div></div>`;
  }
  function home() {
    const {data,clock,workout,trainingEndedToday,wellbeingCompletedToday}=state(), row=data.today?.checkIn;
    const workouts=(data.workouts?.workouts??[]).filter(w=>w.missionDay===clock.missionDay);
    const pending=[];
    const training=workout?.snapshot(clock.now);
    const justFinished=training?.day.missionDay===clock.missionDay&&['completed','stopped'].includes(training.status);
    const wellbeingDone=!!wellbeingCompletedToday;
    const trainingDone=!getDailyWorkout(clock.missionDay).sessions.length||(data.pulsars?.wallet?data.pulsars.wallet.trainingDone:workouts.length>0||justFinished||trainingEndedToday);
    const tasksDone=Number(wellbeingDone)+Number(!!trainingDone);
    if(!wellbeingDone)pending.push('<a class="task-cue" href="#checkin"><i></i>Daily wellbeing</a>');
    if(!trainingDone)pending.push('<a class="task-cue" href="#fitness"><i></i>Training open</a>');
    return `<div class="overview-intro"><div class="task-cues">${pending.join('')}</div></div><div class="overview-grid"><div class="card anatomy-card"><div class="anatomy-stage">${bodyFrame('view')}</div>${clock.missionDay===42?`<div class="thermal-key"><span>Skin temperature <small>Simulated sensors</small></span><i></i><div><small>31 °C</small><small>33 °C</small><small>35 °C</small></div></div>`:''}</div><div class="overview-instruments"><div class="gauge-grid">${gauge('Resting pulse',row?.restingHeartRateBpm,'bpm',{link:'#checkin',caption:false,tint:readingTint('restingHeartRateBpm',row?.restingHeartRateBpm)})}${gauge('Body temperature',row?.temperatureC,'°C',{color:'gold',link:'#checkin',caption:false,tint:readingTint('temperatureC',row?.temperatureC)})}${gauge('Sleep',row?.sleepHours,'hours',{color:'cyan',link:'#checkin',caption:false,tint:readingTint('sleepHours',row?.sleepHours)})}${gauge('Daily tasks',`${tasksDone}/2`,'completed',{fraction:tasksDone/2,link:!wellbeingDone?'#checkin':!trainingDone?'#fitness':'#home',caption:false})}${gauge('SpO₂',row?.spo2Pct,'%',{caption:false,tint:readingTint('spo2Pct',row?.spo2Pct)})}${gauge('Blood pressure',row?.systolicMmHg!=null&&row?.diastolicMmHg!=null?`${row.systolicMmHg}/${row.diastolicMmHg}`:'—','mmHg',{caption:false,tint:readingTint('systolicMmHg',row?.systolicMmHg),compact:true})}</div></div></div>`;
  }

  function rating(label,name,value,lo,hi,disabled) {
    return `<div class="rating-group" data-rating="${name}"><div class="rating-title"><b>${label}</b><span>${value!==''&&value!=null?`${esc(value)} / 10`:'Choose 1–10'}</span></div><input type="hidden" name="${name}" value="${esc(value??'')}"><div class="rating-options" role="group" aria-label="${label}">${Array.from({length:10},(_,i)=>`<button type="button" data-action="ui-rating" data-value="${i+1}" aria-pressed="${Number(value)===i+1}" ${disabled?'disabled':''}>${i+1}</button>`).join('')}</div><div class="rating-anchors"><span>${lo}</span><span>${hi}</span></div></div>`;
  }
  function adviceCard() {
    const {suggestion}=state();if(!suggestion)return '';
    const advice=(Array.isArray(suggestion.advice)?suggestion.advice:[suggestion.advice]).filter(Boolean);
    return card(suggestion.redFlag?'Contact the medical officer now':'Your symptom guidance',`${advice.map(a=>`<p>${esc(a)}</p>`).join('')}${(suggestion.suggestions??[]).map(s=>`<div class="row-item"><span class="grow"><b>${esc(s.name)}</b><small>${esc(s.why)}</small></span><a class="btn ghost sm" href="#medbay">Medical bay</a></div>`).join('')}${(suggestion.blocked??[]).map(b=>`<p class="access-reason">${icon('lock')}<span>${esc(b.name)} · ${esc(b.why)}</span></p>`).join('')}`);
  }
  const basicSymptoms = {
    head:['headache','fever','neuro-headache'], eyes:['dry-eyes','eye-injury'],
    neck:['sore-throat','cough','throat-swelling'], chest:['cough','chest-pain','breathing'],
    arms:['muscle-pain','itch-rash','minor-cut'],back:['muscle-pain'],
    stomach:['nausea','diarrhea','constipation','severe-abdominal'],legs:['muscle-pain','itch-rash','fatigue'],
  };
  function symptomOptions(area) {
    const {SYMPTOMS}=state();
    const codes=basicSymptoms[POINT_BY_ID[area]?.area??area]??['headache','muscle-pain','nausea','fatigue','cough','fever','itch-rash'];
    return SYMPTOMS.filter(x=>codes.includes(x.code));
  }
  function selectArea(area) {
    const input=document.getElementById('symptom-code');if(!input)return;
    const options=symptomOptions(area),old=input.value;
    input.innerHTML=options.map(s=>`<option value="${esc(s.code)}">${esc(s.label)}${s.redFlag?' · urgent':''}</option>`).join('');
    if(options.some(s=>s.code===old))input.value=old;
    const label=document.getElementById('selected-location');if(label){label.hidden=false;label.textContent=POINT_BY_ID[area]?`${POINT_BY_ID[area].label} · ${POINT_BY_ID[area].view}`:area;}
    remember(input.form);
  }
  const draftKey=()=>`pulse-wellbeing-draft:${state().user?.crewId}:${state().clock?.missionDay}`;
  const extraDraft=()=>{try{return JSON.parse(sessionStorage.getItem(draftKey())??'{}');}catch{return {};}};
  const keepExtra=form=>{const values={...extraDraft(),...Object.fromEntries(new FormData(form))};sessionStorage.setItem(draftKey(),JSON.stringify(values));};
  function wellbeing() {
    const {data,drafts,user,wellbeingCompletedToday}=state();
    if(ui.wellbeingCrew!==user?.crewId){ui.wellbeingCrew=user?.crewId;ui.wellbeingStep=0;}
    const row=data.today?.checkIn,saved=!!row,step=ui.wellbeingStep;
    const core=k=>saved?(row[k]??''):(drafts['wellbeing-core-form']?.[k]??'');
    const extras=extraDraft(),extra=k=>drafts['wellbeing-extra-form']?.[k]??extras[k]??data.pulsars?.wallet?.todayAnswers?.[k]??'';
    const tabs=['Today','Focus','Crew','Recovery'];
    let content='';
    if(step===0)content=`<form id="wellbeing-core-form"><fieldset ${saved?'disabled':''} class="plain-fieldset">${rating('How was your mood?','mood',core('mood'),'Very low','Very good',saved)}${rating('How stressed did you feel?','stress',core('stress'),'Not at all','Extremely',saved)}${rating('How fatigued did you feel?','fatigue',core('fatigue'),'Not at all','Extremely',saved)}${field('Sleep in the last 24 hours (hours, optional)','sleepHours',{type:'number',attrs:'min="0" max="24" step="0.1"',value:core('sleepHours')})}</fieldset></form>`;
    if(step===1||step===2)content=`<form id="wellbeing-extra-form">${EXTRA_QUESTIONS.slice((step-1)*3,step*3).map(q=>rating(q.prompt,q.id,extra(q.id),q.low,q.high,wellbeingCompletedToday)).join('')}</form>`;
    if(step===3)content=`<form id="wellbeing-extra-form">${[EXTRA_QUESTIONS[6]].map(q=>rating(q.prompt,q.id,extra(q.id),q.low,q.high,wellbeingCompletedToday)).join('')}</form><p class="draft-explainer">Your answers are private. Pulsars reward completion, never what you answer.</p><form id="daily-wellbeing-finish">${WELLBEING_SCALE_IDS.map(k=>`<input type="hidden" name="${k}" value="${esc(['mood','stress','fatigue'].includes(k)?core(k):extra(k))}">`).join('')}<input type="hidden" name="sleepHours" value="${esc(core('sleepHours'))}"><button class="btn primary" type="submit" ${wellbeingCompletedToday?'disabled':''}>${wellbeingCompletedToday?'Completed today':'Finish daily wellbeing'}</button></form>`;
    return `<div class="card daily-form-card">${heading('DAILY WELLBEING','A moment for yourself',pill(wellbeingCompletedToday?'Completed today':step===0&&saved?'Core answers saved':step===0?'Daily check-in':'Session draft',wellbeingCompletedToday?'green':'quiet'))}<div class="wellbeing-steps" role="group" aria-label="Question sections">${tabs.map((label,i)=>btn(label,'ui-wellbeing-step',`data-id="${i}" aria-pressed="${i===step}"`,'ghost sm')).join('')}</div><span class="subtle question-progress">${step<3?`${step*3+1}–${step*3+3}`:'10'} of 10 questions</span>${content}<div class="wellbeing-navigation">${btn('Previous','ui-wellbeing-step',`data-id="${step-1}" ${step===0?'disabled':''}`,'ghost sm')}${step<3?btn('Next','ui-wellbeing-step',`data-id="${step+1}"`,'primary sm'):''}</div></div>`;
  }
  function checkin() {
    const {drafts,SYMPTOMS,selectedArea,stagedSymptoms}=state();
    return `<div class="daily-grid psychometric-layout"><div class="stack">${wellbeing()}${adviceCard()}</div><div class="card symptoms-card">${heading('SYMPTOMS','Where does it bother you?')}<div class="symptom-body">${bodyFrame('report')}</div><div id="selected-location" class="selected-location" ${selectedArea?'':'hidden'}>${esc(POINT_BY_ID[selectedArea]?.label??selectedArea??'')}${POINT_BY_ID[selectedArea]?` · ${POINT_BY_ID[selectedArea].view}`:''}</div><form id="symptom-form"><label class="field"><span>Symptom</span><select class="input" id="symptom-code" name="code" required>${symptomOptions(selectedArea).map(x=>`<option value="${esc(x.code)}">${esc(x.label)}${x.redFlag?' · urgent':''}</option>`).join('')}</select></label><label class="field severity-control"><span>Severity <b><output id="severity-value" aria-label="Selected severity">${drafts['symptom-form']?.severity??5}</output> / 10</b></span><input type="range" style="--range-fill:${(Number(drafts['symptom-form']?.severity??5)-1)/9*100}%" name="severity" aria-label="Severity" min="1" max="10" step="1" value="${drafts['symptom-form']?.severity??5}"><span class="range-ends"><small>1 · Mild</small><small>10 · Severe</small></span></label><div class="symptom-list">${stagedSymptoms.map((s,i)=>`<div class="status-line">${pill(`${SYMPTOMS.find(x=>x.code===s.code)?.label} · ${s.severity}/10`)}${btn('Remove','remove-symptom',`data-id="${i}"`,'ghost sm')}</div>`).join('')}</div>${note('A short note (optional)')}<div class="form-end">${submit('Send symptom report')}</div></form></div></div>`;
  }
  function importCard() {
    return `<div class="card code-card">${heading('PRESCRIPTION ACCESS','Use a code or QR')}<form id="import-form">${field('Prescription code','code',{required:true,attrs:'autocomplete="off" placeholder="RX2-…"'})}${submit('Use credential')}</form><div class="scan-controls">${btn(`${icon('scan')} Scan QR`,'qr-camera','','ghost sm')}${btn('Stop camera','qr-stop','','ghost sm')}<video id="qr-video" hidden playsinline></video><p id="qr-status" class="subtle"></p></div><p class="subtle">Your code works again when the next dose is due.</p></div>`;
  }
  function collectionStrip() {
    const {collection,data}=state();
    if(!collection||collection.status!=='open')return '';
    const all=(data.lockers?.lockers??[]).flatMap(binsOf);
    return `<div class="collection-strip"><div>${pill('Ready to collect','green')}<b>Confirm each dispensed item</b></div><div class="collection-parts">${collection.compartments.map(p=>`<div><span>${esc(all.find(b=>b.itemId===p.itemId)?.label??p.itemId)} <b>× ${p.units}</b></span>${p.scanned?pill('Collected','green'):btn('Confirm collection','scan-item',`data-id="${p.compartmentId}"`,'primary sm')}</div>`).join('')}</div>${btn('Cancel remaining batch','cancel-collection','','ghost sm')}</div>`;
  }
  function itemArt(bin) {
    if(bin.itemId==='aed')return aedArt();
    const kind=bin.tier==='supply'?'pack':bin.tier==='emergency'?'injector':'bottle';
    return `<span class="medical-object ${kind} ${bin.tier==='controlled'?'controlled':''}" aria-hidden="true"><i></i><b></b></span>`;
  }
  function aedArt(){
    return '<span class="aed-device" aria-hidden="true"><span class="aed-handle"></span><span class="aed-screen">♥</span><span class="aed-mark">AED</span><i></i></span>';
  }
  const plannedAed={compartmentId:'draft-aed',label:'Defibrillator',tier:'emergency',locked:true,open:false,isDraft:true,displayLocation:'L3-D-01 — 03'};
  function cabinet() {
    const {data,role}=state(),lockers=data.lockers?.lockers??[];
    const locker=lockers.find(l=>l.id===ui.lockerId)??lockers[0];
    if(!locker)return empty('Inventory is loading.');
    const bins=binsOf(locker),regular=bins.filter(b=>b.itemId!=='aed'),aed=locker.id==='L3'?(bins.find(b=>b.itemId==='aed')??plannedAed):null,pages=Math.max(1,Math.ceil(regular.length/9));
    ui.lockerId=locker.id;ui.cabinetPage=Math.min(ui.cabinetPage,pages-1);
    let selected=locker.id==='L3'&&ui.binId==='draft-aed'?aed:bins.find(b=>b.compartmentId===ui.binId)??regular[ui.cabinetPage*9]??aed;
    ui.binId=selected?.compartmentId;
    const current=regular.slice(ui.cabinetPage*9,(ui.cabinetPage+1)*9);
    const doors=Array.from({length:locker.id==='L3'?Math.max(3,Math.ceil(current.length/3)*3):9},(_,i)=>current[i]);
    return `<div class="cabinet-workspace"><div class="cabinet-column"><div class="locker-switch" role="group" aria-label="Cabinet">${lockers.map(l=>btn(`${l.id} <span>${esc(l.name.split('·').pop().trim())}</span>`,'ui-locker',`data-id="${l.id}" aria-pressed="${l.id===locker.id}"`,'ghost sm')).join('')}</div><div class="cabinet-housing"><div class="cabinet-ident"><b>PULSE <i>/</i> MED-${esc(locker.id.slice(1).padStart(2,'0'))}</b><span>${bins.length} COMPARTMENTS</span></div><div class="cabinet-recess"><div class="cabinet-grid">${doors.map(b=>b?`<button class="cabinet-door ${b.locked&&!b.open?'door-locked':''} ${b.open?'door-open':''} ${b.compartmentId===ui.binId?'selected':''}" data-action="ui-bin" data-id="${b.compartmentId}" aria-pressed="${b.compartmentId===ui.binId}" aria-label="${esc(b.label)} · ${esc(compartmentLabel(b.compartmentId))} · ${b.open?'door open':b.locked?'restricted':'available'}"><span class="door-top"><b>${esc(compartmentLabel(b.compartmentId))}</b><i class="door-led ${b.open?'green':b.locked?'red':'cyan'}"></i></span><span class="door-window">${itemArt(b)}<i class="door-handle"></i></span><span class="door-label">${esc(b.label)}</span></button>`:`<div class="cabinet-door unused" aria-hidden="true"><span class="door-top"><b>—</b><i class="door-led"></i></span><span class="door-window"><span class="empty-bin">SPARE</span></span><span class="door-label">Unassigned</span></div>`).join('')}${aed?`<button class="cabinet-door planned-equipment ${aed.locked&&!aed.open?'door-locked':''} ${aed.open?'door-open':''} ${ui.binId===aed.compartmentId?'selected':''}" data-action="ui-bin" data-id="${aed.compartmentId}" aria-pressed="${ui.binId===aed.compartmentId}" aria-label="Defibrillator · L3-D-01 to 03 · ${aed.isDraft?'awaiting catalogue':aed.open?'door open':'emergency equipment'}"><span class="door-top"><b>L3-D-01 — 03</b><i class="door-led ${aed.open?'green':aed.locked?'red':'cyan'}"></i></span><span class="door-window">${aedArt()}</span><span class="door-label">Defibrillator <small>${aed.isDraft?'Awaiting catalogue':'Emergency equipment'}</small></span></button>`:''}</div></div><div class="cabinet-base"><span><i></i> CABINET SIMULATOR</span><div>${btn('‹','ui-cabinet-page',`data-step="-1" aria-label="Previous compartments" ${ui.cabinetPage===0?'disabled':''}`,'ghost sm')}<b>${ui.cabinetPage+1} / ${pages}</b>${btn('›','ui-cabinet-page',`data-step="1" aria-label="Next compartments" ${ui.cabinetPage===pages-1?'disabled':''}`,'ghost sm')}</div></div></div><div class="cabinet-legend"><span><i class="cyan"></i>Selected</span><span><i class="green"></i>Open for collection</span><span><i class="red"></i>Restricted</span></div></div>${itemDetail(selected,role)}</div>`;
  }
  function itemDetail(b,role) {
    if(b?.isDraft)return `<aside class="card item-detail planned-equipment-detail">${heading('PLANNED EQUIPMENT',b.displayLocation,pill('Draft','quiet'))}<div class="detail-title"><h2>Defibrillator</h2><div class="detail-art">${aedArt()}</div></div><p class="subtle">Emergency access · awaiting inventory connection.</p><button class="btn ghost" type="button" disabled>Not connected yet</button></aside>`;
    const {collection,data}=state();
    if(!b)return '';
    const part=collection?.status==='open'?collection.compartments.find(p=>p.compartmentId===b.compartmentId&&!p.scanned):null;
    const prescribed=(data.grants?.grants??[]).find(g=>g.status==='active'&&g.items.some(i=>i.itemId===b.itemId));
    const dose=prescribed?.items.find(i=>i.itemId===b.itemId);
    const routedToDoctor=/the medical officer decides/i.test(b.why??'');
    const earthApproval=b.tier==='controlled'||/Earth decides/.test(b.why??'')||(routedToDoctor&&state().user?.crewId===MEDICAL_OFFICER_ID);
    const safetyBlocked=b.why?.startsWith('Allergy:')||(b.tier==='self-care'&&b.locked&&!routedToDoctor);
    const tier=safetyBlocked?'Unavailable':earthApproval?'Earth prescription · code / QR':{'self-care':b.locked?'Onboard doctor approval':'Self-care',prescription:'Onboard doctor approval',emergency:'Emergency access',supply:'Crew supply'}[b.tier]??b.tier;
    // Routing is already shown in Access. Keep actionable safety blocks, not policy boilerplate.
    const safetyReason=/^(Prescription:|Controlled medicine:|Emergency medicine:|The medical officer is the patient:)/i.test(b.why??'')?null:b.why?.replace(/: the medical officer decides$/i,'');
    let actions='';
    if(role==='crew') {
      if(b.open&&part)actions=`<div class="ready-note"><span>${part.units} unit(s) ready${collection.source==='emergency'?` · For ${esc(member(collection.patientId))}`:''}</span></div>${btn('Confirm collection','scan-item',`data-id="${b.compartmentId}"`,'primary')}${btn('Cancel remaining batch','cancel-collection','','ghost sm')}`;
      else if(b.tier==='emergency') {
        const {CREW,user}=state();
        actions=ui.emergencyEnabled
          ? `<form id="cabinet-emergency-${b.itemId}" data-cabinet-emergency data-item="${b.itemId}">${select('For','patientId',CREW.map(c=>[c.id,c.name]),user.crewId)}<label class="field"><span>Emergency reason</span><textarea class="input" name="reason" rows="3" maxlength="500" required></textarea></label>${disclosure('Allergy override',`<label class="checkline"><input type="checkbox" name="overrideAllergy"> Give despite an allergy only if there is no other option; log the override.</label>`)}${submit('Collect item')}</form>`
          : '';
      }
      else if(b.why?.startsWith('Allergy:'))actions=`<button type="button" class="btn ghost" disabled>Unavailable for this profile</button>`;
      else if(prescribed)actions=`<div class="ready-note">${pill('Prescription on file','quiet')}<span>${dose.units} unit(s) · ${dose.perDay}/day</span>${dose.nextDue?`<small>Next ${time(dose.nextDue)}</small>`:''}</div>${dose.status==='due'?btn('Collect due items','collect-grant',`data-id="${prescribed.id}"`,'primary'):btn('View prescription','ui-med-tab','data-id="courses"','ghost')}`;
      else actions=`<form id="item-${b.itemId}" data-item="${b.itemId}">${b.locked?note('Request note (optional)'):field('Quantity','units',{type:'number',value:1,attrs:'min="1" max="9" step="1"',required:true})}<button class="btn primary" name="intent" value="${b.locked?'request':'collect'}" type="submit">${b.locked?'Request approval':'Collect item'}</button></form>`;
    }
    return `<aside class="card item-detail ${b.itemId==='aed'?'equipment-detail':''}">${heading('SELECTED COMPARTMENT',esc(compartmentLabel(b.compartmentId)),pill(b.open?'Open':b.locked?'Restricted':'Available',b.open?'open':b.locked?'red':'available'))}<div class="detail-title"><h2>${esc(b.label)}</h2><div class="detail-art">${itemArt(b)}</div></div><dl class="item-facts"><div><dt>In stock</dt><dd>${b.units} unit(s)</dd></div><div><dt>Access</dt><dd>${esc(tier)}</dd></div><div><dt>Location</dt><dd>${esc(compartmentLabel(b.compartmentId))}</dd></div></dl>${safetyReason&&!b.open?`<p class="access-reason">${icon('lock')}${esc(safetyReason)}</p>`:''}<div class="item-actions">${actions}</div></aside>`;
  }
  function medbay() {
    const {role,data}=state();
    if(ui.medTab==='profile')ui.medTab='cabinet';
    if(role==='crew'&&ui.medTab==='activity')ui.medTab='courses';
    if(role==='earth')return `<div class="stack">${legacy.requestsPanel()}<a class="btn primary" href="#earth">Open Earth console</a></div>`;
    const tabs=[['cabinet','Cabinet'],['courses','My treatment'],...(role==='crew'?[]:[['activity','Activity']])];
    const content={cabinet:()=>`${cabinet()}${role==='medical_officer'?disclosure('Stock watch',legacy.stockPanel(),'card compact'):''}`,courses:()=>`<div class="two">${role==='crew'?importCard():legacy.requestsPanel()}<div class="stack">${role==='crew'?upcomingTreatment():legacy.grantsPanel()}${role==='crew'?legacy.requestsPanel():''}</div></div>`,activity:()=>legacy.dosesPanel(),emergency:()=>legacy.emergencyPanel()};
    return `${role==='medical_officer'?legacy.patientPicker():''}${ui.medTab!=='cabinet'?collectionStrip():''}<div class="med-toolbar"><div class="page-tabs ${role==='crew'?'crew-med-tabs':''}" role="group" aria-label="Medical bay sections">${tabs.map(([id,label])=>btn(label,'ui-med-tab',`data-id="${id}" aria-pressed="${ui.medTab===id}"`,'ghost sm')).join('')}</div>${btn(`${icon('shield')} Emergency`,role==='crew'?'ui-emergency':'ui-med-tab',`data-id="emergency" aria-pressed="${role==='crew'?ui.emergencyEnabled:ui.medTab==='emergency'}"`,'emergency-button sm')}</div>${(content[ui.medTab]??content.cabinet)()}`;
  }
  function dosesRemaining(g,item,now){
    if(g.status!=='active'||['finished','replaced','cancelled'].includes(item.status))return 0;
    const total=item.perDay*item.days,start=Date.parse(g.start),interval=86400000/item.perDay;
    if(item.status==='not-started')return total;
    if(item.status==='done'&&!item.nextDue)return 0;
    const at=item.status==='due'?Date.parse(now):Date.parse(item.nextDue??now);
    return Math.max(0,total-Math.max(0,Math.floor((at-start)/interval+1e-8)));
  }
  function upcomingTreatment(){
    const {data,clock}=state();const grants=(data.grants?.grants??[]).filter(g=>g.status==='active');
    return card('Your dose plan',grants.map(g=>`<div class="treatment-course">${g.items.map(item=>{const remaining=dosesRemaining(g,item,clock.now);return `<div class="treatment-item"><b>${esc(item.name)}</b><div class="treatment-facts"><span>${item.units} unit(s) per dose · ${item.perDay}/day</span>${pill(`${remaining} scheduled doses left`,remaining?'cyan':'quiet')}</div><small>${item.status==='due'?'Due now':item.nextDue?`Next ${time(item.nextDue)}`:'No future dose scheduled'}</small></div>`;}).join('')}${g.dueNow&&state().collection?.status!=='open'?btn('Collect due doses','collect-grant',`data-id="${g.id}"`,'primary sm'):''}${disclosure('Code / QR',`<code>${esc(g.code)}</code><p class="subtle">Use the same credential when your next dose is due.</p>`)}</div>`).join('')||empty('No active dose plan.'));
  }
  function drawChart(points,{unit='',elapsed=false,limits=null,relative=false}={}) {
    const valid=points.filter(p=>p[1]!=null&&Number.isFinite(p[1]));
    if(valid.length<2)return `<div class="chart-empty"><span class="quiet-wave">${icon('activity')}</span><span>${valid.length?'Collecting readings…':'No readings available'}</span></div>`;
    const valueTime=p=>elapsed?Number(p[0]):Date.parse(p[0]);
    const xs=points.map(valueTime),ys=valid.map(p=>p[1]);
    const thresholds=[['Warning',limits?.warningHigh],['Danger',limits?.dangerHigh]].filter(([,v])=>v!=null&&v>=Math.min(...ys)-500&&v<=Math.max(...ys)+500);
    const low=Math.min(...ys,...thresholds.map(([,v])=>v)),high=Math.max(...ys,...thresholds.map(([,v])=>v));
    const pad=(high-low||1)*0.15,min=low-pad,max=high+pad;
    const x=t=>48+(t-xs[0])/(xs.at(-1)-xs[0]||1)*596,y=v=>165-(v-min)/(max-min)*132;
    let d='',pen=false;
    for(const p of points){if(p[1]==null){pen=false;continue;}d+=`${pen?'L':'M'}${x(valueTime(p)).toFixed(1)},${y(p[1]).toFixed(1)} `;pen=true;}
    const label=t=>relative?(t===xs.at(-1)?'Now':`−${Math.round((xs.at(-1)-t)/60)} min`):elapsed?`${Math.round(t)}s`:new Date(t).toISOString().slice(11,16);
    const colorId=`pulse-plot-${++ui.chartId}`;
    const endTint=scaleTint((valid.at(-1)[1]-min)/(max-min));
    return `<svg class="mission-chart" viewBox="0 0 680 202" role="img" aria-label="${esc(unit)} measurements"><defs><linearGradient id="${colorId}" gradientUnits="userSpaceOnUse" x1="0" y1="165" x2="0" y2="33"><stop offset="0" style="stop-color:var(--graph-base)"/><stop offset="1" style="stop-color:var(--graph-warm)"/></linearGradient></defs><g>${[0,1,2,3].map(i=>{const v=min+(max-min)*i/3;return `<line x1="48" y1="${y(v)}" x2="646" y2="${y(v)}"/><text x="38" y="${y(v)+4}" text-anchor="end">${v>=100?Math.round(v):v.toFixed(1)}</text>`;}).join('')}</g>${thresholds.map(([l,v])=>`<line class="chart-threshold" x1="48" y1="${y(v)}" x2="646" y2="${y(v)}"/><text class="threshold-caption" x="54" y="${y(v)-6}">${l} ${v}</text>`).join('')}<path d="${d}" style="stroke:url(#${colorId})"/><circle style="fill:${endTint}" class="chart-endpoint" cx="${x(valueTime(valid.at(-1)))}" cy="${y(valid.at(-1)[1])}" r="4"/>${[xs[0],xs.at(-1)].map((t,i)=>`<text x="${i?646:48}" y="194" text-anchor="${i?'end':'start'}">${label(t)}${!elapsed?' UTC':''}</text>`).join('')}</svg>`;
  }
  function workoutReadout(s) {
    if(!s.sessionId)return `<div class="training-idle">${icon('activity')}<h3>Ready when you are.</h3><p>Start training to view your session.</p></div>`;
    const trace=trainingTrace(s,state().exerciseReplay);
    const pending=['pending','failed','saving'].includes(s.saveStatus);
    const recovery=Math.max(0,60-(state().clock.now?Math.floor((Date.parse(state().clock.now)-Date.parse(s.outcomes.find(o=>o.sessionId===s.sessionId)?.endedAt??state().clock.now))/1000):0));
    return `<div class="training-sensors"><div class="section-heading"><h3>Session sensors</h3>${pill('Simulated · 5 min','quiet')}</div><div class="sensor-plot"><div><h4>Heart rate</h4><b>${s.heartRate.bpm??'—'} <small>bpm</small></b></div>${drawChart(trace.pulse,{unit:'Heart rate · bpm',elapsed:true,relative:true})}</div><div class="sensor-plot"><div><h4>Breathing</h4><b>${trace.breathsPerMinute??'—'} <small>breaths/min</small></b></div>${drawChart(trace.breathing,{unit:'Breathing · breaths/min',elapsed:true,relative:true})}</div><div class="training-session-status"><span>${s.completed.length}/${s.totalSteps} exercises</span><span>Session · ${Math.floor(s.elapsedSeconds/60)}:${String(s.elapsedSeconds%60).padStart(2,'0')}</span></div>${pending?`<p class="subtle auto-save-status" role="status">${s.saveStatus==='saving'?'Saving automatically…':s.saveStatus==='failed'?'Automatic save retry pending':recovery?`Recovery · ${recovery}s · saves automatically`:'Saving automatically…'}</p>`:s.status!=='active'?pill('Session complete','green'):''}</div>`;
  }
  function loadDraft(step){
    if(step.kind!=='resistance')return '';
    const value=state().drafts['workout-step']?.weightKg??'';
    const record=state().data.pulsars?.wallet?.records?.[step.id];
    return `<div class="load-draft">${field('Load · kg','weightKg',{type:'number',value,attrs:'min="0" max="1000" step="any" placeholder="kg" inputmode="decimal"'})}<div class="load-stepper">${btn('+','ui-load-step','data-delta="5" aria-label="Increase load by 5 kg"','ghost')}${btn('−','ui-load-step',`data-delta="-5" aria-label="Decrease load by 5 kg" ${Number(value||0)<=0?'disabled':''}`,'ghost')}</div><div class="pr-draft"><small>PR · kg</small><b>${record?.weightKg??'—'}</b></div><small>${state().workoutMode==='stage'?'Stage preview · no Pulsars or load records':'Load saved with completed sets · follow your assigned setting'}</small></div>`;
  }
  const setKey=s=>`${s.sessionId}:${s.currentStep?.id}`;
  function stepControls(s){
    const step=s.currentStep;if(!step)return '';
    const key=setKey(s),checked=ui.setChecks[key]?.checked??[];
    if(step.sets)return `<form id="workout-step" data-step="${step.id}">${loadDraft(step)}<div class="exercise-prescription"><b>${step.sets} × ${step.repsPerSet}</b><span>repetitions · ${step.restBetweenSetsSeconds/60} min rest</span></div><div class="set-grid">${Array.from({length:step.sets},(_,i)=>btn(`${checked.includes(i)?icon('check'):'<span class="set-empty"></span>'}<span>Set ${i+1}<small>${step.repsPerSet} reps</small></span>`,'ui-workout-set',`data-step="${step.id}" data-id="${i}" role="checkbox" aria-checked="${checked.includes(i)}"`,'ghost set-button')).join('')}</div><p id="set-rest" class="set-rest">${restLabel()}</p><button type="submit" class="btn primary" ${checked.length===step.sets?'':'disabled'}>Finish exercise</button></form>`;
    if(step.kind==='resistance'){
      const reps=ui.stageReps[key]??0;
      return `<form id="workout-step" data-step="${step.id}">${loadDraft(step)}<input type="hidden" name="reps" value="${reps}"><div class="rep-counter">${btn('−','ui-workout-reps',`data-step="${step.id}" data-delta="-1" aria-label="Remove one repetition"`,'ghost')}<span><b>${reps}</b><small>repetitions</small></span>${btn('+','ui-workout-reps',`data-step="${step.id}" data-delta="1" aria-label="Add one repetition"`,'primary')}${btn('+5','ui-workout-reps',`data-step="${step.id}" data-delta="5" aria-label="Add five repetitions"`,'ghost sm')}</div>${submit('Finish exercise')}</form>`;
    }
    if(step.kind==='intervals')return `<form id="workout-step" data-step="${step.id}"><div class="step-time"><b data-interval-remaining>${Math.floor(s.interval.remainingSeconds/60)}:${String(s.interval.remainingSeconds%60).padStart(2,'0')}</b><span><span data-interval-phase>${s.interval.phase==='work'?'Work':s.interval.phase==='recovery'?'Recovery':'Complete'}</span> · Round <span data-interval-round>${s.interval.round}</span>/${step.count}</span></div>${submit('Complete exercise')}</form>`;
    return `<form id="workout-step" data-step="${step.id}">${loadDraft(step)}<div class="step-time"><b data-step-elapsed>${Math.floor(s.stepElapsedSeconds/60)}:${String(s.stepElapsedSeconds%60).padStart(2,'0')}</b>${step.durationSeconds?`<span> / ${Math.floor(step.durationSeconds/60)}:${String(step.durationSeconds%60).padStart(2,'0')}</span>`:''}</div>${submit('Complete exercise')}</form>`;
  }
  function restLabel(){
    const snapshot=state().workout.snapshot(state().clock.now),key=setKey(snapshot);
    if(snapshot.currentStep?.sets&&ui.setChecks[key]?.checked.length===snapshot.currentStep.sets)return 'Sets complete';
    const entry=ui.rest;if(!entry||entry.key!==key)return 'Check off each completed set.';
    const remaining=Math.max(0,entry.seconds-Math.floor((Date.parse(state().clock.now)-Date.parse(entry.at))/1000));
    return remaining?`Rest · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Ready for the next set';
  }
  function tick(){
    const rest=document.getElementById('set-rest');if(rest)rest.textContent=restLabel();
    const snapshot=state().workout?.snapshot(state().clock.now);
    if(snapshot?.currentStep){
      for(const timer of document.querySelectorAll('[data-step-elapsed]'))timer.textContent=`${Math.floor(snapshot.stepElapsedSeconds/60)}:${String(snapshot.stepElapsedSeconds%60).padStart(2,'0')}`;
      const remaining=document.querySelector('[data-interval-remaining]');
      if(remaining&&snapshot.interval){
        remaining.textContent=`${Math.floor(snapshot.interval.remainingSeconds/60)}:${String(snapshot.interval.remainingSeconds%60).padStart(2,'0')}`;
        document.querySelector('[data-interval-phase]').textContent={work:'Work',recovery:'Recovery',done:'Complete'}[snapshot.interval.phase];
        document.querySelector('[data-interval-round]').textContent=snapshot.interval.round;
      }
    }
  }
  function fitness() {
    const {workout,clock,workoutMode}=state(),s=workout?.snapshot(clock.now);
    if(!s)return empty('Loading your program…');
    if(ui.workoutRef!==workout){ui.workoutRef=workout;ui.setChecks={};ui.stageReps={};ui.rest=null;}
    const step=s.currentStep,unresolved=['pending','failed','saving'].includes(s.saveStatus),active=s.status==='active';
    const done=state().data.pulsars?.wallet?.completedExercises;
    const nextSessionId=done?s.day.sessions.find(session=>session.steps.some(step=>!['warm-up','cool-down'].includes(step.id)&&!done.includes(step.id)))?.id:s.nextSessionId;
    const canStart=!active&&!unresolved&&nextSessionId;
    const mode=`<select class="input compact-select" id="workout-mode" aria-label="Training program" ${active||unresolved?'disabled':''}><option value="weekly" ${workoutMode==='weekly'?'selected':''}>Mars transit program</option><option value="stage" ${workoutMode==='stage'?'selected':''}>Stage demo · synthetic sensors</option></select>`;
    return `<div class="training-toolbar">${mode}${btn('Start training','workout-start',`data-id="${nextSessionId??''}" ${canStart?'':'disabled'}`,'primary start-training')}</div><div class="exercise-workspace gym-workspace"><div class="card live-training-card"><div id="workout-live">${workoutReadout(s)}</div></div><aside class="stack">${step?`<div class="card active-exercise-card">${heading('CURRENT EXERCISE',esc(step.label),pill(`${s.completed.length+1} of ${s.totalSteps}`,'quiet'))}${step.kind==='resistance'?`<div class="exercise-time-readout"><span>Exercise time</span><b data-step-elapsed>${Math.floor(s.stepElapsedSeconds/60)}:${String(s.stepElapsedSeconds%60).padStart(2,'0')}</b></div>`:''}${stepControls(s)}${disclosure('Technique & equipment',`<p>${esc(step.equipment)}</p><p>${esc(step.instruction)}</p>${step.targetHeartRateBpm?`<p>Assigned reference: ${step.targetHeartRateBpm.join('–')} bpm</p>`:''}`)}${btn('End session','workout-stop','','ghost sm')}</div>`:''}<div class="card program-card">${heading('TODAY’S PROGRAM',esc(s.day.label))}${s.day.sessions.map(session=>`<div class="program-session"><div><span class="row-icon">${icon('workout')}</span><span class="grow"><h4>${esc(session.label)}</h4><small>${session.steps.length} exercises${session.recommendedMinutesAfterResistance?' · 4–6 h after resistance':''}</small></span></div>${disclosure('View exercises',`${session.preparation?`<p>${esc(session.preparation)}</p>`:''}<div class="exercise-checklist">${session.steps.map(st=>`<div><span class="check ${s.sessionId===session.id&&s.completed.some(c=>c.stepId===st.id)?'on':''}">${s.sessionId===session.id&&s.completed.some(c=>c.stepId===st.id)?icon('check'):''}</span><span class="grow"><b>${esc(st.label)}</b><small>${st.sets?`${st.sets} × ${st.repsPerSet} reps · ${st.restBetweenSetsSeconds/60} min rest`:st.durationSeconds?`${Math.round(st.durationSeconds/60)} min`:esc(st.equipment)}</small></span>${st.kind==='resistance'?`<span class="plan-pr">PR ${esc(state().data.pulsars?.wallet?.records?.[st.id]?.weightKg??'—')} <small>kg</small></span>`:''}</div>`).join('')}</div>`)}</div>`).join('')||empty('A recovery day. No scheduled session.')}</div>${disclosure('Demo controls',legacy.demoClockPanel(),'demo-controls')}</aside></div>`;
  }
  function psychologistPreview(){
    const messages=ui.psychMessages??[];
    return `<div class="card psychologist-card"><div class="chat-head"><span class="avatar">PS</span><span class="grow"><span class="eyebrow">PRIVATE SUPPORT</span><h3>Psychologist · Earth</h3></span>${pill('Scripted demo','quiet')}</div><div class="thread psychologist-thread" aria-label="Sample psychologist conversation" aria-live="polite" aria-relevant="additions text"><p class="msg them">Hi. This is our space to check in during the journey. How have things been feeling?</p><p class="msg me">I would like a little time to talk.</p><p class="msg them">Of course. What would you like us to focus on today?</p>${messages.map(m=>`<p class="msg ${m.mine?'me':'them'}">${esc(m.text)}</p>`).join('')}</div>${chatComposer('psychologist-demo-form','Message to your psychologist')}<small class="subtle">Scripted preview · nothing is sent to Earth.</small></div>`;
  }
  function psychMessage(text){
    const value=String(text??'').trim();
    if(!value||value.length>2000)throw new Error('Write a message, up to 2000 characters.');
    const lower=value.toLowerCase();
    const reply=/sleep|night|ύπν|υπν|κοιμ/.test(lower)
      ? 'We can talk about your evenings. What has been most on your mind when you try to rest?'
      : /home|family|miss|σπίτ|σπιτ|οικογέν|οικογεν|λείπ|λειπ/.test(lower)
      ? 'That connection sounds important to you. What do you miss most right now?'
      : /stress|worr|anx|άγχ|αγχ|ανησυχ/.test(lower)
      ? 'Thank you for putting that into words. Which part of the day has felt hardest?'
      : 'Thank you for sharing that. Tell me a little more about what this has been like for you.';
    ui.psychMessages??=[];
    ui.psychMessages.push({mine:true,text:value},{mine:false,text:reply});
    redraw();
    const thread=document.querySelector('.psychologist-thread');if(thread)thread.scrollTop=thread.scrollHeight;
  }
  function mind() {
    const {data}=state();
    return `<div class="wellbeing-workspace"><div class="card companion-chat-card"><div class="chat-head"><span class="mascot-md">${mascotSvg()}</span><span class="grow"><span class="eyebrow">YOUR COMPANION</span><h3>A little company, anywhere.</h3></span>${pill('Offline','quiet')}</div><div class="thread mind-thread" data-chat-thread aria-live="polite" aria-relevant="additions text">${chatTranscript()}</div><div class="support-topics" aria-label="Conversation starters">${btn('Sleep & energy','support-prompt','data-topic="sleep"','ghost sm')}${btn('Stress & mood','support-prompt','data-topic="stress"','ghost sm')}${btn('Missing home','support-prompt','data-topic="home"','ghost sm')}</div>${chatComposer('mind-chat-form','Type a message')}<span class="subtle companion-caption">Offline support demo</span></div><div class="stack">${psychologistPreview()}<div class="card journal-card">${heading('JUST FOR YOU','Private journal',pill('Only you','quiet'))}<form id="journal-form">${note('What is on your mind?','text',5000)}<div class="form-end"><span class="subtle">A space to pause.</span>${submit('Save entry')}</div></form>${(data.journal?.entries??[]).slice(0,2).map(e=>`<div class="journal-entry"><small>${time(e.recordedAt)}</small><p>${esc(e.text)}</p></div>`).join('')}${(data.journal?.entries?.length??0)>2?disclosure('Earlier entries',data.journal.entries.slice(2).map(e=>`<div class="journal-entry"><small>${time(e.recordedAt)}</small><p>${esc(e.text)}</p></div>`).join('')):''}</div>${disclosure('Private support & demo information','<p>Your journal is visible only to you in this demo. The psychologist conversation is a scripted preview; no Earth messages are sent.</p><p>The companion uses your current check-in and synthetic mission history. It is an offline support tool, not a trained model.</p>','card support-info')}</div></div>`;
  }
  const refreshWellbeing=(scroll=false)=>{const card=document.querySelector('.daily-form-card');if(card)card.outerHTML=wellbeing();if(scroll)document.querySelector('.daily-form-card')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  function action(el) {
    const name=el.dataset.action,id=el.dataset.id;
    if(name==='ui-load-step'){
      const input=document.querySelector('#workout-step [name="weightKg"]');if(!input)return;
      const current=Number(input.value)||0,delta=Number(el.dataset.delta);
      input.value=String(Math.max(0,current+delta));remember(input.form);
      redraw();return;
    }
    if(name==='ui-workout-set'||name==='ui-workout-reps'){
      const {workout,clock,drafts}=state(),snapshot=workout.snapshot(clock.now),step=snapshot.currentStep;
      if(!step||step.id!==el.dataset.step)return;
      const key=setKey(snapshot);
      if(name==='ui-workout-set'){
        const checked=[...(ui.setChecks[key]?.checked??[])],index=Number(id),at=checked.indexOf(index);
        if(at>=0)checked.splice(at,1);else{checked.push(index);ui.rest=checked.length===step.sets?null:{key,at:clock.now,seconds:step.restBetweenSetsSeconds};}
        ui.setChecks[key]={checked};
      }else{ui.stageReps[key]=Math.max(0,Math.min(1000000,(ui.stageReps[key]??0)+Number(el.dataset.delta)));drafts['workout-step']={reps:String(ui.stageReps[key])};}
      redraw();return;
    }
    if(name==='ui-begin'){ui.welcome=true;sessionStorage.setItem('pulse-welcome','done');redraw();return;}
    if(name==='ui-help'){$help().hidden=!$help().hidden;return;}
    if(name==='ui-wellbeing-step'){ui.wellbeingStep=Math.max(0,Math.min(3,Number(id)));refreshWellbeing(true);return;}
    if(name==='ui-rating'){
      const group=el.closest('[data-rating]'),input=group.querySelector('input');input.value=el.dataset.value;
      group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));
      group.querySelector('.rating-title span').textContent=`${input.value} / 10`;remember(input.form);if(input.form.id==='wellbeing-extra-form'){keepExtra(input.form);if(ui.wellbeingStep===3)refreshWellbeing();}return;
    }
    if(name==='ui-emergency'){
      ui.emergencyEnabled=!ui.emergencyEnabled;ui.medTab='cabinet';
      if(ui.emergencyEnabled){
        const locker=(state().data.lockers?.lockers??[]).find(l=>binsOf(l).some(b=>b.tier==='emergency'));
        if(locker){ui.lockerId=locker.id;ui.cabinetPage=0;ui.binId=null;}
      }
    }
    if(name==='ui-med-tab')ui.medTab=id;
    if(name==='ui-locker'){ui.lockerId=id;ui.cabinetPage=0;ui.binId=null;}
    if(name==='ui-bin')ui.binId=id;
    if(name==='ui-cabinet-page'){ui.cabinetPage+=Number(el.dataset.step);ui.binId=null;}
    redraw();
  }
  const $help=()=>document.getElementById('help-panel');
  return {screens:{login,home,checkin,medbay,fitness,mind},action,workoutReadout,selectArea,tick,
    psychMessage,emergencyEnabled:()=>ui.emergencyEnabled,
    resetSession:()=>{ui.psychMessages=[];ui.emergencyEnabled=false;ui.medTab='cabinet';ui.lockerId=null;ui.binId=null;ui.cabinetPage=0;},
  };
}
