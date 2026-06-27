# Stores Boundary

Shared client state belongs here when a module needs Zustand state across components.

Use stores only for ephemeral client UI/workflow coordination, such as the active Sheet Practice recording segment and recording lifecycle status. Persisted domain data stays in services and repositories under `src/services/` and `src/infrastructure/`; stores must not become a persistence layer.
