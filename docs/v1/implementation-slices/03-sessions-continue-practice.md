# Pack 3 Slice Backlog: Session / Continue Practice

## Pack Goal

The app can remember meaningful local practice activity and return the user to useful recent contexts.

## Slice Backlog

### P3-01 `session-event-model`
- Define local session event records and validation.

### P3-02 `session-event-capture`
- Capture metronome, recording, and reference events through service boundaries.

### P3-03 `segment-session-metadata`
- Add optional segment context to sheet sessions.

### P3-04 `session-history-grouping`
- Group local session history by date, sheet, and segment.

### P3-05 `session-duration-rules`
- Centralize duration calculation rules from session events.

### P3-06 `home-recent-activity-source`
- Build local recent activity selector from sessions, recordings, sheets, and segments.

### P3-07 `home-recent-activity-ui`
- Show compact recent activity timeline on Home.

### P3-08 `continue-practice-targets`
- Build valid quick/sheet/segment continue targets and reject stale references.

### P3-09 `continue-practice-ui-navigation`
- Let the user continue to the correct sheet and segment context.

### P3-10 `goal-completion-evaluator`
- Evaluate simple local goals from sessions and recordings.

## Scheduling Notes

Pack 3 should start after Pack 1 is accepted and before broad Home analytics.

