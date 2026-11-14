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
      snapshot,
      `Your sleep was well below your usual ${reference} hours for ${shortSleepDays} nights in a row before today. The last two logs show ${observations}.`,
      'That pattern is worth addressing. Could you bring those sleep logs to the crew medical officer and talk through what’s been cutting into your sleep?',
    ].filter(Boolean).join(' ');
  }

  return [
    'That sounds like a hard day.',
    snapshot,
    'What’s been hardest to get through today?',
  ].filter(Boolean).join(' ');
}
