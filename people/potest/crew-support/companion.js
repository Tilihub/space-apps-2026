import { apiError, checkFields, MEASUREMENTS, resolveCrewId, SCALES } from '../../../shared/contract/contract.js';
import { MAX_MESSAGE_LENGTH } from './chat.mjs';

const measurements = { ...MEASUREMENTS, mood: SCALES.mood, stress: SCALES.stress, fatigue: SCALES.fatigue };
const todayFields = ['crewId', 'missionDay', 'checkedInToday'];
const entryFields = ['id', 'crewId', 'missionDay', 'recordedAt'];

function checkAuthor(user, crewId) {
  if (crewId !== resolveCrewId(user)) {
    throw apiError('not_your_data', 'Use the signed-in crew member’s check-in.');
  }
}

function currentEntry(context, user, missionDay) {
  const { today } = checkFields(context, ['today'], ['today']);
  const todayView = checkFields(today, [...todayFields, 'checkIn'], todayFields);
  checkAuthor(user, todayView.crewId);
  if (todayView.missionDay !== missionDay || typeof todayView.checkedInToday !== 'boolean') {
    throw apiError('invalid_field', 'Reload today’s check-in and try again.');
  }
  if (!todayView.checkedInToday && todayView.checkIn === null) return null;
  if (!todayView.checkedInToday) throw apiError('invalid_field', 'An open check-in must have a null entry.');
  const entry = checkFields(todayView.checkIn, [...entryFields, ...Object.keys(measurements)], entryFields);
  checkAuthor(user, entry.crewId);
  if (entry.missionDay !== missionDay) throw apiError('invalid_field', 'Reload today’s check-in and try again.');

  for (const [key, range] of Object.entries(measurements)) {
    const value = entry[key];
    if (value == null) continue;
    if (!Number.isFinite(value) || value < range.min || value > range.max ||
      (Object.hasOwn(SCALES, key) && !Number.isInteger(value))) {
      throw apiError('invalid_field', `Invalid ${key} in today’s check-in.`);
    }
  }
  return entry;
}

export const companionRoute = {
  method: 'POST',
  path: '/companion',
  roles: ['crew'],
  async handler(req, ctx) {
    checkFields(req.query, []);
    const { message, context } = checkFields(req.body, ['message', 'context'], ['message', 'context']);
    if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
      throw apiError('invalid_field', `Enter a message of up to ${MAX_MESSAGE_LENGTH} characters.`);
    }
    const entry = currentEntry(context, req.user, ctx.missionDay());
    if (!entry) {
      return {
        reply: 'I’m here to listen. I don’t have a check-in from you today. What’s been on your mind?',
        links: [{ screen: 'checkin' }],
      };
    }

    const observations = [
      entry.sleepHours == null ? null : `${entry.sleepHours} hours of sleep`,
      entry.mood == null ? null : `mood at ${entry.mood}/10`,
      entry.stress == null ? null : `stress at ${entry.stress}/10`,
      entry.fatigue == null ? null : `fatigue at ${entry.fatigue}/10`,
    ].filter(Boolean);
    const snapshot = observations.length
      ? `Today you logged ${observations.join(', ')}.`
      : 'Today’s check-in has no sleep, mood, stress or fatigue entries.';
    const sleepSupport = entry.sleepHours == null ? '' :
      ' If duties are cutting into sleep, ask the crew medical officer about protecting your next sleep block.';
    return {
      reply: `${snapshot}${sleepSupport} What’s been hardest for you today? If you’d like to talk it through with someone, you can ask for a private conversation through the mission’s behavioral health channel.`,
      links: [],
    };
  },
};
