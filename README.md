# TechniKit Cloudflare v0.1

Stack:
- Cloudflare Workers
- TypeScript
- Hono
- Cloudflare D1
- Static Assets
- Wrangler

Engine awal sudah membaca rule dan published repair cases dari D1. Enam kasus nyata yang diberikan sebelumnya dijadikan seed data.

## Termux
npm install
npx wrangler d1 migrations apply technikit --local
npm run dev

## Cloudflare
npx wrangler login
npx wrangler d1 create technikit
Masukkan database_id ke wrangler.jsonc.
npx wrangler d1 migrations apply technikit --remote
npm run deploy

Catatan: ganti database_id placeholder sebelum remote migration/deploy.
