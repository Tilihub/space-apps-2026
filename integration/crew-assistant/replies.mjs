export function getComparisonReply({ checkIn, sleepHistory, shortSleepDays }) {
  const today = [
    checkIn?.sleep_hours != null ? `${checkIn.sleep_hours} hours of sleep` : null,
    checkIn?.stress != null ? `stress at ${checkIn.stress}/10` : null,
  ].filter(Boolean);
  const snapshot = today.length ? `Today's check-in shows ${today.join(' and ')}.` : '';

  if (shortSleepDays >= 2) {
    const { reference, recent } = sleepHistory;
    const observations = recent.map(day => `${day.value} hours on day ${day.mission_day}`).join(' and ');
    return [
      [
        'That sounds draining.',
        snapshot,
        `Your sleep was well below your usual ${reference} hours for ${shortSleepDays} nights in a row before today. The last two logs show ${observations}.`,
      ].filter(Boolean).join(' '),
      'Let’s try to protect your next sleep block. Review what’s been interrupting it with the crew medical officer and ask whether a noncritical task can move. If fatigue is already making it hard to work safely, tell the medical officer now.',
      'If you’re finding it hard to switch off before bed, you could try a few minutes of slow, comfortable breathing. If the stress keeps weighing on you, ask for a private check-in with your mission’s behavioral health provider.',
      'At your next check-in, log your sleep, fatigue and stress again so you and the medical officer can see whether the change helped.',
    ].join('\n\n');
  }

  return [
    'That sounds like a hard day.',
    snapshot,
    'What’s been hardest to get through today?',
  ].filter(Boolean).join(' ');
}
