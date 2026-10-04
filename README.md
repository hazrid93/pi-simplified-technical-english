# pi-simplified-technical-english

Simplified Technical English (STE) for the [pi](https://github.com/earendil-works/pi-coding-agent) coding agent.
STE is a controlled language for technical documentation, based on the ASD-STE100 specification.
This package gives pi:

- a **skill** that makes the agent write technical text in STE,
- a **`/ste` command** that turns a persistent STE mode on and off for the session,
- a **`ste_check` tool** that the agent can call to check text against the STE rules.

## Install

    pi install npm:pi-simplified-technical-english

or from git:

    pi install git:github.com/hazrid93/pi-simplified-technical-english

## Use

- `/ste` — turn STE mode on. The agent writes all technical text in STE for the rest of the session.
- `/ste off` — turn STE mode off.
- `/ste status` — show the current mode.
- `/ste check <file> [procedural|descriptive|mixed]` — run the STE check tool on a file and show the report.
- Type `/ste ` with a space — pi shows all choices (`on`, `off`, `status`, `check`, and the check modes) in the autocomplete menu.
- When STE mode is on, the footer shows a `§ STE` indicator.
- `/ste-skill [text]` — use the STE skill one time, without the persistent mode.
- Ask the agent to "check this text in STE" — the agent can call the `ste_check` tool on text or on a file.

Pi loads the skill (`skills/simplified-technical-english/SKILL.md`) automatically. The agent also follows STE whenever you ask for Simplified Technical English, controlled language, or plain technical writing, without a command.

The check tool needs `python3` on the PATH.

## Test

    npm test

## Source and license

The STE rules, word list, substitutions, examples, and the check script come from [0xpili/simplified-technical-english](https://github.com/0xpili/simplified-technical-english) (MIT).

The ASD-STE100 specification and its dictionary are the property of ASD. This package is not an official ASD product and does not certify compliance with ASD-STE100. See `NOTICE.md`.
