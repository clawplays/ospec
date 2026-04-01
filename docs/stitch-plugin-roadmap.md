# Stitch Plugin Roadmap

## Goals

This document records the future expansion directions for the `stitch` plugin beyond the current specification, helping to advance in stages without pushing all capabilities into the current implementation at once.

## Currently Completed

- Project-level plugin enabling/disabling
- Workflow injection of `stitch_design_review`
- `verify` / `archive` gates
- `ospec plugins run stitch`
- `ospec plugins approve stitch` / `reject stitch`
- `ospec plugins doctor stitch`
- `approval.json` / `summary.md` / `result.json`
- AI protocol and skill prompt linkage
- Built-in `Gemini CLI + stitch MCP` default runner
- Clear diagnostic tips for missing Gemini CLI / stitch MCP / auth hints

## Phase A: Gemini CLI MCP Adapter

Goal: Deepen the currently available built-in Gemini adaptation path, completing stronger execution stability and standardized constraints.

Current Status: Partially implemented.

Suggestions:

- Solidify input/output contracts for `gemini-stitch-adapter`
- Further improve the stability of the contract for Gemini CLI returns to OSpec (`preview_url / summary_markdown / metadata / artifacts`)
- Add stronger pre-execution probes to distinguish between "installed" and "actually callable"
- Provide more precise prompts when local Gemini CLI is not installed, `stitch` MCP is not configured, authentication is missing, or Gemini upstream is unreachable

User Collaboration Needed:

- Verify in a real environment that Gemini CLI can successfully call stitch MCP and return a reviewable preview URL
- Provide recommended prompts or calling constraints for stitch MCP if more stable structured returns are required

## Phase B: Built-in Stitch API Adapter

Goal: No longer rely on external wrappers; implement a built-in Stitch API adaptation layer directly in OSpec.

Suggestions:

- Read project or user-level token configurations directly
- Initiate Stitch page generation/update requests directly
- Poll task status and generate the final `preview_url`
- Write structured errors to `result.json` upon failure

User Collaboration Needed:

- Provide stable API documentation
- Provide authentication methods and rate-limiting policies
- Provide error codes/task status semantics

## Phase C: Richer Review Artifacts

Goal: Make `stitch_design_review` more than just a URL, but a set of reviewable artifacts.

Suggestions:

- Preview screenshots
- Page version numbers or revision IDs
- Design summary for this session
- Design diff / change descriptions
- Templates for manual review notes

## Phase D: Multiple Capabilities

Goal: Support multiple sub-capabilities within a single `stitch` plugin.

Candidate Capabilities:

- `page_design_review`
- `component_design_review`
- `variant_comparison`
- `landing_page_generation`

Each capability needs to define:

- Step name
- Trigger flags
- Whether it is blocking
- Artifact structure
- Flow position where AI should insert it

## Phase E: Multi-Plugin Coordination

Goal: Support not only `stitch` but also multiple plugins coexisting in the workflow.

Suggestions:

- Parallel enabling of multiple plugins
- Control over plugin step order
- Conflict resolution for similar blocking gates
- More general abstraction of `result.json / approval.json` specifications

## Phase F: Health Checks and Observability

Goal: Make the plugin system easier to troubleshoot and operate.

Suggestions:

- Reachability checks for preview URLs
- Runner execution time statistics
- Summary of the most recent run
- Enhanced `doctor` output
- Optional debug logs

## Most Recommended Next Step

Considering your current real-world landing efficiency, the suggested order is:

1. Complete "Gemini CLI MCP Adapter" first
2. Then add "Richer Review Artifacts"
3. Finally consider "Built-in Stitch API Adapter"

Reasons:

- Your current machine already has Gemini CLI installed and stitch MCP configured
- This path is closest to your current actual usage
- It can fastest turn "new change -> Stitch preview -> user acceptance -> continue change" into a complete production flow
