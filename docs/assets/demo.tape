# un-punt demo recording
# Render with: VHS_NO_SANDBOX=true vhs assets/demo.tape
# Output:      assets/demo.gif
#
# VHS_NO_SANDBOX is required on macOS — vhs uses headless Chrome via go-rod,
# which fails to launch in sandboxed mode. Without the flag you get
# "could not open ttyd: navigation failed: net::ERR_CONNECTION_REFUSED".
# See https://github.com/charmbracelet/vhs/issues/504
#
# Scene order (per repo-readme.md placeholder):
#   1. Agent silently captures a TODO and an `as any` mid-task
#   2. User says "looks good, let's wrap up" and the agent's nudge
#   3. Visible sweep with `npm test` running between fixes
#   4. Four-option disposition prompt; user picks option 3
#
# Setup trick: while Hide is active, we (a) clean the prompt, (b) define a
# `claude` shell function that runs the mock script, (c) clear the screen.
# Then Show triggers, the user "types" claude at a clean prompt, and the
# mock script's output appears as if it were a real Claude Code session.

Output assets/demo.gif

Set FontSize 13
Set Width 1100
Set Height 720
Set Theme "Dracula"
Set TypingSpeed 25ms
Set Padding 16

Hide
Type 'export PS1="$ "'
Enter
Type "claude() { ./assets/demo-session.sh; }"
Enter
Sleep 150ms
Type "clear"
Enter
Sleep 200ms
Show

Type "claude"
Sleep 350ms
Enter
Sleep 17s
