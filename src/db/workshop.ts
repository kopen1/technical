import type { Env } from "../env";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
};

export type Repair = {
  id: string;
  customerId: string;
  deviceBrand: string;
  deviceModel: string;
  symptom: string;
  status: string;
  diagnosis: string;
  action: string;
  serviceFee: number;
  discount: number;
  note: string;
  createdAt: string;
  updatedAt: string;
  parts: Part[];
  income: number;
  expense: number;
  profit: number;
};

export type Part = {
  id: string;
  repairId: string;
  name: string;
  cost: number;
  price: number;
  qty: number;
};

type RepairRow = {
  id: string;
  customer_id: string;
  device_brand: string;
  device_model: string;
  symptom: string;
  status: string;
  diagnosis: string;
  action: string;
  service_fee: number;
  discount: number;
  note: string;
  created_at: string;
  updated_at: string;
};

function partRow(p: any): Part {
  return { id: p.id, repairId: p.repair_id, name: p.name, cost: p.cost, price: p.price, qty: p.qty };
}

export async function listCustomers(env: Env): Promise<Customer[]> {
  const rows = await env.DB.prepare("SELECT * FROM customers ORDER BY name").all<Customer>();
  return rows.results.map(r => ({ id: r.id, name: r.name, phone: r.phone, address: r.address, notes: r.notes }));
}

export async function createCustomer(env: Env, c: Partial<Customer>): Promise<Customer | null> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO customers (id,name,phone,address,notes) VALUES (?,?,?,?,?)"
  ).bind(id, c.name ?? "", c.phone ?? "", c.address ?? "", c.notes ?? "").run();
  const row = await env.DB.prepare("SELECT * FROM customers WHERE id = ?").bind(id).first<Customer>();
  return row ?? null;
}

export async function updateCustomer(env: Env, id: string, c: Partial<Customer>) {
  await env.DB.prepare(
    "UPDATE customers SET name=?, phone=?, address=?, notes=? WHERE id=?"
  ).bind(c.name ?? "", c.phone ?? "", c.address ?? "", c.notes ?? "", id).run();
}

export async function deleteCustomer(env: Env, id: string) {
  const repairs = await env.DB.prepare("SELECT id FROM repairs WHERE customer_id = ?").bind(id).all<{id:string}>();
  for (const r of repairs.results) await deleteRepair(env, r.id);
  await env.DB.prepare("DELETE FROM customers WHERE id = ?").bind(id).run();
}

export async function listRepairs(env: Env): Promise<Repair[]> {
  const rows = await env.DB.prepare(
    "SELECT * FROM repairs ORDER BY created_at DESC"
  ).all<RepairRow>();
  const out: Repair[] = [];
  for (const r of rows.results) {
    const parts = await env.DB.prepare(
      "SELECT * FROM parts WHERE repair_id = ?"
    ).bind(r.id).all<any>();
    const ps = parts.results.map(partRow);
    const expense = ps.reduce((s, p) => s + p.cost * p.qty, 0);
    const partsIncome = ps.reduce((s, p) => s + p.price * p.qty, 0);
    const income = r.service_fee - (r.discount || 0) + partsIncome;
    out.push({
      id: r.id,
      customerId: r.customer_id,
      deviceBrand: r.device_brand,
      deviceModel: r.device_model,
      symptom: r.symptom,
      status: r.status,
      diagnosis: r.diagnosis,
      action: r.action,
      serviceFee: r.service_fee,
      discount: r.discount,
      note: r.note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      parts: ps,
      income,
      expense,
      profit: income - expense
    });
  }
  return out;
}

export async function createRepair(env: Env, r: Partial<Repair>): Promise<Repair | null> {
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO repairs (id,customer_id,device_brand,device_model,symptom,status,diagnosis,action,service_fee,discount,note)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, r.customerId ?? "", r.deviceBrand ?? "", r.deviceModel ?? "", r.symptom ?? "",
    r.status ?? "received", r.diagnosis ?? "", r.action ?? "",
    r.serviceFee ?? 0, r.discount ?? 0, r.note ?? ""
  ).run();
  return listRepairs(env).then(l => l.find(x => x.id === id) ?? null);
}

export async function updateRepair(env: Env, id: string, r: Partial<Repair>) {
  await env.DB.prepare(`
    UPDATE repairs SET
      customer_id=?, device_brand=?, device_model=?, symptom=?, status=?,
      diagnosis=?, action=?, service_fee=?, discount=?, note=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(
    r.customerId ?? "", r.deviceBrand ?? "", r.deviceModel ?? "", r.symptom ?? "", r.status ?? "",
    r.diagnosis ?? "", r.action ?? "", r.serviceFee ?? 0, r.discount ?? 0, r.note ?? "", id
  ).run();
}

export async function deleteRepair(env: Env, id: string) {
  await env.DB.prepare("DELETE FROM parts WHERE repair_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM repairs WHERE id = ?").bind(id).run();
}

export async function addPart(env: Env, repairId: string, p: Partial<Part>): Promise<Part | null> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO parts (id,repair_id,name,cost,price,qty) VALUES (?,?,?,?,?,?)"
  ).bind(id, repairId, p.name ?? "", p.cost ?? 0, p.price ?? 0, p.qty ?? 1).run();
  const row = await env.DB.prepare("SELECT * FROM parts WHERE id = ?").bind(id).first<any>();
  return row ? partRow(row) : null;
}

export async function updatePart(env: Env, id: string, p: Partial<Part>) {
  await env.DB.prepare(
    "UPDATE parts SET name=?, cost=?, price=?, qty=? WHERE id=?"
  ).bind(p.name ?? "", p.cost ?? 0, p.price ?? 0, p.qty ?? 1, id).run();
}

export async function deletePart(env: Env, id: string) {
  await env.DB.prepare("DELETE FROM parts WHERE id = ?").bind(id).run();
}

export async function report(env: Env) {
  const repairs = await listRepairs(env);
  const income = repairs.reduce((s, r) => s + r.income, 0);
  const expense = repairs.reduce((s, r) => s + r.expense, 0);
  const byStatus: Record<string, number> = {};
  for (const r of repairs) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const done = repairs.filter(r => ["done", "returned", "closed"].includes(r.status));
  return {
    totalRepairs: repairs.length,
    completed: done.length,
    income,
    expense,
    profit: income - expense,
    byStatus,
    topDevices: Object.entries(
      repairs.reduce<Record<string, number>>((m, r) => {
        const k = (r.deviceBrand + " " + r.deviceModel).trim() || "?";
        m[k] = (m[k] || 0) + 1;
        return m;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 10)
  };
}
