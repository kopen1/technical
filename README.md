# TechniKit V1
Versi 1 = fondasi lengkap Diagnostic Toolkit berbasis rule, bukan AI.

Sudah termasuk:
- Diagnostic Engine, session, branching, PASS/FAIL/UNKNOWN
- voltage/current/resistance/diode
- test point + alasan pemeriksaan
- evidence + verification
- 6 kasus nyata yang diberikan
- Cloudflare Worker + D1 migration
- UI diagnosis + API

Kasus: Vivo Y12s, Samsung A52 A525F, Vivo Y19s, Samsung A326 5G, Redmi 9, Redmi Note 8.

PENTING: data kasus tidak menggantikan schematic/hardware reference model yang tepat. Detail pin/nilai yang tidak diberikan tidak dibuat-buat.

Deployment: isi database_id pada wrangler.jsonc. Karena Termux Android sebelumnya mengalami workerd Unsupported platform, gunakan GitHub -> Cloudflare Workers Builds untuk deploy. Jangan taruh API key di source.

Sesudah V1 stabil, modul berikutnya dapat ditambahkan tanpa membongkar engine: admin private, CRUD knowledge base, gambar kasus, schematic/reference link, SEO case pages, analytics, dan modul toko/keuangan.