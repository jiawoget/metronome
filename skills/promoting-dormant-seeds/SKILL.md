---
name: promoting-dormant-seeds
description: Atomically promote selected dormant legacy capability seeds into native OpenGSD requirements while preserving unmatched seeds. Use only during gsd-new-milestone when REQUIREMENTS.md approves a seed's exact legacy capability ID, feature key, and required behavior.
---

# Promoting Dormant Seeds

One deferred legacy capability has one carrier before approval: its dormant seed. Selecting a seed does not consume it.

## Transaction

1. Confirm that current `REQUIREMENTS.md` approves the same legacy capability ID, feature key, and required behavior. Delete only that matching seed in the requirements commit. Otherwise keep it; leave rejected, unmatched, and unselected seeds unchanged.
2. Before committing, require an empty index, no `MERGE_HEAD`, an existing `.planning/seeds` directory, and an exact `.planning` status set containing only the current `REQUIREMENTS.md` add/modify plus expected matching seed deletions. On mismatch, stop without cleaning, staging, or rewriting history.
3. Commit with `gsd_run query commit "docs: define milestone v[X.Y] requirements" --files .planning/REQUIREMENTS.md .planning/seeds`. The directory pathspec stages selected deletions. Never pass deleted paths, use an unscoped commit, or use merge fallback.
4. Require an empty index after the commit. Verify with `git diff-tree --no-commit-id --name-status -r HEAD` that the commit contains only `REQUIREMENTS.md` and the expected seed deletions. Confirm rejected, unmatched, and unselected seeds remain unchanged.

After the commit, native requirements and their PLAN/SUMMARY/VERIFICATION or milestone archive are the sole carrier. Do not create a second migration ledger.
