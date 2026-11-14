import {EXTRA_QUESTIONS} from '/wellbeing-questions.js';
import {POINT_BY_ID} from '/body-points.js';
// Presentation only. API calls, permissions, data rules and controllers stay in app.js/owner modules.
import { getDailyWorkout } from '/demo-data/workout-program.js';

export function createMissionViews({ state, helpers: h, legacy, redraw, remember }) {
  const { esc, icon, btn, field, select, note, submit, card, empty, bodyFrame, mascotSvg, time, member, chatTranscript, chatComposer } = h;
  const ui = { wellbeingStep:0, medTab: 'cabinet', lockerId: null, binId: null, cabinetPage: 0, metric: 'co2',
    welcome: sessionStorage.getItem('pulse-welcome') === 'done' };
  const pill = (label, tone='cyan') => `<span class="status-pill ${tone}"><i></i>${esc(label)}</span>`;
  const heading = (eyebrow,title,action='') => `<div class="section-heading"><div><span class="eyebrow">${eyebrow}</span><h3>${title}</h3></div>${action}</div>`;
  const disclosure = (label,content,cls='') => `<details class="disclosure ${cls}"><summary>${label}</summary><div class="disclosure-body">${content}</div></details>`;
  const metricNames={co2:'Carbon dioxide',temperature:'Temperature',humidity:'Humidity',radiation:'Radiation'};
  const binsOf = locker => locker?.shelves.flatMap(s=>s.bins.map(b=>({...b,shelf:s.id}))) ?? [];
  const toneOf = reading => ({normal:'green',warning:'yellow',danger:'red','no-reading':'quiet'}[reading.state]??'quiet');
  const gauge = (label,value,unit,{fraction=1,color='cyan',caption='',link=''}={}) => {
    const missing=value===null||value===undefined||value==='—';
    const arc=435.6,amount=missing?0:Math.max(0,Math.min(1,fraction));
    return `<${link?'a':'div'} class="gauge-card ${color}" ${link?`href="${link}"`:''}><span class="gauge-label">${label}</span><div class="gauge-ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="gauge-track" cx="100" cy="100" r="78" pathLength="${arc+55}" stroke-dasharray="${arc} 55" transform="rotate(110 100 100)"/><circle class="gauge-value" style="opacity:${amount?1:0}" cx="100" cy="100" r="78" pathLength="${arc+55}" stroke-dasharray="${arc*amount} ${arc+55}" transform="rotate(110 100 100)"/></svg><span class="gauge-center"><b>${esc(missing?'—':value)}</b><small>${unit}</small></span></div><span class="gauge-caption">${caption||'Today’s check-in'}</span></${link?'a':'div'}>`;
  };
  function login() {
    const { CREW }=state();
    if(!ui.welcome) return `<div class="login mission-welcome"><div class="welcome-stars"></div><div class="welcome-content"><img class="team-logo" src="/assets/team-logo.png" alt="May the Pulse Be With You" width="420" height="420">${btn('Begin mission','ui-begin','','primary welcome-button')}</div></div>`;
    return `<div class="login mission-login"><div class="login-card"><div class="login-identity"><img class="login-team-logo" src="/assets/team-logo.png" alt="May the Pulse Be With You"><span class="eyebrow">PULSE / CREW HEALTH</span></div><h1 class="display">Welcome aboard.</h1><p class="muted">Choose a demo profile to continue.</p><div class="crew-pick">${CREW.map(c=>`<button class="crew-btn" data-action="login" data-id="${c.id}"><span class="avatar">${c.name.split(' ').map(x=>x[0]).join('')}</span><span><b>${c.name}</b><small>${c.title}</small></span>${icon('chev')}</button>`).join('')}</div><div class="login-roles">${btn('Medical officer','login-medical','','ghost sm')}${btn('Earth console','login-earth','','ghost sm')}</div><span class="subtle">Synthetic crew profiles · Demo access</span></div></div>`;
  }
  function home() {
    const {data,clock}=state(), row=data.today?.checkIn;
    const workouts=(data.workouts?.workouts??[]).filter(w=>w.missionDay===clock.missionDay);
    const pending=[];
    if(!row)pending.push('<a class="task-cue" href="#checkin"><i></i>Daily check-in</a>');
    if(!workouts.length&&getDailyWorkout(clock.missionDay).sessions.length)pending.push('<a class="task-cue" href="#fitness"><i></i>Training open</a>');
    return `<div class="overview-intro"><div class="task-cues">${pending.join('')}</div></div><div class="overview-grid"><div class="card anatomy-card"><div class="anatomy-stage">${bodyFrame('view')}</div>${clock.missionDay===42?`<div class="thermal-key"><span>Skin temperature <small>Simulated sensors</small></span><i></i><div><small>31 °C</small><small>33 °C</small><small>35 °C</small></div></div>`:''}</div><div class="gauge-grid">${gauge('Resting pulse',row?.restingHeartRateBpm,'bpm',{link:'#checkin'})}${gauge('Body temperature',row?.temperatureC,'°C',{color:'gold',link:'#checkin',caption:row?.temperatureC!=null?'Recorded today':'Not recorded'})}${gauge('Sleep',row?.sleepHours,'hours',{color:'cyan',link:'#checkin',caption:'In the last 24 hours'})}${gauge('Training',workouts.length,workouts.length===1?'session':'sessions',{color:workouts.length?'mint':'cyan',fraction:workouts.length?1:0,link:'#fitness',caption:workouts.length?'Logged today':'Ready when you are'})}</div></div>`;
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
    remember(input.form);
  }
  const draftKey=()=>`pulse-wellbeing-draft:${state().user?.crewId}:${state().clock?.missionDay}`;
  const extraDraft=()=>{try{return JSON.parse(sessionStorage.getItem(draftKey())??'{}');}catch{return {};}};
  const keepExtra=form=>{const values={...extraDraft(),...Object.fromEntries(new FormData(form))};sessionStorage.setItem(draftKey(),JSON.stringify(values));};
  function wellbeing() {
    const {data,drafts,user}=state();
    if(ui.wellbeingCrew!==user?.crewId){ui.wellbeingCrew=user?.crewId;ui.wellbeingStep=0;}
    const row=data.today?.checkIn,saved=!!row,step=ui.wellbeingStep;
    const core=k=>drafts['checkin-form']?.[k]??row?.[k]??'';
    const extras=extraDraft(),extra=k=>drafts['wellbeing-extra-form']?.[k]??extras[k]??'';
    const tabs=['Today','Focus','Crew','Support'];
    let content='';
    if(step===0)content=`<form id="checkin-form"><fieldset ${saved?'disabled':''} class="plain-fieldset">${rating('How was your mood?','mood',core('mood'),'Very low','Very good',saved)}${rating('How stressed did you feel?','stress',core('stress'),'Not at all','Extremely',saved)}${rating('How fatigued did you feel?','fatigue',core('fatigue'),'Not at all','Extremely',saved)}</fieldset></form>`;
    if(step===1||step===2)content=`<form id="wellbeing-extra-form">${EXTRA_QUESTIONS.slice((step-1)*3,step*3).map(q=>rating(q.prompt,q.id,extra(q.id),q.low,q.high,false)).join('')}</form>`;
    if(step===3)content=`<form id="wellbeing-extra-form"><div class="rating-group" data-rating="supportWanted"><div class="rating-title"><b>Would you like a private conversation with a support professional?</b></div><input type="hidden" name="supportWanted" value="${esc(extra('supportWanted'))}"><div class="support-choice">${['yes','no'].map(v=>btn(v==='yes'?'Yes':'No','ui-support-choice',`data-value="${v}" aria-pressed="${extra('supportWanted')===v}"`,'ghost')).join('')}</div></div></form><p class="draft-explainer">These seven additional answers are a demo draft, kept in this session. They are not saved to your health record or sent to anyone.</p>${saved?pill('Mood, stress & fatigue saved','green'):`<form id="checkin-form">${['mood','stress','fatigue'].map(k=>`<input type="hidden" name="${k}" value="${esc(core(k))}">`).join('')}${submit('Save check-in')}</form>`}`;
    return `<div class="card daily-form-card">${heading('DAILY WELLBEING','A moment for yourself',pill(step===0&&saved?'Saved today':step===0?'Daily check-in':'Session draft',step===0&&saved?'green':'quiet'))}<p class="wellbeing-recall">Think about the last 24 hours.</p><div class="wellbeing-steps" role="group" aria-label="Question sections">${tabs.map((label,i)=>btn(label,'ui-wellbeing-step',`data-id="${i}" aria-pressed="${i===step}"`,'ghost sm')).join('')}</div><span class="subtle question-progress">${step<3?`${step*3+1}–${step*3+3}`:'10'} of 10 questions</span>${content}<div class="wellbeing-navigation">${btn('Previous','ui-wellbeing-step',`data-id="${step-1}" ${step===0?'disabled':''}`,'ghost sm')}${step<3?btn('Next','ui-wellbeing-step',`data-id="${step+1}"`,'primary sm'):''}</div></div>`;
  }
  function checkin() {
    const {drafts,SYMPTOMS,selectedArea,stagedSymptoms}=state();
    return `<div class="daily-grid psychometric-layout"><div class="stack">${wellbeing()}${adviceCard()}</div><div class="card symptoms-card">${heading('SYMPTOMS','Where does it bother you?')}<div class="symptom-body">${bodyFrame('report')}</div><form id="symptom-form"><label class="field"><span>Symptom</span><select class="input" id="symptom-code" name="code" required>${symptomOptions(selectedArea).map(x=>`<option value="${esc(x.code)}">${esc(x.label)}${x.redFlag?' · urgent':''}</option>`).join('')}</select></label><label class="field severity-control"><span>Severity <b><output id="severity-value" aria-label="Selected severity">${drafts['symptom-form']?.severity??5}</output> / 10</b></span><input type="range" name="severity" aria-label="Severity" min="1" max="10" step="1" value="${drafts['symptom-form']?.severity??5}"><span class="range-ends"><small>1 · Mild</small><small>10 · Severe</small></span></label><div class="symptom-list">${stagedSymptoms.map((s,i)=>`<div class="status-line">${pill(`${SYMPTOMS.find(x=>x.code===s.code)?.label} · ${s.severity}/10`)}${btn('Remove','remove-symptom',`data-id="${i}"`,'ghost sm')}</div>`).join('')}</div>${note('A short note (optional)')}<div class="form-end">${submit('Send symptom report')}</div></form></div></div>`;
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
    const kind=bin.tier==='supply'?'pack':bin.tier==='emergency'?'injector':'bottle';
    return `<span class="medical-object ${kind} ${bin.tier==='controlled'?'controlled':''}" aria-hidden="true"><i></i><b></b></span>`;
  }
  function cabinet() {
    const {data,role}=state(),lockers=data.lockers?.lockers??[];
    const locker=lockers.find(l=>l.id===ui.lockerId)??lockers[0];
    if(!locker)return empty('Inventory is loading.');
    const bins=binsOf(locker),pages=Math.max(1,Math.ceil(bins.length/9));
    ui.lockerId=locker.id;ui.cabinetPage=Math.min(ui.cabinetPage,pages-1);
    let selected=bins.find(b=>b.compartmentId===ui.binId)??bins[ui.cabinetPage*9];
    ui.binId=selected?.compartmentId;
    const current=bins.slice(ui.cabinetPage*9,(ui.cabinetPage+1)*9);
    const doors=Array.from({length:9},(_,i)=>current[i]);
    return `<div class="cabinet-workspace"><div class="cabinet-column"><div class="locker-switch" role="group" aria-label="Cabinet">${lockers.map(l=>btn(`${l.id} <span>${esc(l.name.split('·').pop().trim())}</span>`,'ui-locker',`data-id="${l.id}" aria-pressed="${l.id===locker.id}"`,'ghost sm')).join('')}</div><div class="cabinet-housing"><div class="cabinet-ident"><b>PULSE <i>/</i> MED-${esc(locker.id.slice(1).padStart(2,'0'))}</b><span>${bins.length} COMPARTMENTS</span></div><div class="cabinet-recess"><div class="cabinet-grid">${doors.map(b=>b?`<button class="cabinet-door ${b.open?'door-open':''} ${b.compartmentId===ui.binId?'selected':''}" data-action="ui-bin" data-id="${b.compartmentId}" aria-pressed="${b.compartmentId===ui.binId}" aria-label="${esc(b.label)} · ${b.compartmentId} · ${b.open?'door open':b.locked?'restricted':'available'}"><span class="door-top"><b>${esc(b.compartmentId)}</b><i class="door-led ${b.open?'green':b.locked?'red':'cyan'}"></i></span><span class="door-window">${itemArt(b)}<i class="door-handle"></i></span><span class="door-label">${esc(b.label)}</span></button>`:`<div class="cabinet-door unused" aria-hidden="true"><span class="door-top"><b>—</b><i class="door-led"></i></span><span class="door-window"><span class="empty-bin">SPARE</span></span><span class="door-label">Unassigned</span></div>`).join('')}</div></div><div class="cabinet-base"><span><i></i> CABINET SIMULATOR</span><div>${btn('‹','ui-cabinet-page',`data-step="-1" aria-label="Previous compartments" ${ui.cabinetPage===0?'disabled':''}`,'ghost sm')}<b>${ui.cabinetPage+1} / ${pages}</b>${btn('›','ui-cabinet-page',`data-step="1" aria-label="Next compartments" ${ui.cabinetPage===pages-1?'disabled':''}`,'ghost sm')}</div></div></div><div class="cabinet-legend"><span><i class="cyan"></i>Selected</span><span><i class="green"></i>Open for collection</span><span><i class="red"></i>Restricted</span></div></div>${itemDetail(selected,role)}</div>`;
  }
  function itemDetail(b,role) {
    const {collection,data}=state();
    if(!b)return '';
    const part=collection?.status==='open'?collection.compartments.find(p=>p.compartmentId===b.compartmentId&&!p.scanned):null;
    const prescribed=(data.grants?.grants??[]).find(g=>g.status==='active'&&g.items.some(i=>i.itemId===b.itemId));
    const dose=prescribed?.items.find(i=>i.itemId===b.itemId);
    const tier={'self-care':'Self-care',prescription:'Medical officer approval',controlled:'Earth approval',emergency:'Emergency access',supply:'Crew supply'}[b.tier]??b.tier;
    let actions='';
    if(role==='crew') {
      if(b.open&&part)actions=`<div class="ready-note">${pill('Door open','green')}<span>${part.units} unit(s) ready</span></div>${btn('Confirm collection','scan-item',`data-id="${b.compartmentId}"`,'primary')}${btn('Cancel remaining batch','cancel-collection','','ghost sm')}`;
      else if(b.why?.startsWith('Allergy:'))actions=`<button type="button" class="btn ghost" disabled>Unavailable for this profile</button>`;
      else if(prescribed)actions=`<div class="ready-note">${pill('Prescription on file','quiet')}<span>${dose.units} unit(s) · ${dose.perDay}/day</span>${dose.nextDue?`<small>Next ${time(dose.nextDue)}</small>`:''}</div>${dose.status==='due'?btn('Collect due items','collect-grant',`data-id="${prescribed.id}"`,'primary'):btn('View prescription','ui-med-tab','data-id="courses"','ghost')}`;
      else if(b.tier==='emergency')actions=btn('Open emergency access','ui-med-tab','data-id="emergency"','ghost');
      else actions=`<form id="item-${b.itemId}" data-item="${b.itemId}">${b.locked?note('Request note (optional)'):field('Quantity','units',{type:'number',value:1,attrs:'min="1" max="9" step="1"',required:true})}<button class="btn primary" name="intent" value="${b.locked?'request':'collect'}" type="submit">${b.locked?'Request approval':'Collect item'}</button></form>`;
    }
    return `<aside class="card item-detail">${heading('SELECTED COMPARTMENT',esc(b.compartmentId),pill(b.open?'Door open':b.locked?'Restricted':'Available',b.open?'green':b.locked?'red':'cyan'))}<div class="detail-title"><h2>${esc(b.label)}</h2><div class="detail-art">${itemArt(b)}</div></div><dl class="item-facts"><div><dt>Available</dt><dd>${b.units} unit(s)</dd></div><div><dt>Access</dt><dd>${esc(tier)}</dd></div><div><dt>Location</dt><dd>${esc(b.compartmentId)}</dd></div></dl>${b.why?`<p class="access-reason">${icon('lock')}${esc(b.why)}</p>`:''}<div class="item-actions">${actions}</div></aside>`;
  }
  function medbay() {
    const {role,data}=state();
    if(role==='earth')return `<div class="stack">${legacy.requestsPanel()}<a class="btn primary" href="#earth">Open Earth console</a></div>`;
    const tabs=[['cabinet','Cabinet'],['courses','Prescriptions'],['activity','Activity'],['profile','Allergies']];
    const content={cabinet:()=>`${collectionStrip()}${cabinet()}${role==='medical_officer'?disclosure('Stock watch',legacy.stockPanel(),'card compact'):''}`,courses:()=>`<div class="two">${role==='crew'?importCard():legacy.requestsPanel()}<div class="stack">${legacy.grantsPanel()}${role==='crew'?legacy.requestsPanel():''}</div></div>`,activity:()=>legacy.dosesPanel(),profile:()=>legacy.profilePanel(),emergency:()=>legacy.emergencyPanel()};
    return `${role==='medical_officer'?legacy.patientPicker():''}${ui.medTab!=='cabinet'?collectionStrip():''}<div class="med-toolbar"><div class="page-tabs" role="group" aria-label="Medical bay sections">${tabs.map(([id,label])=>btn(label,'ui-med-tab',`data-id="${id}" aria-pressed="${ui.medTab===id}"`,'ghost sm')).join('')}</div>${btn(`${icon('shield')} Emergency`,'ui-med-tab',`data-id="emergency" aria-pressed="${ui.medTab==='emergency'}"`,'emergency-button sm')}</div>${(content[ui.medTab]??content.cabinet)()}`;
  }
  function drawChart(points,{unit='',elapsed=false,limits=null}={}) {
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
    const label=t=>elapsed?`${Math.round(t)}s`:new Date(t).toISOString().slice(11,16);
    return `<svg class="mission-chart" viewBox="0 0 680 202" role="img" aria-label="${esc(unit)} measurements"><g>${[0,1,2,3].map(i=>{const v=min+(max-min)*i/3;return `<line x1="48" y1="${y(v)}" x2="646" y2="${y(v)}"/><text x="38" y="${y(v)+4}" text-anchor="end">${v>=100?Math.round(v):v.toFixed(1)}</text>`;}).join('')}</g>${thresholds.map(([l,v])=>`<line class="chart-threshold" x1="48" y1="${y(v)}" x2="646" y2="${y(v)}"/><text class="threshold-caption" x="54" y="${y(v)-6}">${l} ${v}</text>`).join('')}<path d="${d}"/><circle class="chart-endpoint" cx="${x(valueTime(valid.at(-1)))}" cy="${y(valid.at(-1)[1])}" r="4"/>${[xs[0],xs.at(-1)].map((t,i)=>`<text x="${i?646:48}" y="194" text-anchor="${i?'end':'start'}">${label(t)}${!elapsed?' UTC':''}</text>`).join('')}</svg>`;
  }
  function habitat() {
    const {data}=state();
    const readings=data.env?.readings??[],selected=readings.find(r=>r.metric===ui.metric)??readings[0];
    const history=data.histories?.[selected?.metric],alerts=data.alerts?.alerts??[];
    return `<div class="habitat-metrics">${readings.map(r=>`<button class="habitat-reading ${r.metric===ui.metric?'selected':''}" data-action="ui-metric" data-id="${r.metric}" aria-pressed="${r.metric===ui.metric}"><span>${metricNames[r.metric]}</span><b>${r.value==null?'—':Number(r.value).toFixed(r.metric==='co2'?0:1)}<small>${esc(r.unit)}</small></b>${pill(r.state==='no-reading'?'No reading':r.state,toneOf(r))}</button>`).join('')}</div><div class="habitat-workspace"><div class="card habitat-plot">${heading('CABIN ENVIRONMENT',metricNames[selected?.metric]??'Readings',pill('Historical replay','quiet'))}<div class="plot-caption"><span>Last 24 mission hours</span><span>${esc(selected?.unit??'')}</span></div>${drawChart(history?.points??[],{unit:history?.unit,limits:history?.limits})}<div class="plot-footer"><span>${esc(history?.source?.label??'Source unavailable')}</span>${disclosure('Source details',`<p>Source time: ${esc(selected?.source?.sourceTime)}</p><p>Measured: ${time(selected?.measuredAt)}</p><p>Data gaps remain empty. Cabin thresholds are illustrative.</p>`)}</div></div><div class="card alert-card">${heading('RECENT EVENTS','Cabin alerts',pill(data.env?.openAlerts?.length?`${data.env.openAlerts.length} open`:'No open alerts',data.env?.openAlerts?.length?'yellow':'green'))}${alerts.map(a=>`<div class="alert-item"><div>${icon('wind')}<span><b>${metricNames[a.metric]}</b><small>${a.recoveredAt?'Recovered '+time(a.recoveredAt):'Opened '+time(a.openedAt)}</small></span>${pill(a.recoveredAt?'Recovered':a.level,a.recoveredAt?'green':'yellow')}</div>${disclosure('Event details',`<dl class="item-facts"><div><dt>Opened</dt><dd>${time(a.openedAt)}</dd></div><div><dt>Peak</dt><dd>${Number(a.peak).toFixed(0)} · ${esc(a.peakLevel??a.level)}</dd></div></dl>`)}</div>`).join('')||empty('Nothing to review in this period.')}</div></div>`;
  }
  function workoutReadout(s) {
    const {replay,workoutMode}=state();
    let points=[];
    if(workoutMode==='stage'&&s.sessionId&&replay){
      points=replay.points.filter(([t])=>t<=s.elapsedSeconds).map(p=>[...p]);
      if(s.status==='active'&&s.heartRate.bpm!=null&&s.elapsedSeconds<=replay.points.at(-1)[0]&&points.at(-1)?.[0]!==s.elapsedSeconds)points.push([s.elapsedSeconds,s.heartRate.bpm]);
    }
    return `<div class="training-live-grid"><div class="pulse-display"><div class="section-heading"><h3>Exercise pulse</h3>${pill(s.heartRate.source?.includes('replayed')?'Synthetic replay':s.heartRate.bpm==null?'No sensor':'Measured',s.heartRate.bpm==null?'quiet':'cyan')}</div><div class="pulse-value">${s.heartRate.bpm??'—'}<span>bpm</span></div>${drawChart(points,{unit:'bpm',elapsed:true})}</div><div class="training-progress">${gauge('Session progress',s.totalSteps?`${s.completed.length}/${s.totalSteps}`:'Ready',s.totalSteps?'exercises':'to begin',{fraction:s.totalSteps?s.completed.length/s.totalSteps:0,color:'mint',caption:`${Math.floor(s.elapsedSeconds/60)}:${String(s.elapsedSeconds%60).padStart(2,'0')} elapsed`})}${pill(s.status==='active'?'In progress':s.status,s.status==='completed'?'green':'quiet')}${s.interval?`<small>Round ${s.interval.round} · ${s.interval.phase}<br>${s.interval.remainingSeconds}s remaining</small>`:''}${s.recoveryReady?pill('Recovery ready','quiet'):''}${s.saveStatus==='saving'?pill('Saving…','quiet'):''}</div></div>`;
  }
  function fitness() {
    const {workout,clock,workoutMode,data}=state(),s=workout?.snapshot(clock.now);
    if(!s)return empty('Loading your program…');
    const step=s.currentStep,unresolved=['pending','failed','saving'].includes(s.saveStatus);
    const mode=`<select class="input compact-select" id="workout-mode" aria-label="Training program" ${s.status==='active'||unresolved?'disabled':''}><option value="weekly" ${workoutMode==='weekly'?'selected':''}>Mars transit program</option><option value="stage" ${workoutMode==='stage'?'selected':''}>Stage demo · synthetic pulse</option></select>`;
    const dayStart=clock.missionDay-(clock.missionDay%7);
    return `<div class="training-toolbar"><div class="week-strip" aria-label="Training week">${Array.from({length:7},(_,i)=>{const day=getDailyWorkout(dayStart+i);return `<span class="${day.dayOfWeek===s.day.dayOfWeek?'today':''}" title="${esc(day.label)}"><small>D${i+1}</small><b>${i===6?'Rest':i%2===0?'Strength':'Rowing'}</b></span>`;}).join('')}</div>${mode}</div><div class="exercise-workspace"><div class="card anatomy-card exercise-anatomy">${heading('TRAINING','Move with purpose')}<div class="anatomy-stage">${bodyFrame('view')}</div><div class="anatomy-caption"><span>Mission day ${clock.missionDay}</span><span>Drag to rotate</span></div></div><div class="stack"><div class="card live-training-card"><div id="workout-live">${workoutReadout(s)}</div>${step?`<div class="current-exercise">${heading('CURRENT EXERCISE',esc(step.label),pill(`${s.completed.length+1} of ${s.totalSteps}`,'quiet'))}${disclosure('Instructions',`<p>${esc(step.instruction)}</p>${step.targetHeartRateBpm?`<p>Assigned reference: ${step.targetHeartRateBpm.join('–')} bpm</p>`:''}`)}<form id="workout-step" data-step="${step.id}"><div class="form-end">${step.kind==='resistance'?field('Repetitions completed','reps',{type:'number',value:step.sets?step.sets*step.repsPerSet:25,attrs:'min="0" max="1000000" step="1"',required:true}):'<span></span>'}${submit('Complete exercise')}</div></form>${btn('End session','workout-stop','','ghost sm')}</div>`:''}${unresolved&&s.saveStatus!=='saving'?`<div class="session-save">${pill(s.status==='completed'?'Session complete':'Session ended','green')}<p>Save your workout.</p><div class="btn-row">${btn('Save summary','workout-save','','primary')}${btn('Save with recovery','workout-recovery','','ghost')}${btn('Dismiss','workout-skip','','ghost sm')}</div></div>`:''}${s.saveStatus==='saved'?`<div class="saved-banner">${icon('check')} Summary saved</div>`:''}</div><div class="card program-card">${heading(`DAY ${s.day.dayOfWeek} / 7`,esc(s.day.label))}${s.day.sessions.map(session=>`<div class="program-session"><div><span class="row-icon">${icon('workout')}</span><span class="grow"><h4>${esc(session.label)}</h4><small>${session.steps.length} exercises${session.recommendedMinutesAfterResistance?' · 4–6 h after resistance':''}</small></span>${['ready','completed','stopped'].includes(s.status)&&!unresolved&&!s.outcomes.some(o=>o.sessionId===session.id)?btn('Start','workout-start',`data-id="${session.id}"`,'primary sm'):''}</div>${disclosure('View exercises',`${session.preparation?`<p>${esc(session.preparation)}</p>`:''}<div class="exercise-checklist">${session.steps.map(st=>`<div><span class="check ${s.sessionId===session.id&&s.completed.some(c=>c.stepId===st.id)?'on':''}">${s.sessionId===session.id&&s.completed.some(c=>c.stepId===st.id)?icon('check'):''}</span><span><b>${esc(st.label)}</b><small>${st.sets?`${st.sets} × ${st.repsPerSet} reps · ${st.restBetweenSetsSeconds/60} min rest`:st.durationSeconds?`${st.durationSeconds<60?`${st.durationSeconds}s`:`${Math.round(st.durationSeconds/60)} min`}`:esc(st.equipment)}</small><small>${esc(st.equipment)} · ${esc(st.instruction)}</small></span></div>`).join('')}</div>`)}</div>`).join('')||empty('A recovery day. No scheduled session.')}</div>${disclosure('Saved sessions',`<div class="activity-list">${(data.workouts?.workouts??[]).map(w=>`<div><span class="row-icon">${icon('check')}</span><span><b>${esc(w.kind)}</b><small>${time(w.endedAt)} · ${w.reps} reps</small><small>Average ${w.avgHeartRateBpm} · Peak ${w.peakHeartRateBpm} bpm${w.recoveryHeartRateBpm!=null?` · Recovery ${w.recoveryHeartRateBpm} bpm`:''}</small><small>${esc(w.heartRateSource)}</small></span></div>`).join('')||empty('No saved sessions.')}</div>`,'card')}${disclosure('Demo controls',legacy.demoClockPanel(),'demo-controls')}</div></div>`;
  }
  function mind() {
    const {data}=state();
    return `<div class="wellbeing-workspace"><div class="card companion-chat-card"><div class="chat-head"><span class="mascot-md">${mascotSvg()}</span><span class="grow"><span class="eyebrow">YOUR COMPANION</span><h3>A little company, anywhere.</h3></span>${pill('Offline','quiet')}</div><div class="thread mind-thread" data-chat-thread aria-live="polite" aria-relevant="additions text">${chatTranscript()}</div><div class="support-topics" aria-label="Conversation starters">${btn('Sleep & energy','support-prompt','data-topic="sleep"','ghost sm')}${btn('Stress & mood','support-prompt','data-topic="stress"','ghost sm')}${btn('Missing home','support-prompt','data-topic="home"','ghost sm')}</div>${chatComposer('mind-chat-form','Type a message')}<span class="subtle companion-caption">Offline support demo</span></div><div class="stack"><div class="card journal-card">${heading('JUST FOR YOU','Private journal',pill('Only you','quiet'))}<form id="journal-form">${note('What is on your mind?','text',5000)}<div class="form-end"><span class="subtle">A space to pause.</span>${submit('Save entry')}</div></form>${(data.journal?.entries??[]).slice(0,2).map(e=>`<div class="journal-entry"><small>${time(e.recordedAt)}</small><p>${esc(e.text)}</p></div>`).join('')}${(data.journal?.entries?.length??0)>2?disclosure('Earlier entries',data.journal.entries.slice(2).map(e=>`<div class="journal-entry"><small>${time(e.recordedAt)}</small><p>${esc(e.text)}</p></div>`).join('')):''}</div>${disclosure('Private support & demo information','<p>Your journal is visible only to you in this demo. Psychologist messaging is not connected.</p><p>The companion uses your current check-in and synthetic mission history. It is an offline support tool, not a trained model.</p>','card support-info')}</div></div>`;
  }
  const refreshWellbeing=(scroll=false)=>{const card=document.querySelector('.daily-form-card');if(card)card.outerHTML=wellbeing();if(scroll)document.querySelector('.daily-form-card')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  function action(el) {
    const name=el.dataset.action,id=el.dataset.id;
    if(name==='ui-begin'){ui.welcome=true;sessionStorage.setItem('pulse-welcome','done');redraw();return;}
    if(name==='ui-help'){$help().hidden=!$help().hidden;return;}
    if(name==='ui-wellbeing-step'){ui.wellbeingStep=Math.max(0,Math.min(3,Number(id)));refreshWellbeing(true);return;}
    if(name==='ui-support-choice'){const input=el.closest('form').elements.supportWanted;input.value=el.dataset.value;remember(input.form);keepExtra(input.form);refreshWellbeing();return;}
    if(name==='ui-rating'){
      const group=el.closest('[data-rating]'),input=group.querySelector('input');input.value=el.dataset.value;
      group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));
      group.querySelector('.rating-title span').textContent=`${input.value} / 10`;remember(input.form);if(input.form.id==='wellbeing-extra-form')keepExtra(input.form);return;
    }
    if(name==='ui-med-tab')ui.medTab=id;
    if(name==='ui-locker'){ui.lockerId=id;ui.cabinetPage=0;ui.binId=null;}
    if(name==='ui-bin')ui.binId=id;
    if(name==='ui-cabinet-page'){ui.cabinetPage+=Number(el.dataset.step);ui.binId=null;}
    if(name==='ui-metric')ui.metric=id;
    redraw();
  }
  const $help=()=>document.getElementById('help-panel');
  return {screens:{login,home,checkin,medbay,habitat,fitness,mind},action,workoutReadout,selectArea};
}
