import { StringEnum, Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { loadInstructions, parseSteCommand, resolveActive, runCheck } from "./helpers.js";

const steInstructions = loadInstructions();

const STE_COMMAND_DESCRIPTION =
  "STE mode: /ste [on|off|status|check <file> [procedural|descriptive|mixed]]. No argument turns STE on.";

const steCheckTool = defineTool({
  name: "ste_check",
  label: "STE check",
  description:
    "Check text or a file against the Simplified Technical English (ASD-STE100) writing rules. " +
    "Use it when you write or review technical documentation, procedures, manuals, instructions, " +
    "or reports. Give the text directly, or give a file path. The mode 'procedural' applies the " +
    "20-word sentence limit, 'descriptive' applies 25 words, and 'mixed' (the default) checks both.",
  parameters: Type.Object({
    text: Type.Optional(Type.String({ description: "Text to check. Used when no file is given." })),
    file: Type.Optional(Type.String({ description: "Path of the file to check." })),
    mode: Type.Optional(StringEnum(["procedural", "descriptive", "mixed"])),
  }),

  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    if (!params.file && params.text === undefined) {
      throw new Error("Give the text, or give a file path.");
    }
    const result = await runCheck(params);
    return {
      content: [{ type: "text", text: result.output || "(no output)" }],
      details: { exitCode: result.code, mode: params.mode || "mixed", file: params.file || null },
    };
  },
});

export default function steExtension(pi) {
  let active = false;
  let lastCtx = null;

  function syncStatus(ctx) {
    if (ctx) lastCtx = ctx;
    const c = ctx || lastCtx;
    if (!c?.ui?.setStatus) return;
    // ponytail: try/catch guards against a theme proxy throwing before init
    let theme;
    try {
      theme = c.ui.theme;
      if (!theme?.fg) return;
    } catch {
      return;
    }
    c.ui.setStatus("ste", active ? theme.fg("accent", " STE") : "");
  }

  const setMode = (value, ctx) => {
    active = value;
    pi.appendEntry("ste-mode", { active: value });
    syncStatus(ctx);
    ctx?.ui?.notify?.(
      value ? "STE mode on. Technical text now obeys ASD-STE100." : "STE mode off.",
      "info"
    );
  };

  const sendSkillAlias = (args, ctx) => {
    const extra = String(args || "").trim();
    const message = extra
      ? `/skill:simplified-technical-english ${extra}`
      : "/skill:simplified-technical-english";
    if (ctx?.isIdle?.() === false) {
      pi.sendUserMessage(message, { deliverAs: "followUp" });
      ctx?.ui?.notify?.("Skill queued as a follow-up.", "info");
      return;
    }
    pi.sendUserMessage(message);
  };

  pi.registerCommand("ste", {
    description: STE_COMMAND_DESCRIPTION,
    handler: async (args, ctx) => {
      const parsed = parseSteCommand(args);
      if (parsed.type === "set") return setMode(parsed.active, ctx);
      if (parsed.type === "status") {
        return ctx?.ui?.notify?.(`STE mode: ${active ? "on" : "off"}`, "info");
      }
      if (parsed.type === "check") {
        const result = await runCheck(parsed);
        const level = result.code === 0 ? "info" : "warning";
        return ctx?.ui?.notify?.(result.output || "(no output)", level);
      }
      ctx?.ui?.notify?.(
        "Unknown /ste argument. Use: /ste [on|off|status|check <file> [procedural|descriptive|mixed]]",
        "warning"
      );
    },
  });

  pi.registerCommand("ste-skill", {
    description: "Use the simplified-technical-english skill one time (no persistent mode)",
    handler: (args, ctx) => sendSkillAlias(args, ctx),
  });

  pi.registerTool(steCheckTool);

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx?.sessionManager?.getBranch?.() || ctx?.sessionManager?.getEntries?.() || [];
    active = resolveActive(entries);
    syncStatus(ctx);
    ctx?.ui?.notify?.(`STE loaded: ${active ? "on" : "off"}`, "info");
  });

  pi.on("before_agent_start", async (event) => {
    if (!active || !steInstructions) return;
    // Guard a missing systemPrompt: do not crash, do not inject "undefined".
    const base = event?.systemPrompt ? `${event.systemPrompt}\n\n` : "";
    return { systemPrompt: `${base}${steInstructions}` };
  });
}
