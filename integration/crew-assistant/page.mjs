const checkInForm = document.querySelector('#check-in');
const checkInStatus = document.querySelector('#check-in-status');
const exampleButton = document.querySelector('#load-example');
const saveButton = document.querySelector('#save-check-in');
const compareButton = document.querySelector('#compare-button');
const compareStatus = document.querySelector('#compare-status');
const results = document.querySelector('#results');
const todayReplies = document.querySelector('#today-replies');
const historyReplies = document.querySelector('#history-replies');
const inputNames = {
  sleep_hours: 'sleepHours', resting_heart_rate_bpm: 'restingHeartRateBpm',
  mood: 'mood', stress: 'stress', fatigue: 'fatigue',
};

async function request(path, data) {
  const response = await fetch(`/api/crew-assistant/${path}`, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'The request failed.');
  return result;
}

function fill(values) {
  for (const key of Object.keys(inputNames)) checkInForm.elements[key].value = values[key] ?? '';
}

function showSaved(values) {
  fill(values);
  for (const element of checkInForm.elements) element.disabled = true;
  checkInStatus.textContent = 'Saved for mission day 42. Skipped fields remain missing.';
  compareButton.disabled = false;
}

function drawHealth({ baselineDays, health }) {
  document.querySelector('#health-source').textContent =
    `PET-1 synthetic history · Reference median across ${baselineDays} days · Earlier observations through day 41`;
  health.sleep_hours.recent.forEach((day, i) => {
    document.querySelector(`#past-${i + 1}`).textContent = `Day ${day.mission_day}`;
  });
  for (const [field, label, unit] of [
    ['sleep_hours', 'Sleep', 'h'], ['resting_heart_rate_bpm', 'Resting heart rate', 'bpm'],
  ]) {
    const row = document.createElement('tr');
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = label;
    row.append(heading);
    const { reference, recent } = health[field];
    for (const value of [reference, ...recent.map(day => day.value)]) {
      const cell = document.createElement('td');
      cell.textContent = value == null ? 'Missing' : `${value} ${unit}`;
      row.append(cell);
    }
    document.querySelector('#health-rows').append(row);
  }
}

try {
  const state = await request('state');
  drawHealth(state);
  if (state.checkIn) showSaved(state.checkIn);
  else exampleButton.disabled = saveButton.disabled = false;

  exampleButton.addEventListener('click', () => fill(Object.fromEntries(
    Object.entries(inputNames).map(([field, fixtureKey]) => [field, state.example[fixtureKey]]),
  )));
  checkInForm.addEventListener('submit', async event => {
    event.preventDefault();
    saveButton.disabled = true;
    checkInStatus.textContent = 'Saving check-in…';
    const values = Object.fromEntries(Object.keys(inputNames).map(key => {
      const input = checkInForm.elements[key];
      return [key, input.value === '' ? null : input.valueAsNumber];
    }));
    try {
      const saved = await request('check-in', values);
      showSaved(saved.checkIn);
    } catch (error) {
      checkInStatus.textContent = error.message;
      saveButton.disabled = false;
    }
  });
} catch (error) {
  checkInStatus.textContent = error.message;
}

compareButton.addEventListener('click', async () => {
  compareButton.disabled = true;
  results.hidden = true;
  todayReplies.replaceChildren();
  historyReplies.replaceChildren();
  compareStatus.textContent = 'Comparing four replies…';
  try {
    const { comparisons } = await request('compare');
    for (const comparison of comparisons) {
      const card = document.createElement('article');
      card.className = 'result';
      const title = document.createElement('h4');
      title.textContent = comparison.label;
      const reply = document.createElement('p');
      reply.textContent = comparison.reply;
      card.append(title, reply);
      (comparison.usesHistory ? historyReplies : todayReplies).append(card);
    }
    results.hidden = false;
    compareStatus.textContent = 'Comparison complete.';
  } catch (error) {
    compareStatus.textContent = error.message;
  } finally {
    compareButton.disabled = false;
  }
});
