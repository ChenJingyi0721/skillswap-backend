# SkillSwap 技术文档

> **项目定位**：基于 Multi-Agent 架构与渐进式信任体系的去中心化技能交换平台
>
> **核心主张**：用 AI 替代价格信号，用 NFT 替代交易凭证，让技能交换回归"人与人的连接"

---

## 一、场景价值：为什么需要 SkillSwap

### 1.1 痛点分析

传统在线教育市场存在三个结构性矛盾：

| 矛盾 | 现状 | SkillSwap 方案 |
|------|------|---------------|
| **价格壁垒** | Coursera/Udemy 年均消费 $200+；一对一辅导 $50-150/h | 零货币交易，纯技能互换，Credits 积分体系仅用于激励 |
| **信任黑箱** | 平台评分可刷，教师资质难验证 | TrueSkill 贝叶斯评分 + AI 社交媒体交叉验证 + NFT 链上凭证三重信任体系 |
| **匹配低效** | 学生被动搜索，无法评估"教学风格兼容性" | Multi-Agent 系统主动匹配：分析学习风格、时区、语言偏好、历史交换记录 |

### 1.2 目标用户与商业闭环

**核心用户画像**：18-35 岁跨学科学习者（大学生、自由职业者、数字游民）

**商业闭环路径**：
```
用户注册 → Onboarding 采集技能画像
    → AI 匹配建议交换伙伴
    → 双方确认 → 系统自动创建反馈帖 + 视频房间链接
    → 完成交换 → 双方互评 → TrueSkill 更新 → NFT 铸造
    → NFT 橱窗展示 → 增加用户信任度 → 吸引更多匹配
    → 社区帖子传播 → 新用户注册（飞轮效应）
```

### 1.3 市场差异化

| 维度 | Skillshare | iTalki | SkillSwap |
|------|-----------|--------|-----------|
| 交易模式 | 订阅制 ($168/y) | 按课时付费 | 技能互换（零货币） |
| 信任机制 | 平台审核 | 用户评分 | TrueSkill + AI 社交分析 + NFT |
| AI 参与度 | 推荐算法 | 无 | Multi-Agent 全链路介入 |
| 社交属性 | 弱 | 弱 | Soul 式关系升级 + 成就系统 |

---

## 二、技术前瞻：Multi-Agent 架构与渐进式信任体系

### 2.1 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                        │
│  React 18 + Tailwind CSS + Clerk Auth + Motion (Framer)            │
│  lib/api-client.ts ──── fetchApi() ──── REST JSON ──────────┐      │
└────────────────────────────────────────────────────────────────┼────┘
                                                                │
┌───────────────────── Backend API Layer ────────────────────────┼────┐
│  Next.js 14 API Routes (/api/*)                               │    │
│  ├── CORS Middleware (跨域安全)                                 │    │
│  ├── ConvexHttpClient (服务端 Convex 调用)                      │    │
│  └── Response Transformer (Convex → Frontend 数据格式适配)      │    │
└───────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────── Convex Serverless ────────────────────────────┐
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Multi-Agent Orchestration Layer                  │  │
│  │                                                              │  │
│  │   Orchestrator Agent ← 用户意图解析 + 路由分发                 │  │
│  │       │                                                      │  │
│  │       ├── Matching Agent                                     │  │
│  │       │   └── TrueSkill μ/σ 贝叶斯对比 (70%)                 │  │
│  │       │       + NFT 交换次数加权 (30%)                        │  │
│  │       │       + 1h 匹配缓存 (matchCache 表)                   │  │
│  │       │                                                      │  │
│  │       ├── Recommendation Agent                               │  │
│  │       │   └── 历史交换记录挖掘 + 技能标签余弦相似度             │  │
│  │       │       → 按 (mu + swapCount×2) 排序去重                │  │
│  │       │                                                      │  │
│  │       ├── Rating Agent                                       │  │
│  │       │   └── 双方互评触发 TrueSkill 贝叶斯更新               │  │
│  │       │       正向(≥4): μ↑ σ↓ | 负向(<4): μ↓ σ↑              │  │
│  │       │                                                      │  │
│  │       └── NFT Agent                                          │  │
│  │           └── 元数据生成 → Convex Storage 存储                 │  │
│  │               + AI 故事生成 + 贡献度自动分配                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              AI Action Layer (Qwen 3.5-397B)                 │  │
│  │                                                              │  │
│  │   processAI Action                                           │  │
│  │   ├── translate: 多语言实时翻译 (聊天场景)                     │  │
│  │   ├── contract: AI 合同草拟 (Markdown 格式)                   │  │
│  │   └── schedule: 智能日程协调 (时区感知)                        │  │
│  │                                                              │  │
│  │   matchChat Action                                           │  │
│  │   └── 多轮对话收集用户需求 → 输出 matchSuggestion JSON         │  │
│  │       (skillTag + level + ready 状态机)                       │  │
│  │                                                              │  │
│  │   socialMedia.analyzeAccount Action                           │  │
│  │   └── AI 分析社交媒体内容 → consistencyScore                  │  │
│  │       + depthScore + engagementScore (三维度 0~100)           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Data Layer (16 Tables, Typed Schema)             │  │
│  │                                                              │  │
│  │   Core: users / skills / sessions / contacts / messages      │  │
│  │   Social: posts / communityUpdates / reviews                 │  │
│  │   AI: matchCache / aiConversations                           │  │
│  │   Trust: socialMediaAccounts / socialMediaAnalysis            │  │
│  │   Growth: exchangeThreads / exchangeThreadPosts / milestones │  │
│  │   Web3: nftStories                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Auth: Clerk JWT → Convex Auth Config (JWKS 自动验证)             │
│  Storage: Convex File Storage (NFT 元数据)                        │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Multi-Agent 系统设计

#### 架构决策：为什么选择 Multi-Agent 而非单体 AI

| 方案 | 优势 | 劣势 |
|------|------|------|
| 单体 LLM | 实现简单 | 无法并行、上下文爆炸、职责不清 |
| RAG Pipeline | 知识检索强 | 不适合决策型任务 |
| **Multi-Agent** | 职责隔离、独立演进、可并行 | 编排复杂度高 |

SkillSwap 采用 **中枢调度型 Multi-Agent 架构**，共 5 个专职 Agent：

**Orchestrator Agent（中枢调度）**
- 职责：解析用户意图，路由到对应子 Agent
- 实现：`convex/agents/orchestrator.ts` → `handleUserAction` mutation
- 决策逻辑：基于 `action` 字段的确定性路由（match / recommend / rating / nft_mint）
- 设计考量：统一入口避免前端直接耦合子 Agent，便于后续新增 Agent 无需改前端

**Matching Agent（智能匹配）**
- 核心算法：TrueSkill 贝叶斯评分系统
  - 每个用户每个技能维护 `μ`（均值）和 `σ`（不确定性）两个参数
  - 匹配度 = `proximity × 0.7 + reliability × 0.3`
  - `proximity = 1 - |μ₁ - μ₂| / (avg(μ₁, μ₂) + 1)` — μ 越接近，匹配度越高
  - `reliability = 1 / (1 + (σ₁ + σ₂) / 10)` — σ 越小，评分越可靠
- NFT 权重：`nftWeight = min(0.3, swapCount / 10)` — 交换次数越多，信任度越高
- 最终得分：`matchScore = TrueSkill(70%) + NFT(30%)`
- 缓存策略：`matchCache` 表存储 Top 5 匹配结果，1 小时 TTL，避免重复计算

**Rating Agent（评分更新）**
- 触发条件：交换完成后双方均提交评分
- TrueSkill 更新规则：
  - 正向反馈（score ≥ 4）：`μ += K × (score - 3)`，`σ = max(σ × 0.95, 1.0)`
  - 负向反馈（score < 4）：`μ -= K × (4 - score)`，`σ = min(σ × 1.05, 10.0)`
  - K 因子 = `σ / 5`（不确定性越高，调整幅度越大）
- 副作用：自动递增 NFT `swapCount`，触发渐进式评分重算

**NFT Agent（凭证铸造）**
- 标准 NFT：`tokenId = nft_{userId}_{skillTag}_{timestamp}`
- 故事 NFT：交换完成后 AI 生成交换故事（标题 + 摘要 + 高光时刻）
- 贡献度分配：基于双方评分比例自动计算 `providerContribution` / `requesterContribution`
- 存储：元数据 JSON → Convex Storage（生产环境可扩展至 Polygon 链上存储）

### 2.3 渐进式信任体系（Progressive Trust）

传统平台信任 = 用户评分，存在冷启动和刷分问题。SkillSwap 构建**三维度渐进式信任**：

```
Progressive Rating = Social(30%) + Community(50%) + NFT(20%)

┌─ 维度一：AI 社交媒体分析 (30%) ─────────────────────────────────┐
│                                                                  │
│  用户授权绑定 → B站 / 小红书 / YouTube / 微信公众号               │
│                    ↓                                             │
│  Qwen 3.5 分析内容 → 三维度评分：                                │
│  ├── 持续性 (Consistency): 长期坚持输出的频率和稳定性              │
│  ├── 深度 (Depth): 内容专业程度，是否触及技能核心                  │
│  └── 社区认可 (Engagement): 互动质量（非数量），评论深度           │
│                    ↓                                             │
│  overallScore = Consistency×0.4 + Depth×0.35 + Engagement×0.25  │
│  分析报告 + 内容样本存入 socialMediaAnalysis 表                   │
│  有效期 30 天，过期自动触发重新分析                                │
└──────────────────────────────────────────────────────────────────┘

┌─ 维度二：社区反馈 (50%) ─────────────────────────────────────────┐
│                                                                  │
│  1. 交换反馈帖（自动触发）                                        │
│     session.status → "upcoming" 时自动创建 exchangeThread          │
│     双方可发布 progress / feedback / milestone / shoutout 帖子     │
│                                                                  │
│  2. Soul 式互动里程碑                                             │
│     系统追踪双方的 messageCount / sessionCount / feedbackCount     │
│     达到阈值自动解锁成就勋章：                                     │
│     🤝 初识 (1 次交换) → 📚 活跃 (3+ 反馈) → 💬 知音 (50+ 消息)  │
│     → ⚡ 搭档 (7天+3次交换) → ✨ 灵魂伙伴 (30天+5次+200消息)      │
│                                                                  │
│  3. 双方互评 → TrueSkill 贝叶斯更新                              │
└──────────────────────────────────────────────────────────────────┘

┌─ 维度三：NFT 成就 (20%) ────────────────────────────────────────┐
│                                                                  │
│  技能凭证 NFT：每个技能可铸造一枚，记录交换次数                    │
│  故事 NFT：AI 生成的交换见证，含贡献度分配                        │
│  NFT 橱窗：公开展示交换历史，viewCount 追踪关注度                 │
│  NFT 得分 = Σ(swapCount × 权重) / 最大可能分 × 100               │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 AI 能力矩阵

| AI 功能 | 模型 | 触发场景 | 输入 | 输出 |
|---------|------|---------|------|------|
| 配对助手 | Qwen 3.5-397B | 用户主动对话 | 多轮对话历史 | 匹配建议 + matchSuggestion JSON |
| 实时翻译 | Qwen 3.5-397B | 聊天中点击翻译 | 原文 + 目标语言 | 译文 + 置信度 |
| 合同草拟 | Qwen 3.5-397B | 交换确认前 | 对话上下文 | Markdown 格式协议 |
| 日程协调 | Qwen 3.5-397B | 约定时间 | 双方可用时段 | 3 个候选时间段 |
| 社交分析 | Qwen 3.5-397B | 绑定社交账号后 | 平台内容数据 | 三维度评分 + 分析报告 |
| NFT 故事 | Qwen 3.5-397B | 交换完成后 | 反馈帖 + 评分 | 故事标题 + 摘要 + 高光 |

---

## 三、工具整合：技术栈协同与工程决策

### 3.1 技术选型及理由

| 技术 | 选择 | 替代方案 | 决策理由 |
|------|------|---------|---------|
| 后端框架 | Convex | Firebase / Supabase | 原生 TypeScript、实时订阅、事务性强、Serverless 零运维 |
| AI 模型 | Qwen 3.5-397B-A17B | GPT-4o / Claude | 开源模型、DashScope 托管、成本可控、中文能力强 |
| 鉴权 | Clerk | Auth0 / NextAuth | JWT 自动注入 Convex、Webhook 用户同步、多端 SDK |
| 前端 | Next.js 15 + React 18 | Vite + React | SSR SEO 优化、API Routes 内置、Vercel 一键部署 |
| API 适配 | Next.js API Routes | Express / Fastify | 与前端同技术栈、无需额外服务器、Convex 官方推荐 |
| 部署 | Render + Convex Cloud | Vercel + PlanetScale | Render 支持 Docker、Convex 全托管、全球 CDN |

### 3.2 前后端分离架构

```
┌─────────────────────┐        ┌──────────────────────────────────┐
│  Frontend Repo      │        │  Backend Repo                     │
│  (SkillSwap)        │        │  (skillswap-backend)              │
│                     │        │                                   │
│  lib/api-client.ts  │──HTTP──│  app/api/skills/route.ts         │
│  fetchApi('/skills') │  GET  │    → ConvexHttpClient             │
│                     │        │    → convex.query(api.skills.list)│
│  Components         │        │    → JSON transform               │
│  ├── MainAppLayout  │        │    → corsHeaders + response       │
│  ├── MessagesView   │        │                                   │
│  └── ExchangeView   │        │  convex/ (Serverless Functions)   │
│                     │        │  ├── 21 TypeScript modules        │
│  Clerk Auth ────────│─ JWT ──│  ├── 5 Multi-Agent files         │
│  (Session Token)    │        │  └── 16 database tables           │
└─────────────────────┘        └──────────────────────────────────┘
     Vercel Hosting                    Render + Convex Cloud
```

**数据流转路径**（以技能匹配为例）：

```
1. 用户输入 "我想学吉他" → MessagesView
2. sendAiMatchMessage() → POST /api/ai/match/chat
3. API Route → ConvexHttpClient.action(api.ai.matchChat)
4. Convex Action → Qwen 3.5 API (DashScope)
5. Qwen 返回 matchSuggestion: {skillTag: "吉他", level: "beginner"}
6. API Route → JSON transform → {text, skillIds}
7. 前端展示匹配结果 + 推荐的技能卡片
```

### 3.3 数据库设计（16 表）

| 表 | 索引数 | 核心字段 | 设计意图 |
|----|--------|---------|---------|
| `users` | 2 | clerkId, skillRatings[], nftSkills[], progressiveRating | 单表承载用户身份+能力画像+信任数据 |
| `skills` | 4 | skillTag, level, isAvailable, nftTokenId | 全文搜索(search_title) + 分类索引 |
| `sessions` | 3 | requesterId, providerId, status, ratingUpdate[] | 核心业务流水，驱动反馈帖+里程碑自动触发 |
| `messages` | 3 | conversationId, type(text/skill_request/ai_suggestion) | 支持 AI 建议消息类型 |
| `matchCache` | 1 | matches[], expiresAt | 1h TTL 避免 TrueSkill 重复计算 |
| `milestones` | 3 | userIdA/B (排序存储), unlockedBadges[], relationLevel | by_pair 复合索引保证唯一性 |
| `nftStories` | 4 | providerContribution, storyHighlights[], viewCount | 双方贡献度 + 故事展示 |
| `socialMediaAnalysis` | 2 | consistencyScore, depthScore, engagementScore | 三维度评分 + 30 天有效期 |

### 3.4 安全与防幻觉设计

| 防护层 | 机制 |
|--------|------|
| 鉴权 | Clerk JWT → Convex JWKS 自动验证，每个 mutation/query 调用 `requireAuth()` |
| CORS | 白名单域名（skillswap.lat + localhost），OPTIONS 预检 |
| AI 防幻觉 | `matchChat` 中 AI 输出解析使用正则提取 JSON，解析失败 graceful fallback |
| 评分防刷 | TrueSkill σ 参数控制调整幅度，新用户 σ=8.33（大幅波动），老用户 σ→1.0（稳定） |
| 数据隔离 | 每个查询通过 `requireAuth()` 获取当前用户 ID，只返回该用户有权访问的数据 |

---

## 四、用户体验：AI 驱动的情感化交互

### 4.1 交互流程设计

```
Landing → Onboarding (4 步) → Dashboard
   │           │                   │
   │    1. 学习目标设定          ┌──┴──────────────────────────────┐
   │    2. 语言偏好              │  Home: 推荐技能 + 即将到来的课程  │
   │    3. 技能选择 → 初始化      │  Explore: 技能浏览 + 搜索过滤    │
   │       TrueSkill (μ=25,σ=8.33)│  Messages: 实时聊天 + AI 翻译   │
   │    4. 时间安排              │  Exchange: 会话管理 + 评分        │
   │                            │  Profile: 渐进式评分 + NFT 橱窗   │
   └─ Guest Mode: Mock 数据     └──────────────────────────────────┘
      零登录体验全部功能                 Authenticated Mode: 真实 API
```

### 4.2 AI 融合的用户触点

| 场景 | AI 介入方式 | 用户感知 |
|------|-----------|---------|
| 首次进入 | AI 配对助手主动询问技能需求 | "嗨！告诉我你想学什么，我帮你找最合适的伙伴" |
| 聊天中 | 点击翻译按钮 → 实时翻译消息 | 跨语言交流无障碍 |
| 确认交换 | AI 自动生成技能交换协议 | 一键生成专业合同模板 |
| 约定时间 | AI 分析双方时区推荐时段 | 智能日程协调 |
| 完成交换 | 系统自动创建反馈帖 + 解锁成就 | Soul 式"你们已经是搭档了！" |
| 查看档案 | 三维度渐进式评分可视化 | 信任度一目了然 |

### 4.3 Soul 式情感设计

借鉴 Soul App 的关系升级机制，SkillSwap 为每对交换伙伴维护独立的互动里程碑：

- **陌生人** → 首次匹配，仅能发消息
- **初识** → 完成 1 次交换，解锁 🤝 徽章
- **搭档** → 7 天互动 + 3 次交换，解锁 ⚡ 徽章
- **灵魂伙伴** → 30 天 + 5 次交换 + 200 消息 + 10 反馈，解锁 ✨ 最高成就

每次解锁成就，系统推送通知 + 社区动态公开展示，形成社交正反馈循环。

---

## 五、部署架构

```
                        Internet
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
        Vercel CDN    Render Web    Convex Cloud
        (Frontend)    (Backend API)  (Serverless)
              │            │            │
        Next.js 15    Next.js 14    21 Functions
        Static/SSR    API Routes    Real-time DB
        Clerk UI      CORS + HTTP   16 Tables
              │            │            │
              └────────────┼────────────┘
                           │
                    DashScope API
                   (Qwen 3.5-397B)
```

| 服务 | 平台 | 职责 |
|------|------|------|
| Frontend | Vercel (skillswap.lat) | 用户界面、Clerk 登录、路由 |
| Backend API | Render | 14 个 REST 端点、CORS、数据格式适配 |
| Convex Cloud | convex.cloud | 实时数据库、Serverless 函数、文件存储 |
| AI | DashScope | Qwen 3.5-397B 模型推理 |
| Auth | Clerk | 用户管理、JWT 签发、Webhook |

---

## 六、关键技术指标

| 指标 | 数值 |
|------|------|
| Convex 函数模块 | 21 个 TypeScript 文件 |
| 数据库表 | 16 张（含 37 个索引） |
| REST API 端点 | 14 个（含 CORS + JSON 格式适配） |
| Multi-Agent 数量 | 5 个（Orchestrator + Matching + Recommendation + Rating + NFT） |
| AI Action 数量 | 3 个（processAI + matchChat + analyzeAccount） |
| AI 模型 | Qwen 3.5-397B-A17B（MoE，17B 激活参数） |
| 信任维度 | 3 个（Social 30% + Community 50% + NFT 20%） |
| 成就等级 | 5 级（stranger → acquaintance → partner → soulmate） |
| 前后端分离 | 独立仓库，REST JSON 通信 |

---

*SkillSwap — 让每一次技能交换，都成为一段值得被铭记的故事。*
