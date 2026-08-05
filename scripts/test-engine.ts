import { SEED_CASES } from "../src/data/seed";
import { searchCases, relatedCases, start, answer, getSession } from "../src/engine/engine";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

const ids = new Set(SEED_CASES.map(c => c.id));
check("seed: id unik", ids.size === SEED_CASES.length);
check("seed: slug unik", new Set(SEED_CASES.map(c => c.slug)).size === SEED_CASES.length);
check("seed: tiap kasus punya steps", SEED_CASES.every(c => c.steps.length > 0));
check(
  "seed: step id unik per kasus",
  SEED_CASES.every(c => new Set(c.steps.map(s => s.id)).size === c.steps.length)
);
check("seed: semua punya source", SEED_CASES.every(c => !!c.source));

const results = searchCases(SEED_CASES, "A52", "charging");
check("search: model A52 + symptom charging ketemu", results.results.some(c => c.id === "sam-a52-charge"));

const bySymptom = searchCases(SEED_CASES, "", "mati total");
check(
  "search: symptom 'mati total' urut skor",
  bySymptom.results[0].faultGroup === "power_short" || bySymptom.results[0].faultGroup === "power_path",
  `top = ${bySymptom.results[0].title}`
);

const base = SEED_CASES.find(c => c.id === "sam-a52-charge")!;
const rel = relatedCases(SEED_CASES, base);
check("related: mengecualikan dirinya", rel.every(c => c.id !== base.id));
check("related: faultGroup yang sama muncul", rel.some(c => c.faultGroup === base.faultGroup));

const target = SEED_CASES.find(c => c.id === "sam-a52-charge")!;
const started = start(SEED_CASES, target.id)!;
check("start: session dibuat", !!started.session.id && started.session.caseId === target.id);
check("start: step pertama diberikan", started.step?.id === target.steps[0].id);
check("start: total steps", started.total === target.steps.length);

const invalid = start(SEED_CASES, "tidak-ada");
check("start: caseId invalid -> null", invalid === null);

let cur = started!;
for (const step of target.steps) {
  cur = answer(SEED_CASES, cur.session.id, step.testPoint ? "5.0V" : "OK")!;
}
check("answer: semua step selesai", cur.done === true);
check("answer: status DONE", cur.session.status === "DONE");
check("answer: evidence terisi", cur.session.evidence.length === target.steps.length);

const a52 = SEED_CASES.find(c => c.id === "sam-a52-charge")!;
const s = start(SEED_CASES, a52.id)!;
answer(SEED_CASES, s.session.id, "5.0V");
const a1 = answer(SEED_CASES, s.session.id, "5.1V")!;
check("rule: step s2 value 5.x -> notice normal", a1.notice?.includes("normal"), `notice=${a1.notice ?? "none"}`);
const s2 = start(SEED_CASES, a52.id)!;
const b1 = answer(SEED_CASES, s2.session.id, "5.0V")!;
const b2 = answer(SEED_CASES, s2.session.id, "0.3V")!;
check("rule: step s2 value 0.x -> notice OVP", b2.notice?.includes("OVP"), `notice=${b2.notice ?? "none"}`);

const bogus = answer(SEED_CASES, "sessi-tidak-ada", "x");
check("answer: sessionId invalid -> null", bogus === null);

const g = getSession(cur.session.id);
check("getSession: session tersedia", g?.id === cur.session.id);

console.log(failed === 0 ? "\nSemua test lolos." : `\n${failed} test gagal.`);
process.exit(failed === 0 ? 0 : 1);
