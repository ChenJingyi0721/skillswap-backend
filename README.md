# SkillSwap Backend

Backend API server for the [SkillSwap](https://github.com/mint1186870278-lgtm/SkillSwap) skill exchange platform.

Built with **Next.js + Convex + Clerk + AI (Tongyi Qianwen)**, providing REST API endpoints that the frontend consumes.

## Architecture

```
Frontend (Next.js)                    Backend (This Repo)
┌──────────────────┐                 ┌───────────────────────────┐
│  api-client.ts   │───── HTTP ────→ │  /api/* Route Handlers    │
│  fetchApi()      │  (REST JSON)    │  ├── CORS middleware      │
│                  │                 │  ├── ConvexHttpClient      │
│  React Pages     │                 │  └── Response transform    │
│  ├── Home        │                 │                           │
│  ├── Explore     │                 │  Convex Serverless         │
│  ├── Messages    │                 │  ├── users.ts             │
│  ├── Exchange    │                 │  ├── skills.ts            │
│  └── Profile     │                 │  ├── sessions.ts          │
│                  │                 │  ├── messages.ts           │
│  Clerk Auth ─────│── JWT Token ──→ │  ├── contacts.ts          │
│                  │                 │  ├── posts.ts             │
└──────────────────┘                 │  ├── ai.ts (AI Actions)   │
                                     │  └── agents/*             │
                                     │      ├── orchestrator.ts  │
                                     │      ├── matching.ts      │
                                     │      ├── rating.ts        │
                                     │      └── nft.ts           │
                                     │                           │
                                     │  Convex Cloud (Real-time) │
                                     └───────────────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/me` | Current user profile |
| GET | `/api/skills?category=&search=` | Skill listings |
| GET | `/api/sessions?filter=&dashboard=` | Exchange sessions |
| GET | `/api/contacts` | Messaging contacts |
| GET | `/api/messages/:contactId` | Chat messages |
| POST | `/api/messages/:contactId` | Send message |
| GET | `/api/posts` | Community posts |
| GET | `/api/community` | Community activity updates |
| GET | `/api/user-posts` | Current user's posts |
| GET | `/api/reviews` | User reviews |
| GET | `/api/similar-experts?skillTag=` | Similar skill experts |
| POST | `/api/ai/process` | AI translate / contract / schedule |
| POST | `/api/ai/match/chat` | AI matching assistant |
| POST | `/api/seed` | Seed demo data |

See [FRONTEND_BACKEND_SPEC.md](./FRONTEND_BACKEND_SPEC.md) for detailed request/response formats.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| API Server | Next.js 14 | REST API route handlers + SSR |
| Auth | Clerk | Login / JWT / User management |
| Backend | Convex | Real-time database + Serverless functions |
| AI | Tongyi Qianwen (qwen-plus) | Translation / Contract / Matching / Social analysis |
| Web3 | Convex Storage (Polygon optional) | NFT skill credentials |

## Project Structure

```
skillswap-backend/
├── app/
│   ├── api/                          # REST API routes (frontend calls these)
│   │   ├── user/me/route.ts          # GET user profile
│   │   ├── skills/route.ts           # GET skills list
│   │   ├── sessions/route.ts         # GET sessions
│   │   ├── contacts/route.ts         # GET contacts
│   │   ├── messages/[contactId]/route.ts  # GET/POST messages
│   │   ├── posts/route.ts            # GET community posts
│   │   ├── community/route.ts        # GET community updates
│   │   ├── reviews/route.ts          # GET reviews
│   │   ├── user-posts/route.ts       # GET user's posts
│   │   ├── similar-experts/route.ts  # GET similar experts
│   │   ├── ai/process/route.ts       # POST AI processing
│   │   ├── ai/match/chat/route.ts    # POST AI matching chat
│   │   └── seed/route.ts             # POST seed data
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # API status page
│   └── providers.tsx                 # Clerk + Convex providers
├── convex/                           # Convex backend (core logic)
│   ├── schema.ts                     # Database schema (16 tables)
│   ├── auth.ts                       # Auth helper functions
│   ├── auth.config.ts                # Clerk JWT validation config
│   ├── users.ts                      # User CRUD + Onboarding
│   ├── skills.ts                     # Skill CRUD + Expert matching
│   ├── sessions.ts                   # Session management
│   ├── contacts.ts                   # Contact management
│   ├── messages.ts                   # Real-time messaging
│   ├── posts.ts                      # Community posts + reviews
│   ├── ai.ts                         # AI actions (translate/match)
│   ├── socialMedia.ts                # Social media analysis
│   ├── exchangeThreads.ts            # Exchange feedback threads
│   ├── milestones.ts                 # Soul-style achievements
│   ├── progressiveScoring.ts         # Progressive rating engine
│   ├── seed.ts                       # Demo data seeding
│   └── agents/                       # Multi-Agent system
│       ├── orchestrator.ts           # Central dispatcher
│       ├── matching.ts               # TrueSkill matching
│       ├── recommendation.ts         # Personalized recommendations
│       ├── rating.ts                 # Rating + TrueSkill update
│       └── nft.ts                    # NFT minting + stories
├── lib/
│   ├── convex-server.ts              # Server-side Convex HTTP client
│   └── cors.ts                       # CORS middleware
├── middleware.ts                     # Clerk route protection
└── package.json
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
# Clerk Auth (https://dashboard.clerk.com → API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Convex (auto-generated by npx convex dev)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# AI (Tongyi Qianwen or OpenAI)
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
```

### 3. Set Convex environment variables

In [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables:

```
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
```

### 4. Initialize Convex

```bash
npx convex login
npx convex dev
```

### 5. Seed demo data

In Convex Dashboard → Functions, run `seed:seedDemoData`.

Or call: `POST http://localhost:3000/api/seed`

### 6. Start dev server

```bash
npm run dev
```

Backend runs at http://localhost:3000

## Frontend Connection

In the frontend's `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Update the frontend's `lib/api-client.ts` to use `NEXT_PUBLIC_API_BASE_URL` as the base URL for all API calls. See [FRONTEND_BACKEND_SPEC.md](./FRONTEND_BACKEND_SPEC.md) for details.

## Multi-Agent Architecture

```
User Action → Orchestrator Agent (orchestrator.handleUserAction)
                │
                ├── match    → Matching Agent → TrueSkill (70%) + NFT weight (30%)
                ├── recommend → Recommendation Agent → History + Tag similarity
                ├── rating   → Rating Agent → Mutual scoring → TrueSkill update
                └── nft_mint → NFT Agent → Metadata → Convex Storage / Polygon
```

## Progressive Skill Rating

```
Progressive Rating = Social (30%) + Community (50%) + NFT (20%)

├── Social Media Analysis (30%)
│   ├── Bind: Bilibili / Xiaohongshu / YouTube / WeChat
│   └── AI scores: Consistency × Depth × Engagement
│
├── Community Feedback (50%)
│   ├── Public feedback threads (auto-created)
│   ├── Chat interactions (Soul-style milestones)
│   └── Mutual reviews (TrueSkill update)
│
└── NFT Achievement (20%)
    ├── Story-based NFTs (AI-generated exchange stories)
    ├── NFT showcase (proof of skill exchange)
    └── Achievement badges (unlocked by interactions)
```

## Deployment

### Convex Backend
```bash
npx convex deploy
```

### Render (Next.js API Server)
1. Push to GitHub
2. Create Web Service on [Render](https://dashboard.render.com)
3. Build: `npm install && npm run build`
4. Start: `npx next start -p $PORT`
5. Set environment variables

## License

MIT
