import test from "node:test";
import assert from "node:assert/strict";
import { parseSteCommand, resolveActive, runCheck, stripFrontmatter, steCompletions } from "../helpers.js";

test("parseSteCommand", () => {
  assert.deepEqual(parseSteCommand(""), { type: "set", active: true });
  assert.deepEqual(parseSteCommand("on"), { type: "set", active: true });
  assert.deepEqual(parseSteCommand("off"), { type: "set", active: false });
  assert.deepEqual(parseSteCommand("status"), { type: "status" });
  assert.deepEqual(parseSteCommand("check a.md"), { type: "check", file: "a.md", mode: "mixed" });
  assert.deepEqual(parseSteCommand("check a.md procedural"), {
    type: "check",
    file: "a.md",
    mode: "procedural",
  });
  assert.equal(parseSteCommand("check").type, "invalid");
  assert.equal(parseSteCommand("check a.md wrong").reason, "bad-mode");
  assert.equal(parseSteCommand("bogus").type, "invalid");
});

test("resolveActive reads the last ste-mode entry", () => {
  const entries = [
    { type: "custom", customType: "ste-mode", data: { active: true } },
    { type: "custom", customType: "ste-mode", data: { active: false } },
  ];
  assert.equal(resolveActive(entries), false);
  assert.equal(resolveActive([{ type: "custom", customType: "other" }], true), true);
  assert.equal(resolveActive([], false), false);
  assert.equal(resolveActive("nope", true), true);
});

test("stripFrontmatter", () => {
  assert.equal(stripFrontmatter("---\nname: x\n---\nbody"), "body");
  assert.equal(stripFrontmatter("body"), "body");
});

test("ste_check.py runs from the package location", async () => {
  const bad = await runCheck({
    text: "Prior to commencing the installation, it should be ensured that all components have been thoroughly inspected for damage.",
  });
  assert.equal(bad.code, 1);
  assert.match(bad.output, /should/);

  const good = await runCheck({
    text: "Examine all the components for damage before you start the installation.",
    mode: "procedural",
  });
  assert.equal(good.code, 0);
});

test("steCompletions shows all choices", () => {
  const all = steCompletions("");
  assert.deepEqual(all.map((c) => c.value), ["on", "off", "status", "check"]);
  assert.ok(all.every((c) => c.label && c.description));
});

test("steCompletions filters prefixes and completes modes", () => {
  assert.deepEqual(steCompletions("o").map((c) => c.value), ["on", "off"]);
  assert.deepEqual(steCompletions("check").map((c) => c.value), ["check"]);
  assert.deepEqual(steCompletions("check a.md").map((c) => c.label), [
    "procedural",
    "descriptive",
    "mixed",
  ]);
  assert.deepEqual(steCompletions("check a.md p").map((c) => c.value), ["check a.md procedural"]);
  assert.equal(steCompletions("bogus"), null);
});
