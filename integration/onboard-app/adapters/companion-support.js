// Connection adapter for Potest's offline health-context tool. No owner source is changed.
import { readFile } from 'node:fs/promises';
import { companionRoute } from '../../../people/potest/crew-support/companion.js';
import { getScriptedReply } from '../../../people/potest/crew-support/chat.mjs';
import { companionPriority, controlledReply, scriptedSceneFor } from '../../../people/potest/crew-support/controlled-replies.js';
import { getComparisonReply } from '../../crew-assistant/replies.mjs';
import { dailyFor, referenceFor } from '../../../people/angelos/health/analysis.js';
import { errorAnswer } from '../core.js';

export const syntheticHealthSource = await readFile(new URL('../../../people/petros_the_space_larper/demo-data/health.json', import.meta.url), 'utf8');
export const syntheticHealthFixture = JSON.parse(syntheticHealthSource);
// Only topic counters and the last reply are kept in memory, never message/journal text on disk.
const conversations = new Map();
export const resetSupportConversation = () => conversations.clear();

export function supportContextFor(today) {
  const rows = syntheticHealthFixture.crew[today.crewId]?.checkIns ?? [];
  const baseline = rows.filter(r => r.missionDay >= 29 && r.missionDay <= 35);
  const earlier = rows.filter(r => r.missionDay > 35 && r.missionDay < today.missionDay);
  const analysis = dailyFor({ baseline, checkIns: earlier }, today.crewId, today.missionDay - 1);
  const sleep = analysis.measures.find(m => m.measure === 'sleepHours');
  const entry = today.checkedInToday ? today.checkIn : null;
  return {
    checkIn: entry ? { sleep_hours: entry.sleepHours ?? null, mood: entry.mood ?? null,
      stress: entry.stress ?? null, fatigue: entry.fatigue ?? null } : null,
    sleepHistory: { reference: referenceFor(baseline, 'sleepHours').normal,
      recent: earlier.slice(-2).map(r => ({ mission_day: r.missionDay, value: r.sleepHours ?? null })) },
    shortSleepDays: sleep?.direction === 'lower' ? sleep.daysInARow : 0,
  };
}

function topicFor(message, previous) {
  const text = message.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  // Unicode escapes also recognize common Greek words without changing the English repo/UI.
  const priority = companionPriority(text);
  if (priority) return priority;
  if (/\b(breath(?:ing)?|relax(?:ed|ation)?|wind.down|calm)\b|\u03b1\u03bd\u03b1\u03c0\u03bd\u03bf|\u03c7\u03b1\u03bb\u03b1\u03c1/u.test(text)) return 'wind-down';
  if (/\b(miss|home|family|lonely|isolation|isolated)\b|\u03bf\u03b9\u03ba\u03bf\u03b3\u03b5\u03bd|\u03bc\u03bf\u03bd\u03b1\u03be|\u03c3\u03c0\u03b9\u03c4\u03b9/u.test(text)) return 'home';
  if (/\b(sleep|tired|fatigue|worn|exhaust|drain)/u.test(text) || /\u03c5\u03c0\u03bd|\u03ba\u03bf\u03c5\u03c1\u03b1|\u03b5\u03be\u03b1\u03bd\u03c4\u03bb/u.test(text)) return 'sleep';
  if (/\b(stress\w*|anxio\w*|anxiety|worr\w*|overwhelm\w*|tense)\b|\u03b1\u03b3\u03c7|\u03c3\u03c4\u03c1\u03b5\u03c3/u.test(text)) return 'stress';
  if (/\b(sad|low|mood|down|out of sorts)\b|\u03b4\u03b9\u03b1\u03b8\u03b5\u03c3|\u03bb\u03c5\u03c0/u.test(text)) return 'mood';
  if (/\b(thanks|thank|better|helped)\b|\u03b5\u03c5\u03c7\u03b1\u03c1\u03b9\u03c3\u03c4|\u03ba\u03b1\u03bb\u03c5\u03c4\u03b5\u03c1/u.test(text)) return 'follow-up';
  if (/\b(why|how|what|yes|please|tell me|evenings?|nights?)\b/u.test(text) && previous) return previous;
  return 'general';
}
function ownToday(entry) {
  if (!entry) return '';
  const facts = [entry.sleepHours == null ? null : `${entry.sleepHours} hours of sleep`,
    entry.mood == null ? null : `mood ${entry.mood}/10`, entry.stress == null ? null : `stress ${entry.stress}/10`,
    entry.fatigue == null ? null : `fatigue ${entry.fatigue}/10`].filter(Boolean);
  return facts.length ? `Today you logged ${facts.join(', ')}. ` : '';
}

export const contextualCompanionRoute = {
  ...companionRoute,
  async handler(req, ctx) {
    // Preserve Potest's exact request, role, author, scale and current-day validation.
    await companionRoute.handler(req, ctx);
    const { today } = req.body.context;
    const key = `${req.user.crewId}:${ctx.missionDay()}`;
    let state = conversations.get(key);
    if (!state) { state = { counts: {}, lastTopic: null, lastReply: '', entryId: null }; conversations.set(key, state); }
    const topic = topicFor(req.body.message, state.lastTopic);
    const turn = state.counts[topic] ?? 0;
    const context = supportContextFor(today);
    const comparison = getComparisonReply(context);
    // The first paragraph in Potest's comparison contains detailed clinical history. Keep it
    // server-side; the crew gets practical support, never baseline numbers or trend counts.
    const guidance = comparison.split('\n\n').slice(1);
    const sleepPlan = guidance[0] ?? comparison;
    const coping = guidance[1] ?? 'If you find it hard to switch off, you could try a few minutes of slow, comfortable breathing. If stress keeps weighing on you, ask for a private check-in through the mission behavioral health channel.';
    const followUp = guidance[2] ?? 'At the next check-in, log your sleep, fatigue and stress again so you and the medical officer can review any agreed change.';
    let choices;
    if (topic === 'urgent') choices = ['Contact the onboard crew medical officer or a nearby crewmate now and follow the mission emergency procedure. Ask them to stay with you while you get help. Do not wait for a reply from Earth.'];
    else if (topic === 'clinical') choices = ['The crew medical officer handles assessment and medication decisions. I can help you put what you are experiencing into words; use Check-in to report a symptom or Med bay for medicine access.'];
    else if (topic === 'home') choices = [0, 1, 2].map(t => {
      const turns = Array.from({ length: t * 2 + 1 }, () => ({})); return getScriptedReply(turns);
    });
    else if (topic === 'sleep') choices = [sleepPlan, coping, followUp];
    else if (topic === 'wind-down') choices = [coping, 'Keep it comfortable and optional. If that does not suit you, we can focus on what has been making it difficult to switch off.', followUp];
    else if (topic === 'stress' || topic === 'mood') choices = [coping, 'Would it help to name one task or situation that has been weighing on you? You can also write privately in your journal or ask for your mission behavioral health provider.', followUp];
    else if (topic === 'follow-up') choices = [followUp, 'You can keep talking here or leave a private journal note to return to later. What would be useful to remember?'];
    else choices = ['I’m here to listen. Is it tiredness, stress, missing home, or something else that has been weighing on you?', 'We can take one part at a time. What has been the hardest moment of your day?', 'Would you prefer to talk it through, write a private note, or look at a small next step?'];
    let reply = choices[turn % choices.length];
    if (reply === state.lastReply && choices.length > 1) reply = choices[(turn + 1) % choices.length];
    const entryId = today.checkIn?.id;
    if (['sleep', 'stress', 'mood'].includes(topic) && entryId && state.entryId !== entryId) {
      reply = `${ownToday(today.checkIn)}${reply}`; state.entryId = entryId;
    }
    if (!today.checkedInToday && topic === 'general' && turn === 0) reply += ' I don’t have a check-in from you today; you can fill one in when you are ready.';
    state.counts[topic] = turn + 1; state.lastTopic = topic === 'general' ? null : topic; state.lastReply = reply;
    if (conversations.size > 100) conversations.delete(conversations.keys().next().value);
    return { reply, links: topic === 'urgent' || topic === 'clinical' ? [{ screen: 'checkin' }, { screen: 'medbay' }]
      : !today.checkedInToday ? [{ screen: 'checkin' }] : [{ screen: 'mind' }] };
  },
};

export function connectQuestionnaireCompanion(core, { historyFor }) {
  async function api(request) {
    const result = await core.api(request);
    if (!result.body.ok || request.method !== 'POST' ||
        request.path.split('/').filter(Boolean).join('/') !== 'mind/companion') return result;

    const { message, context } = request.body;
    const topic = scriptedSceneFor(message);

    // Compose private read APIs using the same crew session after Mind's role, author and day checks.
    const get = path => core.api({ method: 'GET', path, token: request.token });
    const [health, pulsars] = await Promise.all([get('/health/today'), get('/pulsars/me')]);
    if (!health.body.ok) return health;
    if (!pulsars.body.ok) return pulsars;
    const today = health.body.data;
    if (today.missionDay !== context.today.missionDay || today.missionDay !== core.clockView().missionDay) {
      return errorAnswer('invalid_field', 'Reload today’s check-in and try again.');
    }
    const answers = pulsars.body.data.wallet.todayAnswers;
    return {
      status: result.status,
      body: { ok: true, data: controlledReply({
        message, topic, today, answers, history: historyFor(today.crewId),
      }) },
    };
  }

  return { ...core, api };
}
