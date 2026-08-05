import type { Env } from "../env";

export type Submission = {
  id: string;
  kind: "case" | "visual" | "reference";
  status: "pending" | "approved" | "rejected";
  payload: any;
  reviewerNotes: string;
  imageId?: string;
  createdAt: string;
};

type SubmissionRow = {
  id: string;
  kind: string;
  status: string;
  payload: string;
  reviewer_notes: string;
  created_at: string;
};

export async function createSubmission(
  env: Env,
  kind: Submission["kind"],
  payload: any,
  imageId?: string
): Promise<Submission> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO submissions (id,kind,status,payload) VALUES (?,?,?,?)"
  ).bind(id, kind, "pending", JSON.stringify(payload)).run();
  if (imageId) {
    await env.DB.prepare(
      "INSERT INTO submissions_visuals (submission_id,image_id) VALUES (?,?)"
    ).bind(id, imageId).run();
  }
  const created = await getSubmission(env, id);
  return created!;
}

export async function getSubmission(env: Env, id: string): Promise<Submission | null> {
  const row = await env.DB.prepare(
    "SELECT id,kind,status,payload,reviewer_notes,created_at FROM submissions WHERE id = ?"
  ).bind(id).first<SubmissionRow>();
  if (!row) return null;
  const img = await env.DB.prepare(
    "SELECT image_id FROM submissions_visuals WHERE submission_id = ?"
  ).bind(id).first<{image_id:string}>();
  return {
    id: row.id,
    kind: row.kind as Submission["kind"],
    status: row.status as Submission["status"],
    payload: JSON.parse(row.payload),
    reviewerNotes: row.reviewer_notes,
    imageId: img?.image_id,
    createdAt: row.created_at
  };
}

export async function listSubmissions(env: Env, status?: string) {
  const sql = status
    ? "SELECT id,kind,status,payload,reviewer_notes,created_at FROM submissions WHERE status = ? ORDER BY created_at DESC"
    : "SELECT id,kind,status,payload,reviewer_notes,created_at FROM submissions ORDER BY created_at DESC";
  const rows = status
    ? await env.DB.prepare(sql).bind(status).all<SubmissionRow>()
    : await env.DB.prepare(sql).all<SubmissionRow>();
  const out: Submission[] = [];
  for (const r of rows.results) {
    const img = await env.DB.prepare(
      "SELECT image_id FROM submissions_visuals WHERE submission_id = ?"
    ).bind(r.id).first<{image_id:string}>();
    out.push({
      id: r.id,
      kind: r.kind as Submission["kind"],
      status: r.status as Submission["status"],
      payload: JSON.parse(r.payload),
      reviewerNotes: r.reviewer_notes,
      imageId: img?.image_id,
      createdAt: r.created_at
    });
  }
  return out;
}

export async function setSubmissionStatus(
  env: Env,
  id: string,
  status: Submission["status"],
  notes = ""
) {
  await env.DB.prepare(`
    UPDATE submissions SET status=?, reviewer_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).bind(status, notes, id).run();
  return getSubmission(env, id);
}

export async function deleteSubmissionImage(env: Env, imageId: string) {
  await env.DB.prepare("DELETE FROM visual_images WHERE id = ?").bind(imageId).run();
  await env.DB.prepare("DELETE FROM submissions_visuals WHERE image_id = ?").bind(imageId).run();
}
