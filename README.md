# IESData

API pública de consulta a Instituições de Ensino Superior (IES) e cursos, a partir dos microdados do Censo da Educação Superior (INEP/MEC), com portal self-service para desenvolvedores (login + API keys) e landing/playground.

Fonte dos dados: [Microdados do Censo da Educação Superior (INEP)](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior)

## Stack

| Peça | Tecnologia | Ambiente |
|---|---|---|
| API | NestJS 11, TypeORM, Swagger | Dev local → |
| DB / cache | PostgreSQL 16, Redis 7 (+ Sentinel HA opcional) | Docker local |
| Front | Next.js 15 (App Router), React 19, Zustand, React Query, Tailwind v4 | Dev local |

Documentação completa da arquitetura: [ARCHITECTURE.md](ARCHITECTURE.md).


## Estado atual

Já implementado:

- **API** (`apps/api`, NestJS): Helmet, `ValidationPipe`, Swagger em `/api/docs`, health check em `/api/health`.
- **Auth**: registro/login/refresh via JWT (`/api/auth/*`), perfil e gestão de conta (`/api/me*`).
- **API Keys**: criação/listagem/revogação (`/api/me/api-keys`), autenticação de dados via header `X-API-Key`.
- **Controle de uso**: cota diária por conta (2000 req/dia, padrão) + rate limit por API key (120 req/min, padrão), com contadores atômicos em Redis e fallback em Postgres.
- **Endpoints de dados `/v1`**: `ufs`, `municipios`, `ies`, `ies/:coIes`, `ies/by-cnpj/:cnpj`, `ies/:coIes/cursos`, `cursos` — todos paginados e protegidos por API key.
- **Seed**: scripts para importar os microdados reais do INEP (`seed:censup`), enriquecer CNPJ via e-MEC (`seed:enrich-cnpj`) e popular dados fake para dev local (`seed:demo`).
- **Web** (`apps/web`, Next.js): landing, login/register, dashboard (API keys, analytics de uso, conta), playground interativo e explorador de docs a partir do OpenAPI da API.

Pendências conhecidas: migrations formais do TypeORM (hoje roda com `synchronize`), cobertura de testes automatizados ainda baixa, sem pipeline de CI/CD. Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md).

## Dev rápido

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
docker compose up -d

cd apps/api && npm install && npm run start:dev   # :3001
cd apps/web && npm install && npm run dev         # :3000
```

1. Subir Postgres + Redis com Docker (local).
2. Popular o banco:
   - `npm run seed:demo` (dentro de `apps/api`) para dados fake rápidos, **ou**
   - baixar os microdados do INEP em `data/` e rodar `npm run seed:censup` + `npm run seed:enrich-cnpj` para dados reais.
3. Front em `localhost:3000`, consumindo a API via `NEXT_PUBLIC_API_URL`.
4. Docs interativas da API em `localhost:3001/api/docs`.

Para testar Redis em modo HA (Sentinel) localmente:

```bash
docker compose -f docker-compose.yml -f docker-compose.redis-ha.yml up -d
```
