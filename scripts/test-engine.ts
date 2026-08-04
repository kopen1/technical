import { SEED_CASES } from "../src/data/seed";
import { searchCases, start, answer, getSession } from "../src/engine/engine";

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

const results = searchCases("A52", "charging");
check("search: model A52 + symptom charging ketemu", results.some(c => c.id === "sam-a52-charge"));

const bySymptom = searchCases("", "mati total");
check(
  "search: symptom 'mati total' urut skor",
  bySymptom[0].faultGroup === "power_short" || bySymptom[0].faultGroup === "power_path",
  `top = ${bySymptom[0].title}`
);

const target = SEED_CASES[0];
const started = start(target.id)!;
check("start: session dibuat", !!started.session.id && started.session.caseId === target.id);
check("start: step pertama diberikan", started.step?.id === target.steps[0].id);

const invalid = start("tidak-ada");
check("start: caseId invalid -> null", invalid === null);

let cur = started!;
for (const step of target.steps) {
  cur = answer(cur.session.id, "OK")!;
}
check("answer: semua step selesai", cur.done === true);
check("answer: status DONE", cur.session.status === "DONE");
check("answer: evidence terisi", cur.session.evidence.length === target.steps.length);

const bogus = answer("sessi-tidak-ada", "x");
check("answer: sessionId invalid -> null", bogus === null);

const s = getSession(cur.session.id);
check("getSession: session tersedia", s?.id === cur.session.id);

console.log(failed === 0 ? "\nSemua test lolos." : `\n${failed} test gagal.`);
process.exit(failed === 0 ? 0 : 1);
