// Pure helpers for the STE pi extension. No pi imports: testable with `node --test`.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SKILL_DIR = path.join(PKG_DIR, "skills", "simplified-technical-english");
export const SKILL_MD = path.join(SKILL_DIR, "SKILL.md");
export const CHECK_SCRIPT = path.join(SKILL_DIR, "scripts", "ste_check.py");

export const MODES = ["procedural", "descriptive", "mixed"];

export const STE_CHOICES = [
  { value: "on", label: "on", description: "Turn STE mode on" },
  { value: "off", label: "off", description: "Turn STE mode off" },
  { value: "status", label: "status", description: "Show the current STE status" },
  { value: "check", label: "check", description: "Check a file: check <file> [procedural|descriptive|mixed]" },
];

// Argument completions for the /ste command. Returns null when nothing matches.
export function steCompletions(prefix) {
  const arg = String(prefix || "");
  const parts = arg.split(/\s+/);
  if (parts[0] === "check" && parts[1]) {
    const modePrefix = parts[2] || "";
    return MODES.filter((m) => m.startsWith(modePrefix)).map((m) => ({
      value: `check ${parts[1]} ${m}`,
      label: m,
      description: `Check ${parts[1]} in ${m} mode`,
    }));
  }
  const hits = STE_CHOICES.filter((c) => c.value.startsWith(arg.trim()));
  return hits.length > 0 ? hits : null;
}

export function parseSteCommand(args) {
  const parts = String(args || "").trim().split(/\s+/).filter(Boolean);
  const [cmd, ...rest] = parts;
  if (!cmd || cmd === "on") return { type: "set", active: true };
  if (cmd === "off") return { type: "set", active: false };
  if (cmd === "status") return { type: "status" };
  if (cmd === "check") {
    const [file, mode] = rest;
    if (!file) return { type: "invalid", reason: "no-file" };
    if (mode && !MODES.includes(mode)) return { type: "invalid", reason: "bad-mode", mode };
    return { type: "check", file, mode: mode || "mixed" };
  }
  return { type: "invalid", reason: "unknown", cmd };
}

export function resolveActive(entries, fallback = false) {
  if (!Array.isArray(entries)) return fallback;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.type !== "custom" || entry?.customType !== "ste-mode") continue;
    const data = entry?.data;
    if (data && typeof data.active === "boolean") return data.active;
  }
  return fallback;
}

export function stripFrontmatter(text) {
  return String(text || "").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

export function loadInstructions() {
  try {
    const body = stripFrontmatter(readFileSync(SKILL_MD, "utf8"));
    if (!body) return "";
    return (
      `${body}\n\n` +
      "Write all the technical text that you produce in Simplified Technical English " +
      "until the user turns STE off with /ste off."
    );
  } catch {
    return "";
  }
}

export function runCheck({ file, text, mode } = {}) {
  const m = MODES.includes(mode) ? mode : "mixed";
  return new Promise((resolve) => {
    const args = ["--mode", m];
    if (file) args.push(file);
    const child = spawn("python3", [CHECK_SCRIPT, ...args]);
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ code: -1, output: `Cannot start python3: ${e.message}` }));
    child.on("close", (code) => resolve({ code, output: out || err }));
    child.stdin.end(text === undefined ? "" : String(text));
  });
}
