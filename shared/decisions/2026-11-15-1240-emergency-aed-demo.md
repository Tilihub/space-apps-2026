# Emergency AED checkout and seven-minute presentation

- When: 2026-11-15 12:40 Europe/Athens
- Decided by: Tommy; Tommy explicitly confirmed dadis2 agrees to the catalogue addition
- Affects: emergency-equipment catalogue, large L3 shelf, live-demo scenario and timing

## Decision

Replace the noncollectable AED draft with one actual emergency-tier equipment item in the existing medicine-module catalogue, at L3-4-01. Retain the full-width three-compartment visual shelf. Use ordinary Emergency, patient/reason entry, collection confirmation, stock and audit/reset behavior; no new access-policy bypass or patient-recovery status.

The emergency story becomes Kai's fictional sudden cardiac arrest, equipment retrieval and narrated successful resuscitation by the crew. It is an explicit simulated story, not a guarantee of survival or a claim that collection delivers treatment. The presentation slot is seven minutes total; see people/tommy/presentation/seven-minute-run.md.

## Why

Tommy wants the existing visible AED to be usable in the demo through the same emergency flow as the other items, and wants a complete seven-minute live presentation.

## Alternatives we rejected

- Keeping the AED as a disabled visual draft.
- Enabling the shelf only in the browser without a backend item or stock/audit checks.
- Claiming that the app detects cardiac arrest, delivers a shock, verifies recovery or guarantees survival.
