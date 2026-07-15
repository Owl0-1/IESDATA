# IESData — Arquitetura e Funcionamento do Sistema

> Documento gerado por investigação completa do repositório em 2026-07-15. Este arquivo é local (git-ignored) — serve como referência interna detalhada, complementar ao [README.md](README.md) e a `docs/design.md` / `docs/roadmap.md`.

## 1. Visão geral

**IESData** é uma API pública + portal self-service para consultar dados do **Censo da Educação Superior** (INEP/MEC) — informações sobre Instituições de Ensino Superior (IES) brasileiras e seus cursos.

**Problema resolvido:** o INEP publica os microdados do censo como arquivos CSV brutos, gigantescos (centenas de MB, 400+ colunas), delimitados por `;` e codificados em Latin-1 — inviáveis de consumir diretamente por uma aplicação. O IESData faz a ingestão desses arquivos para um schema Postgres normalizado e expõe uma API REST limpa, paginada, autenticada e com rate limiting, para que desenvolvedores terceiros consultem instituições e cursos por UF/município/CNPJ sem tocar nos arquivos brutos do censo.

**Usuário-alvo:** desenvolvedores externos que precisam de acesso programático a dados de IES/cursos brasileiros. Eles se cadastram (JWT), geram `X-API-Key`s e consomem os endpoints `/v1/*`, sujeitos a cota diária e rate limit. Há também um playground interativo e um explorador de documentação baseado em OpenAPI.

Fonte dos dados: [Microdados do Censo da Educação Superior (INEP)](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior)

## 2. Estrutura do monorepo

Não há ferramenta de workspace (sem lerna/turborepo/pnpm-workspace/nx). É um layout simples de duas pastas, cada uma com seu próprio `package.json`/`package-lock.json`/`node_modules`, rodadas e implantadas de forma independente:

```
IESData/
├── apps/
│   ├── api/     # Backend NestJS — porta 3001, prefixo /api
│   └── web/     # Frontend Next.js — porta 3000
├── data/        # CSVs do censo INEP (git-ignored)
├── docs/        # Specs de design e roadmap
└── docker-compose*.yml
```

`apps/web` nunca fala diretamente com o Postgres — é um cliente puro da API (wrapper de `fetch` em `apps/web/src/lib/api.ts`), autenticando via JWT (dashboard) ou API key (playground).

### Infraestrutura local (Docker)

**`docker-compose.yml`** (base):
- `postgres` — imagem `postgres:16-alpine`, porta `5432:5432`, usuário/senha/db `iesdata`, volume nomeado `iesdata_pg`.
- `redis` — imagem `redis:7-alpine`, porta `6379:6379`.

**`docker-compose.redis-ha.yml`** (overlay opcional, para testar Redis Sentinel HA):
```bash
docker compose -f docker-compose.yml -f docker-compose.redis-ha.yml up -d
```
- `redis-master` (`--appendonly yes`), `redis-replica` (`--replicaof redis-master 6379`), `redis-sentinel` (monitora `mymaster`, `down-after-milliseconds 5000`, `failover-timeout 10000`).
- A aplicação passa a usar `REDIS_SENTINELS=localhost:26379` + `REDIS_MASTER_NAME=mymaster` em vez de `REDIS_URL`.

## 3. Backend — `apps/api` (NestJS)

Entry point: `apps/api/src/main.ts`.

### Bootstrap (`main.ts`)
- Middleware **Helmet** (headers de segurança HTTP).
- Prefixo global `api` (todas as rotas ficam sob `/api/*`).
- `ValidationPipe` global: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- **CORS** restrito por `CORS_ORIGINS` (lista separada por vírgula), `credentials: true`.
- **Swagger** via `DocumentBuilder` — título "IESData API", esquema de segurança de API key (header `X-API-Key`), servido em `/api/docs`. O documento inclui apenas os módulos públicos de dados (`IesModule`, `CursosModule`, `GeoModule`).
- Porta via env `PORT` (padrão 3001).

### Módulos (`apps/api/src/app.module.ts`)

`ConfigModule` global (lê `.env` e `../../.env`), `ThrottlerModule` (throttle global por IP), `TypeOrmModule.forRootAsync` (Postgres via `DATABASE_URL`, `synchronize: true` fora de produção — **sem migrations formais ainda**, gap conhecido).

Módulos de feature: `HealthModule`, `AuthModule`, `ApiKeysModule`, `UsageModule`, `GeoModule`, `IesModule`, `CursosModule`.

### Guards globais (ordem importa, via `APP_GUARD`)

1. **`ThrottlerGuard`** — throttle básico por IP.
2. **`JwtAuthGuard`** — valida Bearer JWT; ignorado em rotas marcadas `@Public()` ou `@ApiKeyRoute()`.
3. **`ApiKeyGuard`** — só age em rotas marcadas `@ApiKeyRoute()`; valida `X-API-Key` (hash sha256), chama `UsageService.checkAndConsume` (cota/rate limit) e define headers de resposta `X-Quota-*` / `X-RateLimit-*`.

### Módulos de código, em detalhe

**`auth/`** — cadastro e sessão.
- `AuthController`: `POST auth/register`, `POST auth/login`, `POST auth/refresh` (públicos), `GET me`, `PATCH me/email`, `PATCH me/password`, `DELETE me` (JWT).
- `AuthService`: hash de senha com **bcryptjs** (custo 12), emite par access+refresh JWT.
- Tokens: access (`JWT_ACCESS_TTL`, padrão 1h) e refresh (`JWT_REFRESH_TTL`, padrão 30d), segredos separados (`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`), campo `typ` diferencia access de refresh.
- `JwtStrategy` (passport-jwt) valida `typ === 'access'` e carrega o usuário.
- Decorators: `@Public()` (marca rota como pública), `@CurrentUser()`.

**`api-keys/`** — gestão de chaves de API.
- `ApiKeysController` (prefixo `me/api-keys`, JWT): `GET` lista, `POST` cria, `DELETE :id` revoga.
- `ApiKeysService`: gera segredo no formato `ies_live_<48 hex>` (`randomBytes(24)`), armazena hash sha256 (`key_hash`, único) **e** o segredo em texto plano (`key_secret`) para permitir "revelar" a key na UI — simplificação deliberada, marcada em código (`# ponytail: plaintext at rest...`); considerar criptografar se o modelo de ameaça exigir.
- `ApiKeyGuard` (em `api-keys/`): valida a key, consulta `UsageService`, seta headers de cota/rate limit.

**`usage/`** — controle de uso (cota + rate limit). Ver seção 3.1 para detalhes.

**`geo/`** — `GeoController` (`v1`): `GET ufs`, `GET municipios?uf=` — consultas `DISTINCT` sobre a tabela `ies`.

**`ies/`** — `IesController` (`v1/ies`): `GET` (lista por `uf`+`municipio` ou `cnpj`, com `search`/`page`/`limit`), `GET by-cnpj/:cnpj`, `GET :coIes`. `IesModule` exporta `IesService` + `TypeOrmModule`, usado também por `geo` e `cursos`.

**`cursos/`** — `CursosController` (`v1`): `GET ies/:coIes/cursos`, `GET cursos?coIes=` (obrigatório) — busca `ILIKE` em `no_curso`.

**`health/`** — `HealthController`: `GET health` (público) → `{status, service, timestamp}`.

**`users/`** — entidade `User` (`users`): id (uuid), name, email (único), passwordHash, createdAt. 1:N com `api_keys`.

**`common/`** — utilitários: `cnpj.ts` (normalização/formatação), `pagination.ts` (`page=1`, `limit=20`, `limit máx=500`), DTOs e exemplos de Swagger compartilhados.

**`seed/`** — scripts de ingestão de dados. Ver seção 4.

### 3.1 Controle de uso (cota + rate limit)

Implementado conforme `docs/superpowers/specs/2026-07-15-usage-control-design.md` (status: implementado).

- **Cota diária**: `DAILY_REQUEST_QUOTA` (padrão 2000) — **por conta** (`userId`), compartilhada entre todas as API keys do usuário.
- **Rate limit**: `THROTTLE_API_KEY_LIMIT` (padrão 120/60s) — **por API key**.
- Fuso do reset diário: `America/Sao_Paulo` (UTC-3 fixo, sem DST).

**Fluxo em `ApiKeyGuard`**: valida a key → `UsageService.checkAndConsume` (checa rate limit antes da cota) → seta headers `X-Quota-Limit`, `X-Quota-Remaining`, `X-Quota-Reset`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

Respostas `429` carregam um campo `code`: `DAILY_QUOTA_EXCEEDED` ou `RATE_LIMIT_EXCEEDED`, com mensagem em português.

**Redis (caminho primário)**: `ioredis`, script Lua atômico (`CONSUME_LUA`) incrementa em uma única viagem de rede o contador de rate limit por minuto (`rl:{apiKeyId}`) e o contador de cota diária por conta (`quota:{userId}:{YYYY-MM-DD}`), semeando a cota a partir do Postgres se a chave não existir (sobrevive a restart do Redis). Suporta modo single (`REDIS_URL`) ou Sentinel (`REDIS_SENTINELS` + `REDIS_MASTER_NAME`).

**Postgres (fallback)**: se o Redis estiver inacessível, `UsageService.consumePostgres()` faz `INSERT ... ON CONFLICT ... WHERE request_count < limit RETURNING` atômico contra as tabelas `api_throttle_minute` e `api_quota_account_daily` — a API continua no ar e os limites continuam sendo aplicados **mesmo sem Redis**. Política explícita: nunca fail-open.

Tabelas de uso:
- `api_usage_daily` — por `(user_id, api_key_id, day)`, sempre populada, para analytics.
- `api_quota_account_daily` — por `(user_id, day)`, fonte de verdade da cota diária.
- `api_throttle_minute` — por `(api_key_id, minute_bucket UTC)`, fonte de verdade do rate limit por minuto.

`UsageController` (`me/usage`, JWT): `GET ?days=30` (clamp 1–90) — resumo de cota/rate limit + série diária + breakdown por key. Consumido pela tela de analytics do dashboard web.

### 3.2 Banco de dados / ORM

**TypeORM 0.3.27** + **pg 8.22** (driver Postgres). `synchronize: true` fora de produção — sem migrations formais (gap conhecido, listado em `docs/roadmap.md`).

Entidades: `User`, `ApiKey`, `ApiUsageDaily`, `ApiQuotaAccountDaily`, `ApiThrottleMinute`, `Ies`, `Curso`.

- `ies`: id (uuid), `ano_censo`, `co_ies` (chave natural do INEP, único, indexado), `no_ies`, `sg_ies`, `organizacao_academica`, `rede`, `categoria_administrativa`, `sg_uf` (indexado), `no_municipio` (indexado), `co_municipio`, `no_mantenedora`, `cnpj` (indexado, nullable — só populado via script de enriquecimento, pois o censo INEP não traz CNPJ).
- `cursos`: id (uuid), `ano_censo`, `co_curso`, `co_ies` (indexado), `no_curso` (indexado), `grau`, `modalidade`, `sg_uf`, `no_municipio`, `co_municipio` — índice único composto em `(co_curso, co_municipio, ano_censo)`.
- `api_keys`: id, `user_id` (FK, indexado), `name`, `key_prefix`, `key_secret` (texto plano), `key_hash` (sha256, único, indexado), `last_used_at`, `revoked_at`, `created_at`.

### 3.3 Endpoints principais

**Auth** (`AuthController`, sem prefixo):
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/auth/register` | pública | `{name,email,password}` → tokens+user |
| POST | `/api/auth/login` | pública | `{email,password}` → tokens+user |
| POST | `/api/auth/refresh` | pública | `{refreshToken}` → novos tokens |
| GET | `/api/me` | JWT | perfil |
| PATCH | `/api/me/email` | JWT | `{email, currentPassword}` |
| PATCH | `/api/me/password` | JWT | `{currentPassword, newPassword}` |
| DELETE | `/api/me` | JWT | `{currentPassword}` — apaga conta (cascata em api_keys) |

**API Keys** (`ApiKeysController`, prefixo `me/api-keys`, JWT):
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/me/api-keys` | lista (mostra secret se armazenado) |
| POST | `/api/me/api-keys` | `{name}` → retorna key completa |
| DELETE | `/api/me/api-keys/:id` | revoga (soft delete, `revoked_at`) |

**Usage** (`UsageController`, prefixo `me/usage`, JWT):
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/me/usage?days=30` | resumo de cota/rate limit + série + breakdown por key |

**Health**: `GET /api/health` (pública).

**Dados `/v1`** — exigem `X-API-Key`, throttle de 120 req/min por key:
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/ufs` | lista de UFs |
| GET | `/api/v1/municipios?uf=` | municípios por UF |
| GET | `/api/v1/ies?uf=&municipio=` ou `?cnpj=` | lista de IES (+ `search`,`page`,`limit`) |
| GET | `/api/v1/ies/by-cnpj/:cnpj` | IES por CNPJ |
| GET | `/api/v1/ies/:coIes` | IES por código |
| GET | `/api/v1/ies/:coIes/cursos` | cursos de uma IES (+ `search`,`page`,`limit`) |
| GET | `/api/v1/cursos?coIes=` | cursos (coIes obrigatório) (+ `search`,`page`,`limit`) |

Convenção de paginação: `{data, total, page, limit, totalPages}` — `page=1`, `limit=20` por padrão, `limit` máximo 500.

### 3.4 Integrações externas

- **Redis** (`ioredis`) — usado exclusivamente pelo sistema de controle de uso (não é cache geral).
- **@nestjs/throttler** + **@nest-lab/throttler-storage-redis** — throttle básico por IP (camada de base); o rate limit/cota real de `/v1` é feito pelo `UsageService` customizado.
- **JWT**: `@nestjs/jwt`, `passport`, `passport-jwt`.
- **bcryptjs** (custo 12) para hash de senha.
- **Helmet** para headers de segurança HTTP.
- **class-validator / class-transformer** para validação de DTOs.
- **@nestjs/swagger** para geração do OpenAPI (consumido pelo frontend em `/docs`).
- Não há integração de e-mail, filas (BullMQ) ou qualquer outro serviço externo.

### 3.5 Docker e testes

**Dockerfile** (`apps/api/Dockerfile`) — build multi-stage (node:22-alpine):
1. `deps`: `npm ci`.
2. `build`: copia deps + source, `npm run build`.
3. `runner`: `NODE_ENV=production`, `npm ci --omit=dev`, copia `dist/`, expõe 3001, `CMD node dist/main.js`.

**Testes**: `apps/api/test/app.e2e-spec.ts` (e2e básico do `/api/health`), `usage/usage.service.spec.ts` (unit tests de cota/rate limit, cobrindo caminhos Redis e Postgres). Cobertura ainda baixa — a maioria dos services/controllers não tem testes.

## 4. Camada de dados e ETL (`/data` + `apps/api/src/seed/`)

### Arquivos em `/data` (git-ignored)

| Arquivo | Origem | Conteúdo |
|---|---|---|
| `microdados_2024.zip` | INEP | ZIP original baixado do censo |
| `MICRODADOS_ED_SUP_IES_2024.CSV` | INEP | microdados por **instituição** (`CO_IES`, `NO_IES`, `SG_IES`, `TP_ORGANIZACAO_ACADEMICA`, `TP_REDE`, `TP_CATEGORIA_ADMINISTRATIVA`, `SG_UF_IES`, `NO_MUNICIPIO_IES`, etc.) |
| `MICRODADOS_CADASTRO_CURSOS_2024.CSV` | INEP | microdados por **curso** (`CO_CURSO`, `CO_IES`, `NO_CURSO`, `TP_GRAU_ACADEMICO`, `TP_MODALIDADE_ENSINO`, mais dezenas de colunas de matrícula/vagas não ingeridas) |
| `ies_cnpj_emec.csv` | e-MEC (fonte separada) | mapeia `Código IES` → `CNPJ` (o censo INEP não traz CNPJ) |

Ambos os CSVs do INEP são delimitados por `;` e codificados em **Latin-1**; o `ies_cnpj_emec.csv` é UTF-8 com BOM.

### Scripts de seed (`apps/api/src/seed/`), rodados via `ts-node`

1. **`seed-censup.ts`** (`npm run seed:censup`) — seed real de produção. Lê `CENSUP_ANO` (padrão 2024) e `CENSUP_DATA_DIR` (padrão `./data`). Resolve os caminhos dos CSVs tentando nomes candidatos (sobrescrevível via `CENSUP_IES_CSV_PATH` / `CENSUP_CURSOS_CSV_PATH`). Faz streaming linha a linha via `readline` (encoding `latin1`), monta um índice de cabeçalho, decodifica os códigos numéricos do INEP em rótulos legíveis (via `seed/censup.constants.ts`) e faz **upsert em lotes de 500** via TypeORM `.upsert()` — conflito em `coIes` para `Ies`, em `(coCurso, coMunicipio, anoCenso)` para `Curso`. Roda como `DataSource` standalone (fora do DI do Nest), idempotente (seguro rodar de novo).
2. **`seed-demo.ts`** (`npm run seed:demo`) — 3 IES + 4 cursos fake, para dev local sem precisar dos CSVs reais; no-op se a tabela `ies` já tiver linhas.
3. **`seed-enrich-cnpj.ts`** (`npm run seed:enrich-cnpj`) — lê `data/ies_cnpj_emec.csv` (ou overrides `CENSUP_CNPJ_CSV_PATH`/`CENSUP_DATA_DIR`), casa colunas "Código IES"/"CO_IES" e "CNPJ", normaliza CNPJ para 14 dígitos (`common/cnpj.ts`) e faz `UPDATE ies SET cnpj=... WHERE co_ies=...` em lotes de 200.

Todos os três scripts usam `DOTENV_CONFIG_PATH=../../.env`, ou seja, leem o `.env` da raiz do repositório (não um `.env` local de `apps/api`).

**Fluxo de dados completo:**

```
ZIP do INEP → extração dos CSVs em /data
  → seed:censup   → popula/atualiza tabelas `ies` + `cursos` (upsert idempotente)
  → seed:enrich-cnpj → preenche `ies.cnpj` a partir do e-MEC
  → API /v1/*     → serve views paginadas e normalizadas dessas duas tabelas
```

## 5. Frontend — `apps/web` (Next.js)

**Next.js 15.5.20** (App Router), **React 19.1.0**, build/dev com `--turbopack`.

### Rotas (`apps/web/src/app/`)

| Rota | Arquivo | Descrição |
|---|---|---|
| `/` | `app/page.tsx` | landing (CTAs "Gerar API Key" / "Abrir playground" / "Documentação") |
| `/login` | `app/login/page.tsx` | login |
| `/register` | `app/register/page.tsx` | cadastro |
| `/docs` | `app/docs/page.tsx` | docs públicas + explorador interativo do OpenAPI |
| `/playground` | `app/playground/page.tsx` | playground standalone |
| `/dashboard` | `app/dashboard/layout.tsx` + `page.tsx` | shell protegido (redireciona para `/login` se não houver `accessToken`) |
| `/dashboard/api-keys` | | criar/listar/revelar/copiar/revogar API keys |
| `/dashboard/analytics` | | gráfico de uso (recharts) + gauge de cota + breakdown por key |
| `/dashboard/account` | | perfil, trocar email/senha, apagar conta (com confirmação por email) |
| `/dashboard/playground` | | mesmo playground, dentro do shell autenticado |

`app/layout.tsx`: tema escuro global forçado (`bg-[#050807] text-stone-100`), fontes Poppins + Geist Mono, envolve tudo em `<Providers>` (React Query).

### Estado e dados

- **@tanstack/react-query** — todo o estado de servidor (`staleTime: 30s`, `retry: 1`).
- **Zustand**:
  - `stores/auth-store.ts` — persistido em `localStorage` (`iesdata-auth`): accessToken/refreshToken/user.
  - `stores/playground-store.ts` — estado de seleção UF→município→IES→curso no playground (não persistido).
- **`lib/api.ts`** — wrapper de `fetch` que injeta `X-API-Key` e/ou `Authorization: Bearer`, parseia erros em `ApiError` (com `status` + `code`), base URL de `NEXT_PUBLIC_API_URL`.
- **`lib/fetch-all-pages.ts`** — percorre todas as páginas (500 por página) para montar lista completa em memória, usada no playground para busca/filtro client-side.
- **`lib/openapi.ts`** — parseia o JSON OpenAPI da API para alimentar o explorador interativo em `/docs`.

### Auth

Sem NextAuth/sessão por cookie — puramente por token: JWT access/refresh guardados no Zustand persistido, anexados manualmente a cada request via `apiFetch`. Proteção de rota é client-side (redirect no `DashboardLayout`), não há middleware de rota. O playground usa uma API key colada manualmente pelo usuário (não injeta automaticamente as keys da conta logada).

### Estilo

**Tailwind CSS v4** (config CSS-first, sem `tailwind.config.js` separado). Design system dark-mode-only (sem toggle), com paleta documentada: fundo gradiente radial `#1e3a2f → #0b1210 → #050807`, texto `stone-100…stone-400`, superfícies `#12201b` com `border-white/15`, CTA `bg-emerald-400 text-emerald-950`, erro `text-red-400`, aviso `border-amber-400/40 bg-amber-500/10`. Ícones via `lucide-react`, gráficos via `recharts`. Componentes são feitos à mão (sem shadcn/ui de fato instalado, apesar de mencionado no README original).

## 6. Variáveis de ambiente

### `.env` (raiz — compartilhado entre API e scripts de seed)

| Variável | Padrão | Uso |
|---|---|---|
| `DATABASE_URL` | `postgres://iesdata:iesdata@localhost:5432/iesdata` | conexão Postgres (TypeORM) |
| `REDIS_URL` | `redis://localhost:6379` | conexão Redis (single node) |
| `REDIS_SENTINELS` | — | `host:port,...` — ativa modo Sentinel, sobrepõe `REDIS_URL` |
| `REDIS_MASTER_NAME` | — | nome do master monitorado pelo Sentinel (ex. `mymaster`) |
| `PORT` | 3001 | porta HTTP do Nest |
| `NODE_ENV` | development | controla `synchronize` do TypeORM |
| `JWT_ACCESS_SECRET` | — | assinatura do access token (mín. 32 chars) |
| `JWT_REFRESH_SECRET` | — | assinatura do refresh token (mín. 32 chars) |
| `JWT_ACCESS_TTL` | `1h` | validade do access token |
| `JWT_REFRESH_TTL` | `30d` | validade do refresh token |
| `CORS_ORIGINS` | `http://localhost:3000` | origens permitidas (separadas por vírgula) |
| `THROTTLE_TTL_MS` | 60000 | janela do throttle global por IP |
| `THROTTLE_LIMIT` | 60 | limite do throttle global por IP |
| `THROTTLE_API_KEY_LIMIT` | 120 | rate limit por API key (req/min) |
| `DAILY_REQUEST_QUOTA` | 2000 | cota diária por conta |
| `CENSUP_ANO` | 2024 | ano do censo usado no seed |
| `CENSUP_DATA_DIR` | `./data` | diretório dos CSVs para o seed |
| `CENSUP_IES_CSV_PATH` | — | override do caminho do CSV de IES |
| `CENSUP_CURSOS_CSV_PATH` | — | override do caminho do CSV de cursos |
| `CENSUP_CNPJ_CSV_PATH` | — | override do caminho do CSV de CNPJ (e-MEC) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | base URL da API usada pelo front |

### `apps/web/.env.local`

| Variável | Padrão | Uso |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | base URL da API (deve incluir o prefixo `/api`) |

## 7. Deploy (planejado / resumo)

- **Front**: Vercel (`apps/web`).
- **API + Postgres + Redis**: AWS EC2, banco de dados sem porta pública (acesso via túnel SSH → TablePlus em `127.0.0.1:5432`).
- Sem CI/CD configurado até o momento (sem `.github/workflows`).

## 8. Gaps e pendências conhecidas

- **Sem migrations formais do TypeORM** — roda com `synchronize: true` fora de produção; migrations reais (sem `synchronize` em prod) estão no roadmap.
- **Cobertura de testes baixa** — apenas 2 arquivos de spec (`usage.service.spec.ts` e `app.e2e-spec.ts`) em todo o backend; a maior parte dos services/controllers não tem testes automatizados.
- **Sem pipeline de CI/CD.**
- **API keys com cópia em texto plano** (`key_secret`) para permitir "revelar" a chave na UI — trade-off deliberado, documentado em comentário no código; considerar criptografia se o modelo de ameaça mudar.
- **Deploy em produção (AWS/Vercel) ainda não realizado** — presente apenas como plano em `docs/roadmap.md`.

## 9. Documentos relacionados

- [docs/design.md](docs/design.md) — spec de desenho original do produto.
- [docs/roadmap.md](docs/roadmap.md) — estado "feito" vs. "próximo" (parcialmente desatualizado: itens de Redis/quota já descritos como "próximos" já foram implementados — ver `docs/superpowers/specs/`).
- [docs/superpowers/specs/2026-07-15-usage-control-design.md](docs/superpowers/specs/2026-07-15-usage-control-design.md) — design detalhado do sistema de cota/rate limit (implementado).
- [docs/superpowers/plans/2026-07-15-usage-control.md](docs/superpowers/plans/2026-07-15-usage-control.md) — plano de execução do controle de uso.
- [docs/superpowers/specs/2026-07-14-dark-mode-global-design.md](docs/superpowers/specs/2026-07-14-dark-mode-global-design.md) — spec do tema dark global do frontend (implementado).
