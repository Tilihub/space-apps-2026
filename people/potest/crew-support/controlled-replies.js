// Cutoffs for the synthetic rehearsal data.
const CONCERNS = {
  sleep: ['sleepHours', value => value < 6, 'short sleep'],
  stress: ['stress', value => value >= 7, 'high stress'],
  fatigue: ['fatigue', value => value >= 7, 'fatigue'],
  mood: ['mood', value => value <= 4, 'low mood'],
  worry: ['worry', value => value >= 7, 'worry'],
  focus: ['focus', value => value <= 4, 'difficulty concentrating'],
  motivation: ['motivation', value => value <= 4, 'low motivation'],
  loneliness: ['loneliness', value => value >= 7, 'loneliness'],
  connection: ['connection', value => value <= 4, 'feeling less supported by the crew'],
  workload: ['workload', value => value >= 7, 'a demanding workload'],
  mentalRest: ['mentalRest', value => value <= 4, 'feeling mentally worn out'],
};
const REPEATED_DAYS = 4;
const LIST = new Intl.ListFormat('en', { style: 'long' });
const SCENES = {
  sleep: ['sleep', 'fatigue', 'mentalRest', 'stress', 'worry', 'workload'],
  calm: ['stress', 'worry', 'mentalRest'],
  crew: ['loneliness', 'connection', 'mood'],
  tasks: ['workload', 'focus', 'motivation', 'fatigue', 'sleep'],
  general: Object.keys(CONCERNS),
  next: Object.keys(CONCERNS),
};

export function companionPriority(message) {
  const text = message.toLowerCase().replace(/[’‘]/g, "'");
  if (/\b(chest pain|can(?:not|'t) breathe|short(?:ness)? of breath|difficulty breathing|(?:trouble|struggling) (?:to breathe|breathing)|unconscious|hurt myself|kill myself|suicid\w*)\b/u.test(text)) return 'urgent';
  if (/\b(medication|medicine|pills?|diagnos\w*|prescrib\w*)\b/u.test(text)) return 'clinical';
  return null;
}

export function scriptedSceneFor(message) {
  const priority = companionPriority(message);
  if (priority) return priority;
  const text = message.toLowerCase().replace(/[’‘]/g, "'");
  if (/\b(sleep|rest|tired|fatigue|worn|exhaust|drained)\b/u.test(text)) return 'sleep';
  if (/\b(stress\w*|worr\w*|anxio\w*|anxiety|calm|wind down|switch off|breathing|overwhelm\w*)\b/u.test(text)) return 'calm';
  if (/\b(lonel\w*|isolat\w*|disconnect\w*|support from (?:the|my) crew)\b/u.test(text)) return 'crew';
  if (/\b(miss|family|homesick)\b/u.test(text)) return 'home';
  if (/\b(focus|concentrat\w*|workload|motivat\w*|tasks?|duties)\b/u.test(text)) return 'tasks';
  if (/\b(what (?:should|can) i do|next step|start with)\b/u.test(text)) return 'next';
  if (/\b(unwell|sad|low mood|out of sorts|feeling (?:bad|low|down|off)|not (?:feeling|doing) (?:very )?well|(?:rough|hard|bad) day)\b/u.test(text)) return 'general';
  return null;
}

function flagged(row, concern) {
  const [field, isFlagged] = CONCERNS[concern];
  const value = row?.[field];
  return Number.isFinite(value) && isFlagged(value);
}

function repeated(priorDays, day, concern) {
  for (let offset = 1; offset <= REPEATED_DAYS; offset++) {
    if (!flagged(priorDays.get(day - offset), concern)) return false;
  }
  return true;
}

function nextStep(scene, concerns, recurring) {
  if (recurring.size) {
    if (recurring.has('sleep') || recurring.has('fatigue')) {
      return scene === 'next'
        ? 'Tell the crew medical officer how sleep and energy are affecting your shift. Ask which noncritical duty can move, then check in again after your next sleep block.'
        : 'Ask the crew medical officer today to help protect your next sleep block and review whether a noncritical duty can move.';
    }
    return 'Ask for a private check-in with the crew medical officer today to talk through what has been getting harder and agree on one change.';
  }
  if (scene === 'crew') return 'Would it help to ask a crewmate you trust for a quiet check-in after your shift?';
  if (scene === 'calm') return 'If you have a quiet minute, try slowing your breathing to a comfortable pace and name one thing you can set aside until later.';
  if (scene === 'sleep' || concerns.has('sleep') || concerns.has('fatigue') || concerns.has('mentalRest')) {
    return scene === 'next'
      ? 'Start with a quiet break when duties allow. See how you feel after your next sleep block and log it in your next check-in.'
      : 'Give yourself a quiet break when duties allow and make time to wind down before your next sleep block.';
  }
  if (scene === 'tasks' || concerns.has('workload') || concerns.has('focus') || concerns.has('motivation')) {
    return 'Pick one manageable task and ask the crew to help prioritize the rest if your workload is getting in the way.';
  }
  if (concerns.has('stress') || concerns.has('worry')) return 'Would it help to talk through what has been weighing on you and pick one thing you can set aside?';
  if (concerns.has('loneliness') || concerns.has('connection')) return 'Would it help to ask a crewmate you trust for a quiet check-in after your shift?';
  return 'What part of today would you like to talk through first?';
}

export function controlledReply({ message, today, answers, history, topic = scriptedSceneFor(message) }) {
  const scene = topic === 'home' ? 'crew' : topic ?? 'general';
  const careLinks = [{ screen: 'checkin' }, { screen: 'medbay' }];
  if (scene === 'urgent') return {
    reply: 'Contact the onboard crew medical officer or a nearby crewmate now and follow the mission emergency procedure. Ask them to stay with you while you get help.',
    links: careLinks,
  };
  if (scene === 'clinical') return {
    reply: 'Ask the crew medical officer about assessment or medication. I can help you put what you’re experiencing into words.',
    links: careLinks,
  };

  const current = { ...today.checkIn, ...answers };
  const { missionDay } = today;
  const priorDays = new Map(history.filter(row => row.missionDay < missionDay).map(row => [row.missionDay, row]));
  const concerns = new Set(SCENES[scene].filter(key => flagged(current, key)));
  const recurring = new Set([...concerns].filter(key => repeated(priorDays, missionDay, key)));
  const describe = keys => LIST.format([...keys].map(key => CONCERNS[key][2]));
  const links = today.checkedInToday && answers ? [{ screen: 'mind' }] : [{ screen: 'checkin' }];
  const step = nextStep(scene, concerns, recurring);

  if (!concerns.size) {
    const prompt = today.checkedInToday || answers ? 'What’s felt hardest for you today?' :
      'What’s been on your mind? You can share it here or complete today’s check-in when you’re ready.';
    return { reply: 'I’m here to listen. ' + (scene === 'general' ? prompt : step), links };
  }
  if (scene === 'next') return { reply: step, links };
  if (recurring.size) return {
    reply: 'That sounds hard to carry. Your check-in today points to ' + describe(concerns) +
      '. Your recent check-ins also show a pattern of ' + describe(recurring) + '. ' + step,
    links,
  };
  const yesterday = priorDays.get(missionDay - 1);
  const comparable = [...concerns].filter(key => Number.isFinite(yesterday?.[CONCERNS[key][0]]));
  const newConcern = comparable.length > 0 && comparable.every(key => !flagged(yesterday, key));
  const observation = newConcern ? 'This sounds like a rough day.' : 'We can start with what feels hardest today.';
  return {
    reply: 'I’m glad you told me. Your check-in today points to ' + describe(concerns) + '. ' + observation + ' ' + step,
    links,
  };
}
