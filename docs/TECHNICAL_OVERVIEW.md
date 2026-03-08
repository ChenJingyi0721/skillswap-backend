# SkillSwap — 技术说明文档

---

## 一、产品定位

**一句话定位**：SkillSwap 是一个基于 Multi-Agent 智能调度与 TrueSkill 贝叶斯信任体系的去中心化技能交换平台，用 AI 替代价格信号，用 NFT 替代交易凭证，让技能交换回归"人与人的连接"。

**核心问题**：当前在线技能学习市场存在三个结构性矛盾——**价格壁垒**（Coursera/iTalki 年均消费 $200+ 或 $50-150/h 辅导费）、**信任黑箱**（平台评分可刷、教师资质难以交叉验证）、**匹配低效**（学生被动搜索，无法评估教学风格兼容性与时区适配性）。这三个问题的本质是：传统平台以价格为核心媒介，而技能交换的真正价值在于双方能力的互补与信任的建立。SkillSwap 提出"零货币交易"模型——用户以自身擅长的技能换取想学的技能，AI 全链路介入匹配、评估与信任构建，彻底消除价格壁垒，并通过渐进式信任体系解决冷启动与信任黑箱问题。

---

## 二、亮点功能

### 2.1 Multi-Agent 智能匹配引擎

SkillSwap 采用**中枢调度型 Multi-Agent 架构**，5 个专职 Agent 协同工作。Orchestrator Agent 作为前端唯一入口（`convex/agents/orchestrator.ts` → `handleUserAction`），解析用户意图并路由到 Matching Agent、Recommendation Agent、Rating Agent、NFT Agent 四个子 Agent。这种架构使得各 Agent 可独立演进——例如未来新增"Language Agent"处理跨语言场景只需在 Orchestrator 中新增一个 `case` 分支，前端零改动。与传统单体 LLM 或 RAG Pipeline 相比，Multi-Agent 实现了职责隔离与可并行执行，避免了上下文爆炸与职责边界模糊的工程问题。

### 2.2 TrueSkill 贝叶斯可信评级系统

区别于传统 1-5 星打分，SkillSwap 为每位用户的每项技能维护 `μ`（均值，代表能力水平）与 `σ`（标准差，代表不确定性）两个参数。新用户初始化为 `μ=25, σ=8.33`（高不确定性），随着交换积累，σ 逐渐收敛（正向反馈 `σ *= 0.95`，负向反馈 `σ *= 1.05`），评分越来越"可靠"。匹配算法融合 TrueSkill 相似度（`proximity × 0.7 + reliability × 0.3`）与 NFT 交换次数权重（`min(0.3, swapCount/10)`），确保推荐结果既考虑能力匹配又考虑交换经验。匹配结果存入 `matchCache` 表（1 小时 TTL），避免重复的贝叶斯计算开销。

### 2.3 渐进式信任体系（Progressive Trust）

传统平台信任 = 用户评分，存在冷启动和刷分问题。SkillSwap 构建**三维度渐进式信任**——`Progressive Rating = Social(30%) + Community(50%) + NFT(20%)`。Social 维度由 Qwen 3.5 AI 分析用户在 B 站/小红书/YouTube/微信公众号的内容，从持续性（40%）、深度（35%）、社区认可（25%）三个子维度评分（0~100），分析结果存入 `socialMediaAnalysis` 表并设 30 天有效期。Community 维度涵盖双方互评（TrueSkill 更新）和 Soul 式互动里程碑——系统追踪 messageCount/sessionCount/feedbackCount，达到阈值自动解锁成就徽章（初识 → 搭档 → 灵魂伙伴）。NFT 维度通过链上可验证的交换次数（`swapCount`）提供不可篡改的信任锚点。

### 2.4 NFT 技能徽章与故事铸造

每次交换完成后，NFT Agent 自动生成 `tokenId = nft_{userId}_{skillTag}_{timestamp}` 的技能凭证，元数据存入 Convex Storage。AI 根据反馈帖内容和双方评分生成"交换故事"NFT（`nftStories` 表），包含故事标题、摘要、高光时刻和双方贡献度分配（`providerContribution / requesterContribution`），并支持公开橱窗展示（`isPublic + viewCount`）。NFT 不仅是凭证，更是社交货币——其他用户可浏览你的橱窗，直观了解你的交换历史与社区评价，形成信任的正向飞轮。

### 2.5 AI 驱动的个性化学习路径

Recommendation Agent 挖掘用户历史交换记录中的热门技能标签，结合 TrueSkill μ 值与 NFT swapCount 进行加权排序（`score = mu + swapCount × 2`），推荐最匹配的技能与教学者。AI 配对助手（`matchChat` Action）通过多轮对话逐步收集用户需求（技能、水平、时间偏好），当信息充足时输出结构化 `matchSuggestion` JSON（`{skillTag, level, ready}`），前端据此自动触发 Matching Agent 的 TrueSkill 匹配流程，实现从"模糊需求"到"精准匹配"的完整闭环。

---

## 三、创意来源

**洞察一：技能交换的真正障碍不是供需不足，而是信任缺失。** 我们观察到，大学校园中「你教我 Python，我教你吉他」的需求极其普遍，但缺乏一个可信的中介平台。传统做法依赖口碑或微信群，信息不对称导致匹配效率极低、爽约率高。SkillSwap 的 TrueSkill + NFT + AI 社交分析三重信任体系，正是针对这一"信任真空"设计的工程解法。

**洞察二：Soul App 的关系升级机制证明了"社交游戏化"的有效性。** 我们将 Soul 的互动里程碑机制（陌生人 → 初识 → 搭档 → 灵魂伙伴）移植到技能交换场景。系统追踪双方的消息数、交换次数、反馈数和互动天数，达到阈值自动点亮成就徽章。每次解锁推送社区动态公开展示，形成社交正反馈循环——这不仅提升了用户粘性，更让"技能交换"从交易行为升华为社交体验。

**洞察三：AI 应该是"看不见的助手"，而非"挡在前面的门槛"。** 我们在设计 AI 交互时刻意遵循"无感 AI"原则：翻译在聊天中一键触发、合同自动草拟、日程智能协调、匹配建议自然嵌入对话。用户感知到的是"平台懂我"，而非"在和 AI 对话"。Qwen 3.5-397B 的中文能力保证了本土化场景下的自然语言理解质量。

---

## 四、技术架构

### 4.1 整体架构

```
┌────────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 15 + React 18 + Tailwind CSS)                  │
│  Vercel 部署 (skillswap.lat) │ Clerk 鉴权 │ lib/api-client.ts     │
└───────────────────────────────────┬────────────────────────────────┘
                                    │ REST JSON (14 API Endpoints)
┌───────────────────────────────────┴────────────────────────────────┐
│  Backend API Layer (Next.js 14 API Routes)                        │
│  Render 部署 │ CORS 白名单 │ ConvexHttpClient │ JSON 格式适配      │
└───────────────────────────────────┬────────────────────────────────┘
                                    │ TypeScript RPC
┌───────────────────────────────────┴────────────────────────────────┐
│  Convex Serverless Platform                                       │
│                                                                    │
│  ┌── Multi-Agent Layer ─────────────────────────────────────────┐  │
│  │  Orchestrator → Matching │ Recommendation │ Rating │ NFT     │  │
│  │  handleUserAction() 统一入口，action 字段确定性路由           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌── AI Action Layer (Qwen 3.5-397B via DashScope) ─────────────┐ │
│  │  processAI: translate │ contract │ schedule                   │ │
│  │  matchChat: 多轮对话 → matchSuggestion JSON (状态机)          │ │
│  │  analyzeAccount: 社交媒体三维度评分 (Consistency/Depth/Engage)│ │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌── Data Layer (16 Tables, 37 Indexes, Typed Schema) ──────────┐ │
│  │  Core: users / skills / sessions / contacts / messages        │ │
│  │  Trust: socialMediaAccounts / socialMediaAnalysis              │ │
│  │  Growth: exchangeThreads / milestones (Soul 式成就)           │ │
│  │  Web3: nftStories (贡献度 + AI 故事 + 橱窗展示)               │ │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Auth: Clerk JWT → JWKS 自动验证 │ Storage: NFT 元数据            │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 关键技术决策

| 决策点 | 选择 | 替代方案 | 理由 |
|--------|------|---------|------|
| Agent 架构 | 中枢调度 Multi-Agent | 单体 LLM / RAG | 职责隔离、独立演进、可并行；RAG 适合检索不适合决策 |
| 评分算法 | TrueSkill (μ/σ 贝叶斯) | Elo / 简单平均分 | 内置不确定性建模，抗冷启动，新用户 σ=8.33 快速校准 |
| AI 模型 | Qwen 3.5-397B-A17B (MoE) | GPT-4o / Claude | 开源可控、DashScope 托管低成本、中文能力强 |
| 实时数据库 | Convex | Firebase / Supabase | TypeScript 原生、事务性强、Serverless 零运维 |
| 鉴权 | Clerk | Auth0 / NextAuth | JWT 原生注入 Convex、Webhook 自动同步用户 |
| NFT 存储 | Convex Storage (可扩展 Polygon) | 直接上链 | MVP 阶段降低复杂度，元数据结构已兼容 ERC-721 |

### 4.3 AI 防幻觉与安全设计

- **结构化输出约束**：`matchChat` 中 AI 返回文本末尾嵌入 JSON，后端用正则 `/\{"matchSuggestion":\s*\{[^}]+\}\}/` 提取，解析失败时 graceful fallback 为纯文本回复，不中断用户体验。
- **评分防刷机制**：TrueSkill 的 σ 参数天然限制操纵空间——新用户 σ=8.33 时单次评分可调整 μ ≈ ±0.67；老用户 σ→1.0 后单次仅调整 ±0.08，刷分成本指数级增长。
- **权限隔离**：每个 Convex mutation/query 的第一行调用 `requireAuth(ctx)` 获取当前用户身份，所有数据查询均以用户 ID 作为过滤条件，服务端不信任客户端传入的 userId。
- **CORS 白名单**：仅允许 `skillswap.lat`、`localhost:3000` 及部署域名访问后端 API。

---

## 五、场景应用

### 5.1 用户闭环流程

```
注册 → Onboarding (4步采集技能画像)
         │
         ├─ 目标设定：想学什么？
         ├─ 语言偏好：中文 / 英文 / 日文...
         ├─ 技能选择 → 系统初始化 TrueSkill (μ=25, σ=8.33)
         └─ 时间安排：每周可用时段
                │
                ▼
       AI 配对助手 (matchChat Action)
       "我想学吉他" → 多轮对话收集需求
       → matchSuggestion: {skillTag:"吉他", level:"beginner", ready:true}
                │
                ▼
       Matching Agent 执行 TrueSkill 匹配
       → Top 5 候选人 (matchScore 降序)
       → 结果缓存 matchCache (1h TTL)
                │
                ▼
       用户选择伙伴 → 发起交换请求 (skill_request 消息)
       → AI 自动草拟交换协议 (contract Action)
       → AI 智能协调时间 (schedule Action)
       → 双方确认 → session 创建 (status: upcoming)
                │
                ▼
       系统自动触发：
       ├─ 创建 exchangeThread (公开反馈帖)
       ├─ 创建/更新 milestones (互动里程碑)
       └─ 生成 roomLink (视频交换链接)
                │
                ▼
       交换完成 → session.status: completed
       → 双方互评 (1-5 分)
       → Rating Agent 触发 TrueSkill 贝叶斯更新
         ├─ 正向(≥4): μ↑ σ↓ (能力确认)
         └─ 负向(<4): μ↓ σ↑ (信任存疑)
       → NFT Agent 铸造技能凭证 + AI 生成交换故事
       → 社区动态公开展示
                │
                ▼
       渐进式信任持续增长
       → 更高 matchScore → 吸引更优质匹配 → 飞轮效应
```

### 5.2 核心场景示例

**场景 A：跨语言技能交换**
一位中国学生想学西班牙语，一位西班牙留学生想学中文书法。AI 配对助手通过多轮对话确认双方需求后，Matching Agent 基于 TrueSkill 找到能力水平相当的匹配（`proximity ≈ 0.85`）。聊天过程中遇到语言障碍时，点击翻译按钮（`processAI: translate`）即可实时翻译。交换完成后，双方的 NFT 橱窗各增加一枚带有 AI 生成故事的交换见证。

**场景 B：新用户冷启动**
新用户注册时没有任何评价记录。系统通过 Onboarding 采集技能画像后初始化 TrueSkill（`μ=25, σ=8.33`，高不确定性）。用户绑定 B 站账号后，AI 分析其编程教程视频内容，给出 `consistencyScore: 78, depthScore: 82, engagementScore: 65`，综合社交分 75 分。这个 Social Score 直接注入 Progressive Rating，解决了"零评价无人敢交换"的冷启动困境。

---

## 六、技术前瞻与优化思路

### 6.1 短期优化（1-3 个月）

- **RAG 增强匹配**：将用户的技能描述、交换反馈帖、社交媒体分析报告向量化后存入 Convex 全文搜索索引，让 Matching Agent 从"标签匹配"升级为"语义匹配"——例如用户搜索"Web 开发"能匹配到标签为"React/Next.js/TypeScript"的教学者。
- **Agent 间协作升级**：当前 Orchestrator 采用确定性路由（switch-case），下一步引入 LLM-based Router，让 Orchestrator 自主判断"这个请求需要先调 Matching 再调 Recommendation"的多步编排，实现真正的自主决策 Agent。
- **实时推送**：利用 Convex 的实时订阅能力（`useQuery` 自动 re-render），当匹配缓存更新或新成就解锁时，前端无需轮询即可即时展示。

### 6.2 中期演进（3-6 个月）

- **多模态 AI 评估**：社交媒体分析从"文本描述评估"升级为"视频/图片内容理解"——AI 直接观看用户的 B 站教程视频，评估教学节奏、表达清晰度、内容结构性。
- **链上 NFT 扩展**：将 NFT 元数据从 Convex Storage 迁移至 Polygon 链上，元数据结构已兼容 ERC-721 标准（`tokenId + metadataUri`），支持跨平台可验证的技能凭证。
- **个性化学习路径生成**：基于用户的交换历史、TrueSkill 变化曲线和 Recommendation Agent 的推荐数据，AI 自动生成"30 天技能提升路线图"，融合每周推荐匹配 + 学习目标 + 里程碑奖励。

### 6.3 长期愿景（6-12 个月）

- **去中心化治理**：引入 DAO 机制，NFT 持有者可对平台规则（如 TrueSkill 参数调整、新 Agent 上线）进行投票。交换故事 NFT 不仅是凭证，更是治理权的载体。
- **跨平台 Agent 网络**：开放 Orchestrator API，允许第三方教育平台接入 SkillSwap 的 Matching/Rating Agent，形成去中心化的技能评估网络。
- **联邦学习隐私保护**：用户的 TrueSkill 参数和社交媒体分析结果在本地计算，仅将加密后的匹配得分上传至中心服务器，实现"数据可用不可见"。

### 6.4 技术指标概览

| 指标 | 数值 |
|------|------|
| Convex Serverless 函数 | 21 个 TypeScript 模块 |
| 数据库表 | 16 张（含 37 个索引） |
| REST API 端点 | 14 个（含 CORS + JSON 格式适配） |
| Multi-Agent | 5 个专职 Agent |
| AI Action | 3 个（processAI + matchChat + analyzeAccount） |
| AI 模型 | Qwen 3.5-397B-A17B（MoE 架构，17B 激活参数） |
| 信任维度 | 3 维度加权（Social 30% + Community 50% + NFT 20%） |
| 成就体系 | 5 级关系升级（stranger → soulmate） |

---

*SkillSwap — 让每一次技能交换，都成为一段值得被铭记的故事。*
