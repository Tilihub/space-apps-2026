export const MAX_MESSAGES = 11;
export const MAX_MESSAGE_LENGTH = 2_000;

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

export function getScriptedReply(messages) {
  const turn = (messages.length - 1) / 2;
  return [
    'Being far from home can make a hard day feel longer. What have you been missing most today?',
    'It makes sense that you’d want a little more connection. What would feel manageable right now?',
    'Thanks for taking the time to put this into words. Would you like to keep talking or pause here?',
  ][Math.min(turn, 2)];
}
