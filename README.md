# SkillSwap Backend

基于 **Convex + Clerk + Next.js** 的技能交换平台后端，采用 Multi-Agent 架构实现智能匹配、推荐、评分和 NFT 信任背书。

## 技术栈

| 层级 | 技术 | 职责 |
|------|------|------|
| 前端 | Next.js + React + Tailwind | UI + Clerk 鉴权组件 + Convex SDK |
| 鉴权 | Clerk | 登录/注册/JWT/用户管理 |
| 后端 | Convex | 数据库 + 实时订阅 + 函数 + 文件存储 |
| AI | OpenAI / 通义千问 | 翻译/合同/日程/配对助手 |
| Web3 | Polygon (可选) | NFT 技能凭证链上验证 |

## 项目结构

```
skillswap-backend/
├── convex/                    # Convex 后端（核心）
│   ├── schema.ts              # 数据库 Schema（9 张表）
│   ├── auth.ts                # Clerk 鉴权工具函数
│   ├── auth.config.ts         # Convex 鉴权配置
│   ├── http.ts                # HTTP 路由（Clerk Webhook）
│   ├── users.ts               # 用户 CRUD
│   ├── skills.ts              # 技能 CRUD + 相似专家
│   ├── sessions.ts            # 交换会话管理
│   ├── contacts.ts            # 联系人管理
│   ├── messages.ts            # 实时消息
│   ├── posts.ts               # 社区帖子 + 评价
│   ├── ai.ts                  # AI 处理（翻译/合同/配对聊天）
│   ├── seed.ts                # Demo 数据生成
│   └── agents/                # Multi-Agent 系统
│       ├── orchestrator.ts    # 中枢调度 Agent
│       ├── matching.ts        # 匹配 Agent（TrueSkill + NFT）
│       ├── recommendation.ts  # 推荐 Agent
│       ├── rating.ts          # 评分 Agent（TrueSkill 更新）
│       └── nft.ts             # NFT Agent（铸造 + 验证）
├── app/                       # Next.js 前端
│   ├── layout.tsx             # 根布局
│   ├── providers.tsx          # Clerk + Convex Provider
│   └── globals.css            # Tailwind
├── lib/
│   └── convex.ts              # Convex 客户端实例
├── middleware.ts               # Clerk 路由保护
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入：

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
OPENAI_API_KEY=sk-xxx
```

### 3. 初始化 Convex

```bash
npx convex dev
```

### 4. 生成 Demo 数据

在 Convex Dashboard 中运行 `seed:seedDemoData` 函数。

### 5. 启动开发服务器

```bash
npm run dev
```

## API 接口对照表

| 前端调用 | Convex 函数 | 说明 |
|----------|------------|------|
| `fetchCurrentUser` | `users.me` | 获取当前用户 |
| `fetchSkills` | `skills.list` | 技能列表（支持搜索/分类） |
| `fetchSessions` | `sessions.list` | 会话列表（支持过滤） |
| `fetchContacts` | `contacts.list` | 联系人列表 |
| `fetchMessages` | `messages.listByContact` | 消息历史 |
| `sendMessage` | `messages.send` | 发送消息 |
| `fetchPosts` | `posts.list` | 社区帖子 |
| `fetchCommunityUpdates` | `posts.listCommunityUpdates` | 社区动态 |
| `fetchUserPosts` | `posts.listByCurrentUser` | 我的帖子 |
| `fetchReviews` | `posts.listReviews` | 我的评价 |
| `fetchSimilarExperts` | `skills.getSimilarExperts` | 相似专家 |
| `processAI` | `ai.processAI` | AI 翻译/合同/日程 |
| `sendAiMatchMessage` | `ai.matchChat` | AI 配对助手 |
| `handleUserAction` | `agents.orchestrator.handleUserAction` | 中枢调度 |

## Multi-Agent 架构

```
用户操作 → 中枢调度 Agent (orchestrator)
              ├── match → 匹配 Agent (TrueSkill 70% + NFT 30%)
              ├── recommend → 推荐 Agent (历史记录 + 标签相似度)
              ├── rating → 评分 Agent (TrueSkill 更新 + NFT 次数)
              └── nft_mint → NFT Agent (元数据存储 + 链上铸造)
```

## 部署

### Convex 部署
```bash
npx convex deploy
```

### Vercel 部署
1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量（NEXT_PUBLIC_CONVEX_URL, Clerk 密钥）
4. 自动构建部署
