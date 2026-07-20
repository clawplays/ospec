# Goal workflow interface changes in 1.8.21

OSpec 1.8.21 adds an explicit, audited force-archive path for a user who knowingly accepts an incomplete Change or Goal.

## Command contract

```bash
ospec finalize changes/active/<change> \
  --force-archive \
  --confirm-force-archive <exact-change-name> \
  --reason "<explicit accepted risk>"
```

`--reason-file <path>` may replace `--reason`. The force flag and exact-name confirmation form the double check; the non-empty reason is retained in the archive. A normally ready change rejects force mode and must use ordinary `ospec finalize`.

## Preserved truth

Force archive bypasses readiness and completion gates only. Failed checks, pending steps, blockers, and `NOT_VERIFIED` evidence remain unchanged. OSpec writes `artifacts/agents/force-archive.json` and marks archived state, proposal metadata, generated change knowledge, `docs/project/feature-index.md`, and `SKILL.index.json.archived_changes` as `forced`, `incomplete`, and `accepted-risk`. Generated force-archive knowledge never uses the `completed` tag.

The operation still refuses targets outside `changes/active`, human-owned knowledge-document collisions, unwritable archive outputs, and any pending Loop action that could still write evidence. Post-move failures roll the change, state, proposal, force record, generated knowledge, links, and indexes back to the active location.

## AI behavior

AI must not infer force-archive authorization from urgency, a durable blocker, or a general request to finish. The user must explicitly request force archive. Before invoking it, report unresolved gates and `NOT_VERIFIED` items and confirm the Loop has no pending action or live child.
