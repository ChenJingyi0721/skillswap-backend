# SkillSwap Backend

基于 **Convex + Clerk + Next.js** 的技能交换平台后端，采用 Multi-Agent 架构实现智能匹配、推荐、评分和 NFT 信任背书。

## 技术栈

| 层级 | 技术 | 职责 |
|------|------|------|
| 前端 | Next.js 14 + React 18 + Tailwind CSS | SSR 页面渲染 + Clerk 鉴权组件 + Convex SDK 实时订阅 |
| 鉴权 | Clerk | 登录/注册/JWT/用户管理/Webhook 同步 |
| 后端 | Convex | 实时数据库 + Serverless 函数 + 文件存储 |
| AI | OpenAI / 通义千问 (qwen-plus) | 翻译/合同生成/日程建议/AI 配对助手 |
| Web3 | Polygon (可选) | NFT 技能凭证链上验证 |

## 项目结构

```
skillswap-backend/
├── convex/                        # Convex 后端（核心）
│   ├── schema.ts                  # 数据库 Schema（10 张表）
│   ├── auth.ts                    # Clerk 鉴权工具函数
│   ├── auth.config.ts             # Convex 鉴权配置（Clerk Issuer）
│   ├── http.ts                    # HTTP 路由（Clerk Webhook 用户同步）
│   ├── users.ts                   # 用户 CRUD + Onboarding
│   ├── skills.ts                  # 技能 CRUD + 相似专家推荐
│   ├── sessions.ts                # 交换会话管理（预约/接受/完成）
│   ├── contacts.ts                # 联系人管理（双向自动添加）
│   ├── messages.ts                # 实时消息（已读/未读状态）
│   ├── posts.ts                   # 社区帖子 + 动态 + 评价
│   ├── ai.ts                      # AI 处理（翻译/合同/配对聊天）
│   ├── seed.ts                    # Demo 数据生成（3 用户完整数据）
│   └── agents/                    # Multi-Agent 系统
│       ├── orchestrator.ts        # 中枢调度 Agent（统一入口）
│       ├── matching.ts            # 匹配 Agent（TrueSkill + NFT 权重）
│       ├── recommendation.ts      # 推荐 Agent（历史 + 标签相似度）
│       ├── rating.ts              # 评分 Agent（TrueSkill 更新 + 评价）
│       └── nft.ts                 # NFT Agent（铸造 + 验证 + 查询）
├── app/                           # Next.js 前端
│   ├── layout.tsx                 # 根布局（Clerk + Convex Provider）
│   ├── providers.tsx              # 全局 Provider 注入
│   └── globals.css                # Tailwind CSS
├── lib/
│   └── convex.ts                  # Convex 客户端实例
├── middleware.ts                  # Clerk 路由保护中间件
├── next.config.js                 # Next.js 配置
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
# Clerk 鉴权（https://dashboard.clerk.com → API Keys）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Convex（npx convex dev 自动生成）
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# AI 功能（通义千问 或 OpenAI）
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
```

### 3. 配置 Convex 环境变量

在 [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables 中设置：

```
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
```

### 4. 初始化 Convex

```bash
npx convex login
npx convex dev
```

### 5. 生成 Demo 数据

在 Convex Dashboard → Functions 中运行 `seed:seedDemoData`。

### 6. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 后端 API 一览

### 用户模块 (`users.ts`)

| 函数 | 类型 | 说明 |
|------|------|------|
| `users.me` | Query | 获取当前登录用户 |
| `users.syncUser` | Mutation | Clerk→Convex 用户同步 |
| `users.completeOnboarding` | Mutation | 保存 Onboarding 数据 + 初始化 TrueSkill |
| `users.updateProfile` | Mutation | 更新用户资料 |

### 技能模块 (`skills.ts`)

| 函数 | 类型 | 说明 |
|------|------|------|
| `skills.list` | Query | 技能列表（支持分类/搜索过滤） |
| `skills.getById` | Query | 技能详情 |
| `skills.create` | Mutation | 发布新技能（自动关联 TrueSkill） |
| `skills.getSimilarExperts` | Query | 按技能推荐相似专家 |

### 会话模块 (`sessions.ts`)

| 函数 | 类型 | 说明 |
|------|------|------|
| `sessions.list` | Query | 会话列表（支持 filter/dashboard 模式） |
| `sessions.create` | Mutation | 发起交换预约 |
| `sessions.updateStatus` | Mutation | 接受/取消/完成会话 |

### 消息模块 (`messages.ts`)

| 函数 | 类型 | 说明 |
|------|------|------|
| `messages.listByContact` | Query | 获取与联系人的消息历史 |
| `messages.send` | Mutation | 发送消息（自动更新联系人列表） |
| `messages.markRead` | Mutation | 标记消息已读 |

### AI 模块 (`ai.ts`)

| 函数 | 类型 | 说明 |
|------|------|------|
| `ai.processAI` | Action | AI 通用处理（translate/contract/schedule） |
| `ai.matchChat` | Action | AI 配对助手多轮对话 |
| `ai.saveConversation` | Mutation | 保存 AI 对话历史 |

### Multi-Agent 系统

| 函数 | 类型 | 说明 |
|------|------|------|
| `agents.orchestrator.handleUserAction` | Mutation | 中枢调度（match/recommend/rating/nft_mint） |
| `agents.matching.findMatches` | Mutation | TrueSkill 70% + NFT 30% 智能匹配 |
| `agents.matching.getCachedMatches` | Query | 查询缓存的匹配结果 |
| `agents.recommendation.getRecommendations` | Query | 个性化技能推荐 |
| `agents.rating.updateSkillRating` | Mutation | 评分 + TrueSkill 更新 + NFT 次数递增 |
| `agents.nft.mintSkillNft` | Mutation | 铸造技能 NFT 凭证 |
| `agents.nft.getUserNfts` | Query | 查询用户 NFT 列表 |
| `agents.nft.verifyNft` | Query | 验证 NFT 真实性 |

## Multi-Agent 架构

```
用户操作 → 中枢调度 Agent (orchestrator.handleUserAction)
              │
              ├── action: "match"
              │   └── 匹配 Agent → TrueSkill 评分对比 (70%) + NFT 交换次数 (30%)
              │                   → 返回 Top 5 最佳匹配 + 缓存 1 小时
              │
              ├── action: "recommend"
              │   └── 推荐 Agent → 历史交换记录 + 技能标签相似度
              │                   → 按"评分 + NFT次数×2"排序去重
              │
              ├── action: "rating"
              │   └── 评分 Agent → 双方互评后触发 TrueSkill 更新
              │                   → 正向(≥4分): mu↑ sigma↓ | 负向(<4分): mu↓ sigma↑
              │
              └── action: "nft_mint"
                  └── NFT Agent → 生成元数据 → Convex Storage 存储
                                → Demo: 模拟 tokenId | Prod: Polygon mint
```

## AI 功能详情

### 翻译助手
调用 `ai.processAI({ action: "translate", context: "内容", targetLanguage: "English" })`

### 合同生成
调用 `ai.processAI({ action: "contract", context: "对话上下文" })`，自动生成 Markdown 格式技能交换协议。

### AI 配对聊天
调用 `ai.matchChat({ messages: [...] })`，多轮对话收集用户需求，当信息足够时返回 `matchSuggestion` 推荐结果。

## 数据库 Schema（10 张表）

| 表名 | 用途 | 关键索引 |
|------|------|----------|
| `users` | 用户（Clerk + TrueSkill + NFT） | `by_clerkId`, `search_name` |
| `skills` | 可交换技能 | `by_userId`, `by_skillTag`, `by_category`, `search_title` |
| `sessions` | 交换会话 | `by_requesterId`, `by_providerId`, `by_status` |
| `contacts` | 联系人 | `by_userId`, `by_contactUserId` |
| `messages` | 聊天消息 | `by_conversationId`, `by_senderId`, `by_receiverId` |
| `posts` | 社区帖子 | `by_userId` |
| `communityUpdates` | 社区动态 | — |
| `reviews` | 评价 | `by_userId`, `by_reviewerId` |
| `matchCache` | AI 匹配缓存（1h TTL） | `by_userId` |
| `aiConversations` | AI 对话历史 | `by_userId` |

## 前端集成示例

```typescript
"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// 实时订阅数据
const user = useQuery(api.users.me);
const skills = useQuery(api.skills.list, { category: "编程" });

// 调用 Mutation
const createSkill = useMutation(api.skills.create);
await createSkill({ skillTag: "React", title: "React 教学", level: "advanced" });

// 调用 AI Action
const matchChat = useAction(api.ai.matchChat);
const { reply, matchSuggestion } = await matchChat({
  messages: [{ role: "user", content: "我想学吉他" }]
});

// 中枢调度
const handleAction = useMutation(api.agents.orchestrator.handleUserAction);
const matches = await handleAction({ action: "match", payload: { skillTag: "React" } });
```

## 部署

### Convex 后端部署
```bash
npx convex deploy
```

### Render 部署（Next.js 前端）
1. 推送代码到 GitHub
2. 在 [Render](https://dashboard.render.com) 创建 Web Service
3. Build Command: `npm install && npm run build`
4. Start Command: `npx next start -p $PORT`
5. 配置环境变量（Clerk 密钥 + Convex URL）

## License

MIT
