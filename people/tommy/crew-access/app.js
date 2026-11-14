'use strict';

const app = document.querySelector('#app');
const announcement = document.querySelector('#announcement');
const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="m14 6-6 6 6 6M8 12h12"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3 3.8M6.4 6.4A21 21 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.3-1.4M10 10a3 3 0 0 0 4 4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/><path d="M4 12h4l2-4 3 8 2-4h5"/>',
  mind: '<path d="M9 18H7a4 4 0 0 1-3-6 4 4 0 0 1 2-7 3 3 0 0 1 6-1v16a2 2 0 0 1-4 0v-2m7 0h2a4 4 0 0 0 3-6 4 4 0 0 0-2-7 3 3 0 0 0-6-1v16a2 2 0 0 0 4 0v-2M8 9l4 2m4-2-4 2"/>',
  orbit: '<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-35 12 12)"/><circle cx="19" cy="5" r="1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  logout: '<path d="M9 4H5v16h4m5-13 5 5-5 5m-4-5h9"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.orbit}</svg>`;
const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user = null;
let demoMode = false;
let draft = {};
let healthDraft = {};
let serverAvailable = true;

async function api(path, data) {
  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {'Content-Type': 'application/json', 'X-Pulse-Request': '1'},
      credentials: 'same-origin',
      ...(data === undefined ? {} : {body: JSON.stringify(data)}),
    });
  } catch {
    throw new Error('Cannot reach the local app. Check that the preview server is running and try again.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || 'Something went wrong. Please try again.');
    error.fields = result.fields;
    throw error;
  }
  return result;
}

function logo(extraClass = '') {
  return `<div class="logo-stage ${extraClass}"><img class="team-logo" src="assets/team-logo.png" width="1254" height="1254" alt="May the Pulse Be With You — a cyan heartbeat inside a gold orbit"><span class="logo-caption">A LITTLE CLOSER TO HOME</span></div>`;
}

function startView() {
  return `<section class="landing fade-in">${logo()}<div class="landing-copy"><div class="eyebrow">FOR THE HUMAN BEHIND THE MISSION</div><h1>Your health.<br>In good <span>orbit.</span></h1><p class="intro">Far from Earth. Never far from yourself.<br>Your crew health companion for the long journey ahead.</p><button class="primary start-button" data-go="${user ? 'welcome' : 'login'}">${user ? 'Continue' : 'Start'} ${svg('arrow')}</button><p class="start-note">One small step. A space that’s yours.</p><div class="feature-rail"><div>${svg('heart')}Physical health</div><div>${svg('mind')}Mental wellbeing</div><div>${svg('orbit')}Mission life</div></div></div></section>`;
}

function field({name, label, type = 'text', value = '', placeholder = '', autocomplete = '', hint = '', optional = false, unit = '', min, max, maxlength = 60}) {
  const password = type === 'password';
  const hintId = hint ? `${name}-hint ` : '';
  return `<div class="field"><label for="${name}">${label}${optional ? '<span class="optional">(optional)</span>' : ''}</label><div class="control"><input id="${name}" name="${name}" type="${type}" value="${escape(value)}" placeholder="${escape(placeholder)}" ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${optional ? '' : 'required'} ${min === undefined ? '' : `min="${min}"`} ${max === undefined ? '' : `max="${max}"`} ${type === 'number' ? 'step="any" inputmode="decimal"' : `maxlength="${maxlength}"`} aria-describedby="${hintId}${name}-error" class="${password ? 'password-input' : ''} ${unit ? 'with-unit' : ''}">${password ? `<button class="password-toggle" type="button" data-toggle="${name}" aria-label="Show ${label.toLowerCase()}" aria-pressed="false">${svg('eye')}</button>` : ''}${unit ? `<span class="unit">${unit}</span>` : ''}</div>${hint ? `<p class="hint" id="${name}-hint">${hint}</p>` : ''}<p class="field-error" id="${name}-error"></p></div>`;
}

function steps(health = false) {
  return `<div class="steps" aria-label="Step ${health ? '2 of 2: health baseline' : '1 of 2: your account'}"><span class="step ${health ? 'done' : 'current'}"><b>${health ? '✓' : '1'}</b>Your account</span><span class="step-line"></span><span class="step ${health ? 'current' : ''}"><b>2</b>Health baseline</span></div>`;
}

function authLayout(view) {
  const signup = view.startsWith('signup');
  const health = view === 'signup-health';
  return `<section class="auth fade-in"><aside class="auth-aside">${logo()}<div class="aside-copy"><h2>A long way from Earth.<br><span>A little closer to you.</span></h2><p>One place for your physical health, mental wellbeing, and everyday life on the mission.</p><div class="orbit-line">${svg('orbit')} MADE FOR THE JOURNEY. BUILT AROUND YOU.</div></div></aside><div class="auth-panel"><button class="back" data-action="${health ? 'back-account' : 'back-start'}">${svg('back')}${health ? 'Back to your account' : 'Back to start'}</button><nav class="tabs" aria-label="Account access"><button class="tab ${signup ? '' : 'active'}" data-go="login" ${signup ? '' : 'aria-current="page"'}>Log in</button><button class="tab ${signup ? 'active' : ''}" data-go="signup-account" ${signup ? 'aria-current="page"' : ''}>Sign up</button></nav>${health ? healthView() : signup ? accountView() : loginView()}</div></section>`;
}

function loginView() {
  return `<h1 class="form-heading" tabindex="-1">Welcome back,<br>crew member.</h1><p class="form-description">Your next chapter starts with you. Let’s check in.</p><form id="login-form" novalidate><div class="form-fields">${field({name:'username',label:'Username',placeholder:'Your crew username',autocomplete:'username',maxlength:24})}${field({name:'password',label:'Password',type:'password',placeholder:'Enter your password',autocomplete:'current-password',maxlength:128})}</div><div class="form-message" id="form-message" role="alert">${serverAvailable ? '' : 'The local server is unavailable. You can still explore the demo below.'}</div><button class="primary submit" type="submit">Log in ${svg('arrow')}</button></form><p class="form-bottom">New to the crew? <button class="text-button" data-go="signup-account">Create an account</button></p><div class="demo-divider">JUST TAKING A LOOK?</div><button class="secondary demo-button" data-action="demo">${svg('orbit')}Explore with a demo profile</button><p class="prototype-note">${svg('lock')}Local prototype. Use sample details when trying it out.</p>`;
}

function accountView() {
  return `${steps()}<h1 class="form-heading" tabindex="-1">Your place<br>in the crew.</h1><p class="form-description">First, a few details to make this space yours.</p><form id="account-form" novalidate><div class="form-fields"><div class="form-row">${field({name:'firstName',label:'First name',value:draft.firstName,placeholder:'First name',autocomplete:'given-name'})}${field({name:'lastName',label:'Last name',value:draft.lastName,placeholder:'Last name',autocomplete:'family-name'})}</div>${field({name:'username',label:'Username',value:draft.username,placeholder:'Choose a crew username',autocomplete:'username',hint:'3–24 letters, numbers, or underscores.',maxlength:24})}${field({name:'password',label:'Password',type:'password',value:draft.password,placeholder:'Create a password',autocomplete:'new-password',hint:'Use at least 8 characters. Keep it unique.',maxlength:128})}${field({name:'confirmPassword',label:'Confirm password',type:'password',value:draft.confirmPassword,placeholder:'Enter your password again',autocomplete:'new-password',maxlength:128})}</div><div class="form-message" id="form-message" role="alert"></div><button class="primary submit" type="submit">Continue to health profile ${svg('arrow')}</button></form><p class="form-bottom">Already part of the crew? <button class="text-button" data-go="login">Log in</button></p>`;
}

function healthView() {
  const bloodTypes = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];
  return `${steps(true)}<h1 class="form-heading" tabindex="-1">Start with<br>your baseline.</h1><p class="form-description">A simple health profile. A starting point for a more personal experience.</p><form id="health-form" novalidate><div class="form-fields"><div class="health-grid">${field({name:'age',label:'Age',type:'number',value:healthDraft.age,placeholder:'e.g. 35',unit:'yr',min:1,max:120})}${field({name:'height',label:'Height',type:'number',value:healthDraft.height,placeholder:'178',unit:'cm',min:30,max:300})}${field({name:'weight',label:'Weight',type:'number',value:healthDraft.weight,placeholder:'74',unit:'kg',min:1,max:500})}</div><div class="field"><label for="bloodType">Blood type <span class="optional">(optional)</span></label><select id="bloodType" name="bloodType"><option value="">Not sure / prefer not to say</option>${bloodTypes.map(t=>`<option value="${t}" ${healthDraft.bloodType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="field"><label for="allergies">Allergies or relevant health notes <span class="optional">(optional)</span></label><textarea id="allergies" name="allergies" rows="3" maxlength="500" placeholder="Anything you would like in your baseline profile…" aria-describedby="allergies-hint">${escape(healthDraft.allergies)}</textarea><p class="hint" id="allergies-hint">You can leave this blank. Up to 500 characters.</p></div></div><div class="privacy-line">${svg('lock')}For this prototype, your profile stays on this computer. Please use sample health details.</div><div class="form-message" id="form-message" role="alert"></div><button class="primary submit" type="submit">Create account ${svg('arrow')}</button></form><p class="form-bottom">Step 2 of 2. Your orbit starts here.</p>`;
}

function welcomeView() {
  const p = user.profile;
  return `<section class="welcome fade-in"><div class="welcome-top"><div class="eyebrow">${demoMode ? 'EXPLORING THE DEMO' : 'CREW PROFILE READY'}</div><button class="secondary" data-action="logout">${svg('logout')}${demoMode ? 'Leave demo' : 'Log out'}</button></div><h1 tabindex="-1">You’re in good orbit,<br><span>${escape(user.firstName)}.</span></h1><p class="welcome-description">Welcome aboard. Your profile is the first step toward a health companion that understands your journey.</p><div class="profile-card"><div class="card-heading"><span class="eyebrow">YOUR STARTING POINT</span>${demoMode ? '<span class="sample-pill">SAMPLE DATA</span>' : '<span class="hint">Baseline profile</span>'}</div><div class="profile-identity"><div class="avatar" aria-hidden="true">${escape(user.firstName.slice(0,1).toUpperCase())}</div><div><strong>${escape(user.firstName)} ${escape(user.lastName)}</strong><small>@${escape(user.username)}</small></div></div><dl class="baseline"><div><dt>Age</dt><dd>${escape(p.age)}<span>years</span></dd></div><div><dt>Height</dt><dd>${escape(p.height)}<span>cm</span></dd></div><div><dt>Weight</dt><dd>${escape(p.weight)}<span>kg</span></dd></div><div><dt>Blood type</dt><dd>${escape(p.bloodType || '—')}</dd></div></dl>${p.allergies ? `<p class="profile-extra"><strong>Health notes</strong><br>${escape(p.allergies)}</p>` : ''}</div><div class="next-chapter">${svg('orbit')}<div><strong>This is where your journey begins.</strong>Physical health, mental wellbeing, and mission life are the next chapters. This first prototype covers crew access and your baseline profile.</div></div></section>`;
}

function route() {
  let view = location.hash.slice(1) || 'start';
  if (view === 'signup-health' && !draft.username) view = 'signup-account';
  if (view === 'welcome' && !user) view = 'login';
  if (!['start','login','signup-account','signup-health','welcome'].includes(view)) view = 'start';
  if (view === 'start' || view === 'login') { draft = {}; healthDraft = {}; }
  app.innerHTML = view === 'start' ? startView() : view === 'welcome' ? welcomeView() : authLayout(view);
  document.title = `${view === 'start' ? 'May the Pulse Be With You' : view === 'welcome' ? 'Your orbit' : view.startsWith('signup') ? 'Join the crew' : 'Welcome back'} · Crew health`;
  const heading = app.querySelector('h1');
  if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
  window.scrollTo(0,0);
}

function go(view) {
  if (view === 'login' || view === 'start') { draft = {}; healthDraft = {}; }
  if (location.hash === `#${view}`) route();
  else location.hash = view;
}

function showErrors(errors) {
  let first;
  for (const [name, message] of Object.entries(errors)) {
    const input = document.getElementById(name);
    const error = document.getElementById(`${name}-error`);
    if (input && error) { input.setAttribute('aria-invalid','true'); error.textContent = message; first ||= input; }
  }
  if (first) { first.focus(); announcement.textContent = 'Please check the highlighted fields.'; }
}

function accountErrors(data) {
  const errors = {};
  if (!data.firstName?.trim()) errors.firstName = 'Enter your first name.';
  if (!data.lastName?.trim()) errors.lastName = 'Enter your last name.';
  if (!/^[A-Za-z0-9_]{3,24}$/.test(data.username || '')) errors.username = 'Use 3–24 letters, numbers, or underscores.';
  if ((data.password || '').length < 8) errors.password = 'Use at least 8 characters.';
  if (!data.confirmPassword || data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords must match.';
  return errors;
}

function healthErrors(data) {
  const errors = {};
  for (const [key,min,max,label] of [['age',1,120,'age'],['height',30,300,'height'],['weight',1,500,'weight']]) {
    const value = Number(data[key]);
    if (!data[key] || !Number.isFinite(value) || value < min || value > max || (key === 'age' && !Number.isInteger(value))) errors[key] = `Enter ${label} from ${min} to ${max}${key === 'age' ? ' (whole years)' : ''}.`;
  }
  return errors;
}

app.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.go) { go(button.dataset.go); return; }
  if (button.dataset.toggle) {
    const input = document.getElementById(button.dataset.toggle);
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.setAttribute('aria-pressed',String(visible));
    const label = document.querySelector(`label[for="${input.id}"]`).textContent;
    button.setAttribute('aria-label',`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`);
    button.innerHTML = svg(visible ? 'eyeOff' : 'eye');
    return;
  }
  const action = button.dataset.action;
  if (action === 'back-start') go('start');
  if (action === 'back-account') {
    healthDraft = Object.fromEntries(new FormData(document.querySelector('#health-form')));
    go('signup-account');
  }
  if (action === 'demo') {
    demoMode = true;
    draft = {}; healthDraft = {};
    user = {firstName:'Alex',lastName:'Morgan',username:'demo_crew',profile:{age:35,height:178,weight:74,bloodType:'O+',allergies:''}};
    go('welcome');
  }
  if (action === 'logout') {
    button.disabled = true;
    try {
      if (!demoMode) await api('logout',{});
      user = null; demoMode = false; go('login');
    } catch (error) { announcement.textContent = error.message; button.disabled = false; button.insertAdjacentHTML('afterend',`<p class="field-error" role="alert">${escape(error.message)}</p>`); }
  }
});

app.addEventListener('input', event => {
  const name = event.target.name;
  if (!name) return;
  event.target.removeAttribute('aria-invalid');
  const message = document.getElementById(`${name}-error`);
  if (message) message.textContent = '';
  const general = document.getElementById('form-message');
  if (general) general.textContent = '';
});

app.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  if (form.id === 'account-form') {
    const errors = accountErrors(data);
    if (Object.keys(errors).length) return showErrors(errors);
    draft = {...data,firstName:data.firstName.trim(),lastName:data.lastName.trim(),username:data.username.trim()};
    go('signup-health'); return;
  }
  let errors = {};
  if (form.id === 'health-form') errors = healthErrors(data);
  if (form.id === 'login-form') {
    data.username = data.username.trim();
    if (!data.username.trim()) errors.username = 'Enter your username.';
    if (!data.password) errors.password = 'Enter your password.';
  }
  if (Object.keys(errors).length) return showErrors(errors);
  const submit = form.querySelector('[type="submit"]');
  const original = submit.innerHTML;
  submit.disabled = true; submit.textContent = form.id === 'health-form' ? 'Creating your account…' : 'Logging in…';
  form.setAttribute('aria-busy','true');
  try {
    const result = form.id === 'health-form' ? await api('signup',{...draft,profile:{...data,age:Number(data.age),height:Number(data.height),weight:Number(data.weight)}}) : await api('login',data);
    user = result.user; demoMode = false; draft = {}; healthDraft = {}; serverAvailable = true;
    form.querySelectorAll('input[type="password"],input[autocomplete="new-password"]').forEach(input => {input.value = '';});
    announcement.textContent = form.id === 'health-form' ? 'Account created. Welcome aboard.' : 'Logged in successfully.';
    go('welcome');
  } catch (error) {
    if (error.fields && form.id === 'health-form' && Object.keys(error.fields).some(k => ['username','firstName','lastName','password','confirmPassword'].includes(k))) {
      healthDraft = data;
      history.replaceState(null,'','#signup-account');
      route();
    }
    showErrors(error.fields || {});
    const message = document.getElementById('form-message');
    if (message) message.textContent = error.message;
  } finally {
    if (submit.isConnected) {submit.disabled = false; submit.innerHTML = original; form.removeAttribute('aria-busy');}
  }
});

window.addEventListener('hashchange',route);
window.addEventListener('pageshow',event => {if (event.persisted) location.reload();});
(async function init() {
  try { const result = await api('session'); user = result.user; }
  catch { serverAvailable = false; }
  if (user && !location.hash) location.hash = 'welcome';
  else route();
})();
