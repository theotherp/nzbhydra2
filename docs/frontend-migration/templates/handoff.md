# Handoff

Never state a count of items in prose (e.g. "eight deviations", "all three findings") anywhere in this document. Enumerate each item as its own bullet or table row instead, and let the count be self-evident from the list — a stated number
and an enumerated list can silently drift apart when one is edited and not the other, and only the list gets checked against the registry.

## Outcome

- What was delivered, concisely.

## Files Modified

- Task-owned files or concise path groups; confirm all are within `Files Allowed To Modify`.

## Verification Evidence

| Working directory | Command         | Result                                            |
|-------------------|-----------------|---------------------------------------------------|
| `path`            | `exact command` | passed / failed / blocked, with concise evidence  |

Record skipped or blocked commands as such — never imply they passed. Note the Node/npm versions used when relevant.

## Screenshots

- Paths to the screenshot strip for every changed rendered state, or `None (no rendering change)`.

## Decisions, Assumptions, Debt

- Dependency additions/changes with justification, or `None`.
- Material assumptions made from repository evidence, or `None`.
- Temporary workarounds with reason and removal condition, or `None`.
- Every deliberate deviation from legacy behavior, one bullet per deviation, each naming the registry anchor where it is also recorded (e.g. `FEATURES.yaml:642`). Do not summarize these with a count; the registry anchors are what a reviewer
  checks.

## Registry Updates

- Registry records updated, or confirmed unchanged, per linked ID. When a change adds enumerated entries such as `deliberate -` gap lines, name each one directly — do not only state how many were added.

## Follow-Up Work

- Bounded proposals not required for this task, or `None`. Label each `single-session fix` or `proposed packet`.
