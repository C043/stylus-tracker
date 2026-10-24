#!/usr/bin/env bash
# PreToolUse(Bash): agents must never write git history (see AGENTS.md).
cmd=$(jq -r '.tool_input.command // ""')
# A git invocation (any global options) followed, within the same simple command, by a history-writing subcommand.
if printf '%s' "$cmd" | grep -Eq '(^|[;&|(`$[:space:]])git([[:space:]]+[^;&|[:space:]]+)*[[:space:]]+(commit|push|tag|merge|rebase|cherry-pick|revert|reset|am)([[:space:]]|$|;|&|\|)'; then
	echo "Blocked: agents must not commit or rewrite git history in this repo (AGENTS.md). Leave changes in the working tree and summarise them for the maintainer." >&2
	exit 2
fi
exit 0
