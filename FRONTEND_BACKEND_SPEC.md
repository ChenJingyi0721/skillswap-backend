# Frontend ↔ Backend API Specification

## Overview

This backend provides REST API endpoints that the SkillSwap frontend calls.  
Backend: **Next.js + Convex + Clerk**  
Frontend: **Next.js (https://github.com/mint1186870278-lgtm/SkillSwap)**

## Connection Setup

### Frontend Configuration

In the frontend's `.env.local`, set:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

For production, use the deployed backend URL (e.g., Render).

### Frontend `api-client.ts` Update

Update the frontend's `lib/api-client.ts` `fetchApi` function to point to the backend:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

async function fetchApi(path: string, options?: RequestInit) {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  return res.json();
}
```

## API Endpoints

### GET /api/user/me

Returns the current user profile.

**Response:**
```json
{
  "id": "convex_user_id",
  "name": "Jessica Parker",
  "avatar": "https://...",
  "title": "Product Designer",
  "location": "Madrid, Spain",
  "level": 3,
  "trustScore": 98,
  "credits": 24,
  "bio": "...",
  "isPro": true,
  "tags": ["Travel", "Coding"]
}
```

### GET /api/skills?category=Tech&search=react

Returns skill listings with optional filtering.

**Query Params:** `category` (optional), `search` (optional)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Spanish Conversation",
    "user": "Elena Rodriguez",
    "avatar": "https://...",
    "type": "Language",
    "distance": "Nearby",
    "image": "https://...",
    "rating": 4.9,
    "lessons": 342,
    "speaks": "Spanish",
    "price": 2,
    "description": "...",
    "tag": "Language"
  }
]
```

### GET /api/sessions?filter=upcoming&dashboard=true

Returns exchange sessions.

**Query Params:** `filter` (upcoming|pending|past), `dashboard` (true for Learning/Teaching split)

**Response:**
```json
[
  {
    "id": 1,
    "type": "upcoming",
    "skill": "Spanish Conversation",
    "title": "Spanish Conversation",
    "partner": "Elena Rodriguez",
    "with": "Elena Rodriguez",
    "avatar": "https://...",
    "date": "Today",
    "time": "14:00 - 15:00",
    "status": "Confirmed",
    "roomLink": "#",
    "meetingLink": "#",
    "rated": false,
    "rating": null
  }
]
```

### GET /api/contacts

Returns messaging contacts list.

**Response:**
```json
[
  {
    "id": "convex_user_id",
    "name": "Elena Rodriguez",
    "avatar": "https://...",
    "lastMsg": "Hola! Are we still on?",
    "time": "2m",
    "unread": 2,
    "status": "online",
    "skill": "Spanish"
  }
]
```

### GET /api/messages/{contactId}

Returns chat messages with a contact. `contactId` is the Convex user ID.

**Response:**
```json
[
  {
    "id": 1,
    "sender": "them",
    "text": "Hola! Ready?",
    "time": "10:30 AM",
    "type": "text",
    "status": null,
    "skill_me": null,
    "skill_them": null,
    "time_slot": null,
    "icon": null
  }
]
```

### POST /api/messages/{contactId}

Send a message.

**Request:**
```json
{
  "text": "Hello!",
  "type": "text",
  "sender": "me"
}
```

**Response:**
```json
{ "id": 12345, "success": true }
```

### GET /api/posts

Returns community feed posts.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Post title",
    "content": "...",
    "user": "Emma Wilson",
    "avatar": "https://...",
    "image": "https://...",
    "likes": 124,
    "comments": 0,
    "tag": "Baking",
    "time": null
  }
]
```

### GET /api/community

Returns community activity updates.

**Response:**
```json
[
  {
    "id": 1,
    "text": "Sophie just learned Python from Mark!",
    "time": "2m ago",
    "icon": "rocket",
    "color": "bg-blue-100 text-blue-600"
  }
]
```

### GET /api/user-posts

Returns current user's posts.

### GET /api/reviews

Returns reviews for the current user.

### GET /api/similar-experts?skillTag=React

Returns similar skill providers.

**Response:**
```json
[
  {
    "name": "Brent",
    "image": "https://...",
    "lessons": 6099,
    "rating": 5.0,
    "price": "15.00"
  }
]
```

### POST /api/ai/process

AI processing (translate, contract, schedule).

**Request:**
```json
{
  "action": "translate",
  "context": "Hola! Are we still on?",
  "targetLanguage": "zh-CN"
}
```

**Response:**
```json
{
  "result": "你好！我们要继续吗？",
  "confidence": 0.95,
  "action": "translate"
}
```

### POST /api/ai/match/chat

AI matching assistant.

**Request:**
```json
{
  "messages": [
    { "role": "user", "text": "I want to learn guitar" }
  ]
}
```

**Response:**
```json
{
  "text": "Found 3 guitar teachers near you...",
  "skillIds": [6, 10]
}
```

### POST /api/seed

Seed the database with demo data. No body required.

## CORS

All API endpoints support CORS for the following origins:
- `http://localhost:3000` / `http://localhost:3001` / `http://localhost:5173`
- `https://skillswap.lat` / `https://develop-skillswap.site`
- `https://skill-swap-tau-six.vercel.app`

## Architecture

```
Frontend (Next.js)              Backend (Next.js + Convex)
┌─────────────────┐            ┌──────────────────────────┐
│  api-client.ts  │───HTTP───→ │  /api/* Route Handlers   │
│  fetchApi()     │            │  ├── CORS middleware      │
│                 │            │  ├── ConvexHttpClient     │
│  Components     │            │  └── Response transform   │
│  ├── Home       │            │                          │
│  ├── Explore    │            │  Convex Functions         │
│  ├── Messages   │            │  ├── users.ts            │
│  ├── Exchange   │            │  ├── skills.ts           │
│  └── Profile    │            │  ├── sessions.ts         │
└─────────────────┘            │  ├── messages.ts         │
                               │  ├── contacts.ts         │
                               │  ├── posts.ts            │
                               │  ├── ai.ts (AI actions)  │
                               │  └── agents/*            │
                               │      ├── orchestrator.ts │
                               │      ├── matching.ts     │
                               │      ├── rating.ts       │
                               │      └── nft.ts          │
                               │                          │
                               │  Convex Cloud            │
                               │  (Real-time DB)          │
                               └──────────────────────────┘
```
