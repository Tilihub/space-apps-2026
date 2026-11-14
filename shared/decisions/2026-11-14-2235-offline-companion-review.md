# Restore companion appearance and use the offline health-context tool

- When: 2026-11-14 22:35 Europe/Athens
- Decided by: Tommy (requested demo behavior; shared contract clarification pending teammate review)
- Affects: Mind/companion integration, body viewer, zt's UI handoff

## Decision

- Restore zt's animated planet mascot, chat bubbles and full conversation on Mind, retaining
  the floating companion on crew screens.
- Use Potest's offline health-context tool for now. The older OpenAI-backed version was found
  in Git history, but no server API key is configured and Tommy explicitly selected offline use.
- Reuse Potest's support/comparison helpers with Angelos's pure comparison functions and the
  current author's canonical Petros synthetic fixture. Current check-in values still come from
  the authenticated health client each turn. Do not expose historical comparisons, baseline
  numbers or streak counts in the astronaut chat. Do not fetch clinical history or journal text.
- Make the female body a less detailed mannequin. Reported symptoms use a small red indication,
  line and label; they do not recolor the skin or the whole head.

## Why

The first connected demo used a limited companion route that returned almost the same check-in
summary every turn. The previous chat appearance and the richer offline support tool were lost
in that connection. Tommy requested their restoration before broader visual changes.

## Alternatives we rejected

- Repeating one current-check-in summary as the full conversation.
- Claiming that a scripted offline tool is a trained model.
- Configuring a paid external model now or requesting an API key in chat.
- Coloring an entire body region red for one symptom.

The protected contract clarification is proposed in PR #73. Teammates have not been assumed to
approve it; the original owner folders and public request shape remain unchanged.
