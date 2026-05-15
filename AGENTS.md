# AGENTS.md — AI 企业效率 Agent 架构约束

> [!IMPORTANT]
> 本文件是 **AI 企业效率 Agent** 项目的最高架构约束文档。

---

## 一、项目概述

| 项目名称 | AI 企业效率 Agent |
|---|---|
| 架构模式 | **前后端分离 Monorepo** |
| 后端语言 | TypeScript |
| 后端框架 | **Express** |
| ORM | **Prisma** |
| 前端框架 | **React 18** |
| 前端构建 | **Vite** |
| 状态管理 | **Zustand** |
| 样式方案 | **Tailwind CSS**（CDN） |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） |
| 后端端口 | 3001 |
| 前端端口 | 5173 |

---

## 二、技术栈约束

### 后端（apps/api/）
| 依赖 | 用途 |
|---|---|
| `express` | Web 框架 |
| `prisma` / `@prisma/client` | ORM |
| `zod` | 请求/响应校验 |
| `pino` / `pino-pretty` | 日志 |
| `cors` | CORS 中间件 |
| `tsx` | TypeScript 开发运行 |

### 前端（apps/web/）
| 依赖 | 用途 |
|---|---|
| `react` / `react-dom` | UI 框架 |
| `react-router-dom` | 路由 |
| `zustand` | 状态管理 |
| `axios` | HTTP 请求 |
| `tailwindcss` | 样式框架 |

### Agent Core（packages/agent-core/）
纯 TypeScript 逻辑包，不依赖任何框架。

---

## 三、核心架构约定

### 3.1 分层规范
```
HTTP → Router → Service → agent-core (AgentRuntime) → Tool → Prisma → DB
```

- **Router**：只负责接收请求、校验 Schema、调用 Service
- **Service**：业务逻辑，调用 agent-core
- **agent-core**：Agent 编排引擎（IntentRouter, Planner, Validator, Executor, Memory）
- **Tool**：业务能力封装，Agent 不直接操作 DB
- **Prisma**：数据库访问层

### 3.2 Agent 安全约束
1. Agent 不能直接操作数据库，必须通过 Tool Layer
2. 所有 Tool 调用必须记录日志
3. 高风险操作必须创建 ConfirmationRequest，用户确认后才执行
4. LLM 输出必须通过 Zod 校验，不合法则重试
5. Agent 不允许执行任意代码

### 3.3 API 设计规范
- 路径格式：`/api/v1/{模块}/{资源}`
- 统一响应：`{ data: ..., message: "ok" }`
- 错误通过统一 error handler 处理
- MVP 鉴权：`x-user-id` header

---

## 四、禁止事项

| 禁止行为 | 原因 |
|---|---|
| Agent 直接操作数据库 | 违反安全分层 |
| 高风险操作不经用户确认 | 数据安全风险 |
| LLM 输出不校验直接使用 | JSON 格式不稳定 |
| 硬编码密钥 | 安全风险 |
| 引入重型 UI 组件库 | 与 Tailwind 冲突 |

---

*最后更新：2026-05-14*
