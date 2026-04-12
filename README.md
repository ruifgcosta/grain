# grain

**no noise, only grain**

Agregador de notícias de fontes credenciadas, sem algoritmos, sem anúncios,
com resumos IA on-demand e follow semântico de temas.

## Estrutura

```
grain/
├── frontend/   # React 19 + Vite + TypeScript → GitHub Pages
└── backend/    # Hono.js + Cloudflare Workers + D1
```

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Clerk
- **Backend:** Hono.js, Cloudflare Workers, D1, KV, Gemini API
- **Auth:** Clerk (Google OAuth + magic link)

## Desenvolvimento local

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## Deploy

- Frontend → GitHub Pages (via GitHub Actions)
- Backend → Cloudflare Workers (`wrangler deploy`)
