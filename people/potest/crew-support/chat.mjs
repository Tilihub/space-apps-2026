const API = 'https://api.openai.com/v1';
export const DEFAULT_MODEL = 'gpt-5.4-mini';
export const MAX_MESSAGES = 11;
export const MAX_MESSAGE_LENGTH = 2_000;

const INSTRUCTIONS = `You are Crew Support, an AI conversation companion for an astronaut.
Help them talk about isolation, missing home, stress, fatigue or crew tension. Respond in their
language. Be warm and specific about what they said. Follow their lead, ask at most one gentle
question, and offer a small practical step only if it fits. Keep replies brief.
Be clear about being an AI. Do not claim to be a psychologist, diagnose, recommend treatment
or medication, promise secrecy, or suggest they rely exclusively on you. Never claim to read
medical records or contact anyone. You have no tools or access to mission systems.
If they ask for a psychologist, suggest using the mission's designated behavioral health
channel. If there is a credible immediate threat to anyone's safety or an urgent medical
concern, lead with contacting the onboard crew medical officer or a nearby crewmate now
and following the mission emergency procedure. Do not tell them to wait for a reply from Earth.`;

const URGENT_REPLY = 'I’m glad you told me. Please contact your onboard crew medical officer or a nearby crewmate now and follow your mission’s emergency procedure. Ask them to stay with you while you get help.';
const SAFE_REPLY = 'I’m here to listen. If you’d prefer to talk with a person, use your mission’s designated behavioral health channel.';

export class ChatError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_MESSAGES || messages.length % 2 === 0) {
    throw new ChatError(400, 'A conversation must end with a crew message.');
  }
  return messages.map((message, i) => {
    const role = i % 2 === 0 ? 'user' : 'assistant';
    if (message?.role !== role || typeof message.content !== 'string' ||
        !message.content.trim() || message.content.length > MAX_MESSAGE_LENGTH) {
      throw new ChatError(400, 'Each message must contain 1–2,000 characters and alternate between crew and AI.');
    }
    return { role, content: message.content.trim() };
  });
}

function demoReply(messages) {
  const turn = (messages.length - 1) / 2;
  return [
    'Being far from home can make a hard day feel longer. What have you been missing most today?',
    'It makes sense that you’d want a little more connection. What would feel manageable right now?',
    'Thanks for taking the time to put this into words. Would you like to keep talking or pause here?',
  ][Math.min(turn, 2)];
}

function contextualDemoReply({ checkIn, health }) {
  const today = checkIn?.sleep_hours;
  const stress = checkIn?.stress;
  const history = health?.sleep_hours;
  const references = [];
  if (today != null) references.push(`You logged ${today} hours of sleep today.`);
  if (stress != null) references.push(`You rated your stress ${stress}/10.`);
  if (health && history?.reference != null) {
    const recent = history.recent.filter(day => day.value != null);
    if (recent.length) {
      const observations = recent.map(day => `${day.value} hours on day ${day.mission_day}`).join(' and ');
      references.push(`Earlier sleep logs show ${observations}, with a personal reference of ${history.reference} hours.`);
    }
    if (today != null) {
      const change = Math.round((history.reference - today) * 10) / 10;
      if (change) references.push(`Today's entry is ${Math.abs(change)} hours ${change > 0 ? 'below' : 'above'} that reference.`);
    }
  }
  const question = health && checkIn
    ? 'What feels like the most useful thing to bring up with your crew today?'
    : health
      ? 'How was your sleep last night?'
      : checkIn ? 'How has today felt compared with the last few days?' : 'When did you first notice feeling worn down?';
  return ['That sounds tiring.', ...references, question].join(' ');
}

export async function getReply(messages, { mode, model, apiKey, fetchOpenAI, signal, context }) {
  if (mode === 'demo') return { reply: context === undefined ? demoReply(messages) : contextualDemoReply(context) };
  if (mode === 'unconfigured') throw new ChatError(503, 'AI chat needs an OpenAI API key on the server.');

  async function callOpenAI(endpoint, body) {
    const response = await fetchOpenAI(`${API}/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new ChatError(503, 'OpenAI access failed. Check the server’s API key and model access.');
    }
    if (response.status === 429) {
      throw new ChatError(503, 'OpenAI is rate limited or the API project is out of quota.');
    }
    if (!response.ok) throw new ChatError(502, 'OpenAI chat is temporarily unavailable.');
    return response.json();
  }

  async function moderate(text) {
    const result = await callOpenAI('moderations', { model: 'omni-moderation-latest', input: text });
    const categories = result.results?.[0]?.categories;
    if (typeof categories?.['self-harm/intent'] !== 'boolean' ||
        typeof categories['self-harm/instructions'] !== 'boolean' ||
        typeof categories['illicit/violent'] !== 'boolean') {
      throw new ChatError(502, 'The message safety check is temporarily unavailable.');
    }
    return categories;
  }

  const inputSafety = await moderate(messages.at(-1).content);
  if (inputSafety['self-harm/intent']) return { reply: URGENT_REPLY, urgent: true };

  const contextInstructions = context === undefined ? '' : `
Use only relevant context supplied below. The sources describe a fictional demo crew member.
checkIn is the crew member's self-report today. health is earlier sleep and resting heart rate
from a synthetic fixture, including a personal reference median. Do not confuse earlier days
with today. A missing field or null is unknown. When both are relevant, relate today's check-in
to earlier observations. Do not treat the comparison as a cause, diagnosis or safety clearance.
Scores are 1–10. Higher mood means better mood. Higher stress and fatigue mean more of each.
For no data, ask a relevant follow-up without inventing measurements.
Crew support context: ${JSON.stringify(context)}`;
  const result = await callOpenAI('responses', {
    model,
    instructions: INSTRUCTIONS + contextInstructions,
    input: messages,
    store: false,
    max_output_tokens: 420,
  });
  const content = result.output?.filter(item => item.type === 'message').flatMap(item => item.content);
  if (content?.some(part => part.type === 'refusal')) return { reply: SAFE_REPLY };
  const reply = content?.filter(part => part.type === 'output_text').map(part => part.text).join('\n').trim();
  if (result.status !== 'completed' || !reply || reply.length > MAX_MESSAGE_LENGTH) {
    throw new ChatError(502, 'OpenAI did not return a complete reply.');
  }
  const outputSafety = await moderate(reply);
  if (outputSafety['self-harm/instructions'] || outputSafety['illicit/violent']) return { reply: SAFE_REPLY };
  return { reply };
}
