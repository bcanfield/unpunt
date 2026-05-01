#!/usr/bin/env bash
# Mock Claude Code session for the un-punt demo GIF.
# Locks the scene script for `assets/demo.tape`.
# When a real MVP exists, replace this with a real `claude` invocation
# against a prepared scratch repo.
#
# The tape sets up a `claude` function and the user "types" `claude` at the
# prompt before this script runs — so we DO NOT clear the screen here, and
# we DO NOT print "$ claude" (the user has already typed it).

USER_TXT=$'\033[1;33m'              # bold yellow — user input
SYSTEM=$'\033[1;36m'                # bold cyan   — system / status messages (readable on Dracula)
GREEN=$'\033[1;32m'                 # bold green  — verification ticks, added lines
RESET=$'\033[0m'

beat() { sleep "$1"; }

# Type a user line char-by-char at ~25ms/char to match vhs's TypingSpeed.
# Use this for any line that should appear as if the user typed it.
type_user() {
  local text="$1"
  printf '%s' "${USER_TXT}"
  for ((i=0; i<${#text}; i++)); do
    printf '%s' "${text:$i:1}"
    sleep 0.025
  done
  printf '%s\n' "${RESET}"
}

beat 0.6

# ---------- Scene 1 — coding mid-task; capture happens silently ----------

type_user "> implement the OAuth refresh handler"
beat 0.4
echo
echo "Casting to \`as any\` for now; we should tighten this when we touch refresh next."
beat 0.5
echo
printf '%s\n' "${SYSTEM}[Edit src/auth/oauth.ts]${RESET}"
beat 0.4
printf '%s\n' "${GREEN}+ function refreshToken(resp: any) {  // TODO: tighten based on grant_type${RESET}"
beat 0.7
printf '%s\n' "${SYSTEM}[un-punt: captured up-7f3a (type-loosened), up-2d11 (deferred-implementation)]${RESET}"
beat 1.6

# ---------- Scene 2 — wrap-up signal; agent nudges ----------

echo
type_user "> ok looks good, let's wrap up"
beat 0.3
echo
echo "I noted 11 items today. Want a quick cleanup pass?"
echo "You'll see each change; you pick where the commits go."
beat 1.4
echo
type_user "> yes"
beat 0.5

# ---------- Scene 3 — visible sweep (2 items shown + summary) ----------

echo
printf '%s\n' "${SYSTEM}[Pre-flight passed]${RESET}"
beat 0.6

echo
echo "Working on up-7f3a (Tighten Token type)..."
beat 0.4
printf '%s\n' "  npm test            ${GREEN}✓ 12/12${RESET}"
beat 0.4
echo "  stage cleanup commit"
beat 0.5

echo
echo "Working on up-2d11 (Replace .skip)..."
beat 0.4
printf '%s\n' "  npm test            ${GREEN}✓ 13/13${RESET}"
beat 0.4
echo "  stage cleanup commit"
beat 0.6

echo
printf '%s\n' "${SYSTEM}[2 more items processed]${RESET}"
beat 1.0

# ---------- Scene 4 — completion ----------
# We end here. The full disposition prompt + "you pick where commits go"
# story is carried by the dialogue text below the GIF and the
# "Visible cleanup in your tree" bullet in *What you get*.

echo
echo "Done. 4 cleanup items completed. Verified."
beat 1.5
