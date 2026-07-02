# Pack 3 Slice Backlog: Home / Session / Continue Practice

## Pack Goal

The app can remember meaningful local practice activity, summarize it on Home, and return the user to useful recent contexts.

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

### P3-11 `home-dashboard-analytics-source`
- Source feature: `home.dashboard-analytics`
- Derive local dashboard analytics from sessions, recordings, sheets, segments, and goals.

### P3-12 `home-dashboard-analytics-ui`
- Source feature: `home.dashboard-analytics`
- Display dense, honest local analytics on Home.

### P3-13 `home-practice-streaks`
- Source feature: `home.practice-streaks`
- Show local practice streaks using the v0 local-day policy.

### P3-14 `home-goal-management-domain-repository`
- Source feature: `home.goal-management`
- Create local goal domain and persistence.

### P3-15 `home-goal-management-ui`
- Source feature: `home.goal-management`
- Add Home goal create/edit/delete/progress UI.

### P3-16 `home-command-palette`
- Source feature: `home.command-palette`
- Add keyboard navigation over implemented routes and valid local practice targets.

### P3-17 `practice-session-session-comparison`
- Source feature: `practice-session.session-comparison`
- Compare sessions using local metadata without scoring claims.

## Scheduling Notes

Pack 3 should start after Pack 1 is accepted and before broad Home analytics.

## Closeout Note

P3 closes the local sessions, Home, Continue Practice, goals, analytics, streaks, command palette, and session comparison foundations. Durable event timeline UI, durable event persistence, cloud scope, and AI analysis remain outside P3 scope.
