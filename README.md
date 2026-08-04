# TechniKit V3

Platform pengetahuan diagnostik untuk teknisi perbaikan HP/elektronik. Berbasis aturan (rule-based), bukan AI — transparan, bisa diaudit, dan tidak mengarang nilai reference.

> "Jangan menebak. Ikuti jalurnya." — mulai dari gejala, lakukan pemeriksaan, catat evidence, lalu ikuti langkah berikutnya.

## Apa itu TechniKit?

TechniKit adalah toolkit diagnostik yang membantu teknisi memeriksa kerusakan secara terstruktur:

- **Kasus nyata**: tiap kasus punya langkah pemeriksaan, metode ukur, dan test point.
- **Rule-based engine**: diagnosis berjalan langkah demi langkah berdasarkan aturan, bukan model AI.
- **Evidence-based**: setiap hasil pemeriksaan dicatat sebagai evidence yang bisa diaudit.
- **Kualitas data dijaga**: nilai dibedakan menjadi `verified`, `community`, `external reference`, dan `unknown`. Nilai yang belum terverifikasi ditampilkan sebagai "Perlu verifikasi", bukan angka buatan.

## Fungsionalitas

### Publik
| Fitur | Keterangan |
|---|---|
| Landing page | Cari kasus, mulai diagnosis, lihat daftar kasus awal |
| Diagnostic Engine | Pilih kasus → ikuti langkah pemeriksaan → input hasil → lanjut ke langkah berikutnya |
| Public case pages | Halaman dokumentasi per kasus (`/diagnosis/<slug>`) dengan langkah + test point |
| SEO | `sitemap.xml` dan `robots.txt` untuk indexing Google |
| Pencarian | `/api/search?model=&symptom=` mencari kasus berdasarkan skor |

### Alur diagnosis
1. Pengguna memilih kasus (mis. "Vivo Y19s 4G — Mati total").
2. Engine memberikan langkah pertama (mis. "Ukur rail VDD1V85").
3. Teknisi memasukkan hasil pemeriksaan → tersimpan sebagai evidence.
4. Engine maju ke langkah berikutnya sampai selesai (`status: DONE`).

### Admin (private)
| Fitur | Keterangan |
|---|---|
| Dashboard | Ringkasan jumlah cases, sessions, evidence, dan visits |
| Analytics | Pengunjung berdasarkan negara (via header `CF-IPCountry`) dan halaman |
| Sessions | Riwayat sesi diagnosis terbaru dari D1 |
| Modul & navigasi | Atur visibilitas dan status enable tiap menu admin |

Autentikasi admin memakai `Authorization: Bearer base64(username:secret)` dari secret Worker. **Ini masih dev-grade** — versi production sebaiknya memakai password hashing + HTTP-only cookie (lihat Roadmap).

### API endpoints
```
GET  /api/health               -> status worker
GET  /api/cases                -> daftar kasus (seed)
GET  /api/search?model=&...    -> pencarian kasus
GET  /api/cases/:slug          -> detail kasus
POST /api/diagnosis/start      -> mulai sesi (body: { caseId })
POST /api/diagnosis/answer     -> jawab langkah (body: { sessionId, value })
POST /api/analytics/visit      -> catat kunjungan (body: { path, referrer })

GET  /api/admin/overview       -> ringkasan (admin)
GET  /api/admin/analytics      -> analytics negara/halaman (admin)
GET  /api/admin/sessions       -> riwayat sesi (admin)
GET  /api/admin/pages          -> daftar modul admin (admin)
PUT  /api/admin/pages/:key     -> ubah label/visibilitas/enabled (admin)
```

## Arsitektur & Teknologi

```
Cloudflare Worker (Hono)  ->  rute API + fallback Assets
        |                        |
        |                        v
        +--> D1 (SQLite)    public/ (static assets)
              - diagnostic_sessions
              - diagnostic_evidence
              - analytics_visits
              - admin_pages
```

- [Hono](https://hono.dev) — router HTTP (hanya 1 dependency runtime)
- Cloudflare Workers + Workers Assets — serve API + file statis
- Cloudflare D1 — database SQLite
- TypeScript — strict mode
- Migrasi SQL di `migrations/` (di-apply via Wrangler)

## Struktur folder

```
src/
  index.ts            entry worker (app Hono + cors + fallback assets)
  env.d.ts            tipe Env binding (D1, ASSETS, secrets)
  api/routes.ts       semua rute HTTP
  auth/admin.ts       middleware autentikasi admin
  engine/engine.ts    rule-based engine (search, start, answer)
  db/db.ts            persistensi sesi & evidence ke D1
  data/seed.ts        kasus awal (SEED_CASES)
  seo/seo.ts          sitemap.xml & robots.txt
public/
  index.html          landing page
  diagnosis/index.html  halaman publik per kasus
  admin/index.html    dashboard admin
migrations/           SQL migrasi D1
scripts/              test script
```

## Setup & deploy

1. **Install & cek**
   ```bash
   npm install
   npm run typecheck
   npm test
   ```

2. **Cloudflare D1**
   ```bash
   npx wrangler d1 create technikit-v3
   ```
   Salin `database_id` ke `wrangler.jsonc`, lalu:
   ```bash
   npx wrangler d1 migrations apply technikit-v3 --remote
   ```

3. **Secret Worker**
   ```bash
   npx wrangler secret put ADMIN_USERNAME
   npx wrangler secret put SESSION_SECRET
   ```

4. **Deploy**
   ```bash
   npx wrangler deploy
   ```
   Hasil: `https://technikit-v3.<subdomain>.workers.dev`

> Catatan Termux Android: `wrangler dev` tidak bisa jalan di Android arm64 (dependency `workerd` tidak menyediakan binary). Gunakan GitHub Actions atau laptop/PC/WSL untuk menjalankan Wrangler.

## Test

- `npm run typecheck` — validasi tipe TypeScript
- `npm test` — test logika engine (search/start/answer) + validasi seed data via Node

## Roadmap

- **V3.1** — Admin CRUD kasus + Visual Reference (board image, schematic, connector, pin, test point, annotation, verified status)
- **V3.2** — Test Point & Pin Database
- **V3.3** — Board Annotation
- **V3.4** — Community Contribution + Moderation
- **V3.5** — Advanced Rule Engine
- **V4** — Workshop Management

## Keamanan & catatan produksi

- Auth admin saat ini dev-grade (token sederhana). Sebelum dipakai production, ganti dengan password hashing + session cookie HTTP-only.
- Jangan commit API token / password ke repository. Secrets selalu lewat `wrangler secret`.
- Google indexing tidak dijamin langsung; submit `/sitemap.xml` lewat Google Search Console.
