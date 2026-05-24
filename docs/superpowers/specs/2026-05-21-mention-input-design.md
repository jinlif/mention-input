# Mention Input Web Component 设计文档

## 概述

基于 Lit 框架构建的 `<mention-input>` Web Component，提供正则驱动的文本高亮、弹出建议列表和双向数据绑定。框架无关，可在 Vue、React 及原生 HTML 中使用。

## 架构

单一 `<mention-input>` 组件，Shadow DOM 隔离：

```
<mention-input>
  #shadow-root
  ├── <div class="mention-input-wrapper">
  │   ├── <div class="overlay">        ← 高亮渲染层（absolute 覆盖）
  │   └── <textarea>                    ← 实际输入框（文字透明，光标可见）
  └── <div class="popup">              ← 弹出建议列表（absolute 定位）
```

核心流程：

1. 用户输入 → 遍历所有规则的正则检测光标前文本
2. 匹配成功 → 提取捕获组作为查询词 → 过滤/获取 mentionList → 显示 popup
3. 用户选择 → 替换匹配文本 → 记录选中状态 → 高亮渲染 → emit 事件
4. 外部设置 value → 全文正则扫描 → 自动识别匹配 → 高亮渲染

## 数据模型

### MentionRule

每条 mention 规则定义一种触发模式：

```ts
interface MentionRule {
  name: string                    // 规则标识，如 "file-ref"、"command"
  regex: RegExp                   // 匹配模式，需含至少一个捕获组，最后一个捕获组作为查询词
  label: string                   // 弹出列表头部显示名，如 "文件引用"
  items?: MentionItem[]           // 静态列表（与 fetchItems 二选一，同时提供时 fetchItems 优先）
  fetchItems?: (                  // 异步获取（与 items 二选一，同时提供时优先）
    query: string,
    path?: string
  ) => Promise<MentionItem[]>
  color?: string                  // 文字色，如 "#4fc3f7"
  bgColor?: string                // 背景色，如 "#1a3a4a"
  className?: string              // 自定义 CSS 类名
}
```

### MentionItem

弹出列表中的每一项：

```ts
interface MentionItem {
  id: string                      // 唯一标识
  label: string                   // 显示名称，选择后替换到输入框的文本
  description?: string            // 可选描述，显示在 label 下方
  data?: any                      // 任意附加数据，emit 时透传
  isDir?: boolean                 // 是否为目录（目录浏览模式）
  path?: string                   // 目录路径（目录浏览模式，选择目录时传入 fetchItems）
}
```

### SelectedMention

组件内部维护的选中状态：

```ts
interface SelectedMention {
  ruleName: string                // 所属规则名称
  item: MentionItem               // 选中的项
  displayText: string             // 显示文本（即 item.label 带前缀，如 "@file.txt"）
  startIndex: number              // 在文本中的起始位置
  endIndex: number                // 在文本中的结束位置
}
```

## 组件 API

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `rules` | `MentionRule[]` | `[]` | mention 规则列表 |
| `value` | `string` | `""` | 输入文本（支持双向绑定） |
| `placeholder` | `string` | `""` | 占位文本 |
| `disabled` | `boolean` | `false` | 禁用状态 |

### 事件

| 事件名 | detail 类型 | 触发时机 |
|--------|------------|----------|
| `input` | `MentionInputEvent` | 文本变化时（每次输入/选择/删除） |
| `change` | `MentionInputEvent` | 失焦时 |
| `mention-select` | `MentionSelectEvent` | 从 popup 选择项时 |
| `mention-error` | `{ ruleName: string, error: Error }` | fetchItems 抛错时 |

```ts
interface MentionInputEvent {
  value: string                                     // 当前文本
  mentions: Record<string, MentionItem[]>           // 按规则名分组的已选中项
}

interface MentionSelectEvent {
  rule: MentionRule                                 // 匹配的规则
  item: MentionItem                                 // 选中的项
  value: string                                     // 替换后的完整文本
}
```

`mentions` 结构示例：

```ts
{
  value: "hello @file.txt /help",
  mentions: {
    "file-ref": [{ id: "1", label: "file.txt", data: { path: "/src/file.txt" } }],
    "command": [{ id: "2", label: "help", data: { action: "show-help" } }]
  }
}
```

## Mention 检测引擎

### 检测流程

每次用户输入时：

1. 获取 textarea 的 `selectionStart`（光标位置）
2. 取 `text.substring(0, cursorPos)` 作为待检测文本
3. 遍历 `rules` 数组，对每条规则执行 `textBeforeCursor.match(rule.regex)`
4. 有匹配 → 提取最后一个捕获组作为 query，计算匹配起始位置
5. 如果规则有 `items`，本地过滤 `item.label.includes(query)`
6. 如果规则有 `fetchItems`，调用 `fetchItems(query, currentPath)`
7. 有结果 → 显示 popup；无结果 → 隐藏 popup

### 正则约定

每条规则的 `regex` 必须包含至少一个捕获组，**最后一个捕获组**作为用于过滤列表的查询词：

```ts
// @ 文件引用：(^|\s) 为前导，@([^\s@]*) 捕获查询词
{ regex: /(^|\s)@([^\s@]*)$/, ... }

// / 指令：(^|\s) 为前导，\/(\w*) 捕获查询词
{ regex: /(^|\s)\/(\w*)$/, ... }

// 自定义触发器：# 标签
{ regex: /(^|\s)#(\w*)$/, ... }
```

组件内部用 `match[match.length - 1]`（最后一个捕获组）作为查询词，用 `match[0].length` 计算匹配范围。

如果规则的 regex 不含捕获组，控制台输出警告并跳过该规则。

### 匹配优先级

当光标位置同时匹配多条规则时，按 `rules` 数组顺序，**第一条匹配的规则生效**。

### 外部 value 的自动识别

当外部设置 `value` 属性时（非用户输入触发），组件执行全文扫描：

1. 遍历所有规则
2. 对每条规则，用带 `g` 标志的 regex 扫描全文
3. 对每个匹配，提取匹配文本（如 `@file.txt`）
4. 在规则的 items 中查找 `label` 与匹配文本一致的项
5. 存在 → 标记为已选中，记录位置信息
6. overlay 根据选中列表渲染高亮

## 弹出列表（Popup）

### 两种数据模式

**简单列表模式** — `rules[i].items` 是静态数组：

```ts
{
  name: "file-ref",
  regex: /(^|\s)@([^\s@]*)$/,
  label: "文件",
  items: [
    { id: "1", label: "file.txt" },
    { id: "2", label: "foo.md" }
  ]
}
```

用户输入 `@fo` → 本地过滤 `items.filter(i => i.label.includes("fo"))` → 显示 `foo.md`。

**目录浏览模式** — `rules[i].fetchItems` 是异步函数：

```ts
{
  name: "file-ref",
  regex: /(^|\s)@([^\s@]*)$/,
  label: "文件",
  fetchItems: async (query, path) => {
    if (path) return listDirectory(path)  // 浏览目录
    if (query) return searchFiles(query)  // 搜索
    return listRootDirectory()            // 根目录
  }
}
```

组件内部维护每条规则的独立浏览状态：

```ts
interface BrowseState {
  currentPath: string           // 当前目录路径
  items: MentionItem[]          // 当前显示的 items
  loading: boolean              // 是否加载中
}
```

目录导航流程：
- 用户输入 `@` → `fetchItems("", undefined)` → 显示根目录
- 用户选择目录 `src/`（`isDir=true`）→ `currentPath = "src"` → `fetchItems("", "src")` → 显示 src 目录内容
- 用户选择 `..` → `currentPath` 回退到父目录 → 重新 fetchItems

### Popup 交互

**键盘**：
- `↑` / `↓`：移动选中项
- `Enter` / `Tab`：确认选择
- `Escape`：关闭 popup

**鼠标**：
- 点击：选中
- hover：高亮

**空结果**：显示"无匹配项"

**加载中**：显示 loading 指示器（仅 fetchItems 模式）

### Popup 定位

- 默认显示在输入框**上方**
- 空间不足时自动翻转到**下方**
- 水平方向左对齐
- 输入框 resize 或滚动时重新定位

### Popup 渲染结构

```
┌─────────────────────────┐
│ 文件引用            ← rules[i].label │
├─────────────────────────┤
│ 📁 src/                 │  ← isDir=true
│ 📁 node_modules/        │
│ 📄 file.txt             │  ← 普通项
│ 📄 foo.md               │
│    描述文字    ← description │
└─────────────────────────┘
```

## 高亮层（Overlay）

### 工作原理

1. textarea 设置 `color: transparent`，`caret-color` 保留光标
2. overlay 使用与 textarea 完全一致的字体、行高、padding、border
3. overlay 设置 `pointer-events: none`，点击穿透到 textarea
4. 监听 textarea 的 `scroll` 事件，同步 overlay 的 `scrollTop`

### 高亮渲染

overlay 根据已选中的 mentions 生成 HTML：

```html
hello <mark class="mention file-ref">@file.txt</mark> 你好 <mark class="mention command">/help</mark> 世界
```

- 已选中 mention 用 `<mark>` 包裹
- 带规则对应的 `className` 和内联样式（color/bgColor）
- 未匹配文本只做 HTML 转义（`&` `<` `>` `"`）

### 选中状态自动清理

用户删除文本时，如果已选中的 mention 的 `displayText` 不再出现在 value 中，自动从选中列表移除，overlay 更新。

## 样式定制

### 每条规则独立配置

```ts
{
  name: "file-ref",
  color: "#4fc3f7",           // 文字色
  bgColor: "#1a3a4a",         // 背景色
  className: "mention-file"   // 自定义 CSS 类
}
```

样式优先级：`className`（如果提供） > `color/bgColor` 内联样式 > 默认样式

### 默认样式

```css
mark.mention {
  border-radius: 3px;
  padding: 0 2px;
  color: #4fc3f7;
  background: rgba(79, 195, 247, 0.15);
}
```

### Shadow DOM 样式穿透

通过 `::part()` 暴露以下元素：

| part 名 | 元素 | 说明 |
|---------|------|------|
| `popup` | 弹出列表容器 | 可自定义边框、圆角、阴影等 |
| `overlay` | 高亮覆盖层 | 可自定义字体等 |
| `input` | textarea | 可自定义输入框样式 |

```css
/* 外部自定义 popup 样式 */
mention-input::part(popup) {
  border: 1px solid #333;
  border-radius: 8px;
}

/* 外部自定义 overlay 样式 */
mention-input::part(overlay) {
  font-family: monospace;
}
```

## 框架集成

### Vue v-model 桥接

```vue
<template>
  <mention-input
    :rules="rules"
    :value="text"
    @input="text = $event.detail.value"
  />
</template>

<script setup>
import { ref } from 'vue'
import 'mention-input'

const text = ref('')
const rules = [
  { name: 'file', regex: /(^|\s)@([^\s@]*)$/, label: '文件', items: [...] }
]
</script>
```

或封装 composable：

```ts
// useMentionInput.ts
export function useMentionInput(rules: MentionRule[]) {
  const text = ref('')
  const mentions = ref<Record<string, MentionItem[]>>({})
  const onInput = (e: CustomEvent) => {
    text.value = e.detail.value
    mentions.value = e.detail.mentions
  }
  return { text, mentions, onInput, rules }
}
```

### React 状态绑定

```tsx
import { useRef, useEffect, useState } from 'react'
import 'mention-input'

function MentionInputWrapper({ rules, value, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e) => onChange(e.detail.value)
    el.addEventListener('input', handler)
    return () => el.removeEventListener('input', handler)
  }, [onChange])

  useEffect(() => {
    if (ref.current) ref.current.value = value
  }, [value])

  return <mention-input ref={ref} rules={rules} value={value} />
}
```

## 边界情况

| 场景 | 行为 |
|------|------|
| 正则无捕获组 | 控制台警告，跳过该规则 |
| items 和 fetchItems 都未提供 | 仅做正则高亮，不显示 popup |
| fetchItems 抛错 | popup 显示"加载失败"，emit `mention-error` 事件 |
| 粘贴包含 mention 文本 | 触发 value 更新，自动识别匹配并高亮 |
| disabled 状态 | textarea 禁用，popup 不弹出 |
| 同时匹配多条规则 | 按 rules 数组顺序，第一条匹配的规则生效 |
| 输入框 resize | overlay 和 popup 跟随重新定位 |
| 删除已选中 mention 的文本 | 自动从选中列表移除，高亮消失 |

## 包结构

```
mention-input/
├── src/
│   ├── mention-input.ts      ← 主组件（Lit）
│   ├── mention-detector.ts   ← 正则检测引擎（纯函数）
│   ├── mention-popup.ts      ← popup 子组件（Lit）
│   ├── types.ts              ← 类型定义
│   └── styles.ts             ← 默认样式
├── package.json
├── tsconfig.json
└── vite.config.ts            ← 构建配置（输出 Web Component）
```

输出：单个 JS 文件，`import` 即用，自动注册 `<mention-input>` 自定义元素。
