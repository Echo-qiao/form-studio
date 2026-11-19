# 表单设计器（低代码）

拖拽组件搭表单 → 保存成 schema → 发布分享链接 → 收集数据。

核心思路：**表单是数据，不是代码。** 同一份 JSON schema，在任何页面都能渲染出同一个表单。

## 技术栈

Vue3 + TypeScript + Pinia + Vue Router + Vite
Express + TypeScript + Prisma + SQLite
（无 UI 组件库，样式与拖拽均为手写）

## 目录结构

```
form-designer/
├── client/                                # 前端
│   ├── src/components/FieldRenderer.vue   # schema → 界面（递归渲染，设计/填写共用）
│   ├── src/views/DesignerView.vue         # 设计器：组件库 / 画布 / 属性面板
│   ├── src/views/FillView.vue             # 公开填写页（免登录）
│   ├── src/views/RecordsView.vue          # 提交记录（按各自版本渲染）
│   ├── src/lib/schema.ts                  # 字段类型、递归查找、校验规则
│   └── nginx.conf                         # 托管静态文件并反代 /api
├── server/                                # 后端
│   ├── prisma/schema.prisma               # Form / FormVersion / Submission
│   ├── src/services/form.service.ts       # 保存即生成版本快照
│   ├── src/routes/public.routes.ts        # 匿名接口 + IP 限流
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── docker-compose.yml
└── README.md
```


## 功能

- **设计器**：左侧组件库 → 中间画布 → 右侧属性面板；支持拖拽添加、同层排序、嵌套分组
- **7 种字段**：单行文本、多行文本、单选、多选、日期、数字、分组
- **schema 驱动渲染**：渲染器递归解析，一个组件同时服务设计态与填写态
- **版本快照**：每次保存版本 +1，并把 schema 存档；老提交仍用当时的 schema 渲染
- **双端校验**：前后端共用同一套规则（必填、类型、长度、选项合法性）
- **匿名填写**：公开链接免登录，按 IP 限流
- **提交记录**：带版本标记，旧版本记录会标出"旧版本"

## 快速开始

```bash
cd server
pnpm install
cp .env.example .env      # 填 JWT_SECRET
pnpm db:push
pnpm db:seed
pnpm dev                  # http://127.0.0.1:4200
```

```bash
cd client
pnpm install
pnpm dev                  # http://localhost:5190
```

演示账号：`demo@form.com` / `123456`
演示表单公开地址：`http://localhost:5190/f/demoform`

## 页面

| 路径 | 说明 |
| --- | --- |
| `/login` | 登录 / 注册 |
| `/forms` | 我的表单列表（新建、编辑、看数据、打开填写页） |
| `/forms/:id/design` | 设计器（三栏） |
| `/forms/:id/records` | 提交记录 |
| `/f/:shareId` | 公开填写页（免登录） |

## 接口

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 否 | 注册 |
| POST | `/api/auth/login` | 否 | 登录 |
| GET | `/api/forms` | 是 | 我的表单 |
| POST | `/api/forms` | 是 | 新建 |
| GET | `/api/forms/:id` | 是 | 详情（含 schema） |
| PUT | `/api/forms/:id` | 是 | 保存 schema（版本 +1 + 快照） |
| PATCH | `/api/forms/:id/status` | 是 | 发布 / 关闭 |
| GET | `/api/forms/:id/submissions` | 是 | 提交记录（含各自版本的 schema） |
| GET | `/api/f/:shareId` | 否 | 公开取 schema |
| POST | `/api/f/:shareId/submit` | 否 | 公开提交（IP 限流） |

## 四个关键设计

**① schema 驱动渲染**

```json
{
  "version": 2,
  "fields": [
    { "id": "f_score", "type": "radio", "label": "整体满意度", "required": true, "options": ["非常满意","一般","不满意"] },
    { "id": "f_group", "type": "group", "label": "联系方式", "children": [
      { "id": "f_phone", "type": "text", "label": "联系电话" }
    ]}
  ]
}
```

渲染器按 `type` 分发控件；遇到 `group` 就递归渲染 `children`。**同一份 JSON，设计器和填写页共用同一个组件。**

**② 版本快照（最容易被忽略的一点）**

表单改版后，老数据的字段可能在新 schema 里已经不存在了。所以：
- 每次保存都把当版 schema 写入 `FormVersion`
- 每条提交记录保存 `formVersion`
- 查看记录时，用**该记录当时的 schema** 渲染

实测：v1 的记录有 4 个字段（含"建议"），v2 改成 3 个字段（含"电话"），两种记录在同一个列表里都能正确展示。

**③ 前后端同一套校验**

规则写在 schema 里（`required` / `maxLength` / `options`），前端生成校验器，后端用同一份规则再验一次。
避免"前端过了、后端返回 400"的经典问题。实测非法选项会被后端拦下：

```
HTTP 400：整体满意度 的选项不合法
```

**④ 匿名填写必须防滥用**

公开接口免登录，所以：只暴露读 schema 与提交两个接口（不能改表单）、按 `IP + shareId` 每分钟 10 次限流、服务端再校验一遍。

## 联调中遇到的问题

- **公开提交接口收到乱码选项**：请求未声明 UTF-8 编码时，中文选项会变成乱码并被选项白名单拦下。定位后统一按 UTF-8 解析，并在服务端对选项做严格白名单校验。
- **嵌套字段的值不能挂在分组上**：最初把 children 的值存在 `data[group.id]` 下，导致提交数据结构不稳定。改成"分组只是布局，值一律按字段 id 存在顶层"。
- **跨层拖拽**：只支持同层排序。跨层移动会让 schema 结构难以理解，属于刻意不做。

## 没做

- 字段联动（选了 A 才显示 B）
- 条件跳转 / 分页
- 表单模板市场

## 用 Docker 跑（推荐）

```bash
copy .env.example .env         # 已生成过可跳过
docker compose up -d --build
docker compose ps              # 两个容器，api 应为 healthy
```

| 地址 | 说明 |
| --- | --- |
| http://localhost:8090 | 前端（Nginx） |
| http://localhost:4200/health | 后端直连 |
| http://localhost:8090/f/demoform | 演示用公开填写页 |

> 端口用 **8090**，避免与本地其它服务冲突。

### 镜像结构

- `server/Dockerfile`：三阶段（deps → build → runtime），runtime 只保留 `dist`、`node_modules`、`prisma`，以非 root 的 `node` 用户运行，`tini` 当 1 号进程
- `client/Dockerfile`：Vite 构建 → Nginx 托管静态文件并反代 `/api`

### SQLite 的关键：数据卷

SQLite 是文件数据库，容器重建就会丢。所以：

```
DATABASE_URL = file:/data/dev.db
volumes      = sqlite_data:/data
```

实测：`docker compose restart api` 之后，提交记录仍在（卷里）。
**但 `docker compose down -v` 会删卷，数据全没**——日常别加 `-v`。

### 启动流程

`docker-entrypoint.sh` 做三件事：

1. `prisma db push` 同步表结构（幂等）
2. `SEED_ON_START=1` 时写入演示账号与演示表单（已有数据会自动跳过）
3. `exec node dist/index.js`，让 node 成为 1 号进程的直系子进程，`docker stop` 才能干净退出

### 一个容易混的点

**容器里的数据库和你本机 `server/prisma/dev.db` 是两套。**
容器用卷里的 `/data/dev.db`，本机 `pnpm dev` 用 `server/prisma/dev.db`，互不影响。

### 常用命令

```bash
docker compose logs -f api     # 看后端日志
docker compose restart api     # 重启后端
docker compose down            # 停止（数据保留）
docker compose down -v         # 停止并删数据卷（慎用）
```
