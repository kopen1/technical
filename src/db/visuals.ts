import type { Env } from "../env";

export type VisualType =
  | "board" | "connector" | "component" | "schematic" | "test_point" | "thermal" | "other";

export type VerificationStatus = "verified" | "community" | "external" | "unverified";

export type Annotation = {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  metadata?: string;
};

export type VisualReference = {
  id: string;
  caseId: string;
  imageId?: string;
  imageType: VisualType;
  caption: string;
  source: string;
  verificationStatus: VerificationStatus;
  annotations: Annotation[];
  sortOrder: number;
  url?: string;
};

type VisualRow = {
  id: string;
  case_id: string;
  image_id: string | null;
  image_type: string;
  caption: string;
  source: string;
  verification_status: string;
  annotations: string;
  sort_order: number;
};

function rowToVisual(r: VisualRow): VisualReference {
  let annotations: Annotation[] = [];
  try {
    annotations = JSON.parse(r.annotations);
  } catch {
    annotations = [];
  }
  const v: VisualReference = {
    id: r.id,
    caseId: r.case_id,
    imageId: r.image_id ?? undefined,
    imageType: (r.image_type || "other") as VisualType,
    caption: r.caption,
    source: r.source,
    verificationStatus: (r.verification_status || "unverified") as VerificationStatus,
    annotations,
    sortOrder: r.sort_order,
    url: r.image_id ? `/api/images/${r.image_id}` : undefined
  };
  return v;
}

export async function saveImage(env: Env, mime: string, data: ArrayBuffer): Promise<string> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO visual_images (id,mime,data,size) VALUES (?,?,?,?)"
  ).bind(id, mime || "application/octet-stream", data, data.byteLength).run();
  return id;
}

export async function getImage(env: Env, id: string) {
  const row = await env.DB.prepare(
    "SELECT id,mime,data FROM visual_images WHERE id = ?"
  ).bind(id).first<{id:string;mime:string;data:ArrayBuffer}>();
  return row ?? null;
}

export async function deleteImage(env: Env, id: string) {
  await env.DB.prepare("DELETE FROM visual_images WHERE id = ?").bind(id).run();
}

export async function listVisualsByCase(env: Env, caseId: string): Promise<VisualReference[]> {
  const rows = await env.DB.prepare(
    "SELECT * FROM visual_references WHERE case_id = ? ORDER BY sort_order, created_at"
  ).bind(caseId).all<VisualRow>();
  return rows.results.map(rowToVisual);
}

export async function getVisual(env: Env, id: string): Promise<VisualReference | null> {
  const row = await env.DB.prepare("SELECT * FROM visual_references WHERE id = ?").bind(id).first<VisualRow>();
  return row ? rowToVisual(row) : null;
}

export async function createVisual(
  env: Env,
  v: Omit<VisualReference, "id" | "url">,
  imageId?: string
) {
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO visual_references
      (id,case_id,image_id,image_type,caption,source,verification_status,annotations,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).bind(
    id, v.caseId, imageId ?? null, v.imageType, v.caption, v.source,
    v.verificationStatus, JSON.stringify(v.annotations), v.sortOrder
  ).run();
  return getVisual(env, id);
}

export async function updateVisual(
  env: Env,
  id: string,
  fields: Partial<Omit<VisualReference, "id" | "url">>
) {
  const cur = await getVisual(env, id);
  if (!cur) return null;
  const next = { ...cur, ...fields };
  await env.DB.prepare(`
    UPDATE visual_references SET
      image_type=?, caption=?, source=?, verification_status=?,
      annotations=?, sort_order=?, updated_at=CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    next.imageType, next.caption, next.source, next.verificationStatus,
    JSON.stringify(next.annotations), next.sortOrder, id
  ).run();
  return getVisual(env, id);
}

export async function deleteVisual(env: Env, id: string) {
  const cur = await getVisual(env, id);
  if (!cur) return false;
  if (cur.imageId) await deleteImage(env, cur.imageId);
  await env.DB.prepare("DELETE FROM visual_references WHERE id = ?").bind(id).run();
  return true;
}
