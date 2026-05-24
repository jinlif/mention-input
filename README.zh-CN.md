# mention-input

[English](./README.md) | 中文

<p align="center">
  <a href="https://github.com/jinlif/mention-input/releases">
    <img src="https://img.shields.io/npm/v/mention-input?color=blue" alt="version" />
  </a>
  <a href="https://www.npmjs.com/package/mention-input">
    <img src="https://img.shields.io/npm/dm/mention-input.svg" alt="downloads" />
  </a>
  <a href="https://github.com/jinlif/mention-input/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/mention-input" alt="license" />
  </a>
  <br />
</p>

一个框架无关、可扩展的输入组件，支持 `@` 提及和 `/` 斜杠命令。基于 [Lit](https://lit.dev/) 构建为原生 Web Component，可在 React、Vue、Svelte 或纯 HTML 中无缝使用。

<p align="center">
  <img src="./images/demo.png" alt="mention-input 演示" width="600" />
</p>

[English](./README.md) | 中文

## 特性

- **@ 提及** — 输入 `@` 触发可搜索的建议面板，支持分组和嵌套项
- **/ 斜杠命令** — 输入 `/` 浏览命令列表，支持嵌套子命令
- **嵌套导航** — 使用方向键逐层展开分类；含有子项的节点可导航但不可选中
- **命令动作** — 三种内置动作类型：`execute`（直接执行）、`fill`（插入模板，`{cursor}` 标记光标位置）、`modal`（通知宿主应用打开弹窗）
- **自动调整高度** — 文本域随内容从 `minRows` 增长到 `maxRows`
- **高亮层** — 已选中的 @提及 和 /命令 在输入时以不同颜色内联高亮
- **丰富的事件系统** — `submit`、`value-change`、`mention-select`、`command-select` 事件，携带结构化的 detail 对象
- **完整的 CSS 自定义** — 20+ CSS 自定义属性，覆盖颜色、字体、间距、阴影等
- **键盘驱动** — 方向键导航建议列表，Enter 选中，Escape 关闭，Shift+Enter 换行
- **零框架锁定** — 原生 Web Component，浏览器能运行的地方就能用

## 安装

```bash
npm install mention-input
```

## 快速开始

```html
<script type="module">
  import 'mention-input';
</script>

<mention-input placeholder="输入 @ 提及某人或 / 使用命令..."></mention-input>
```

## 使用方式

### 纯 HTML

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import 'mention-input';
  </script>
</head>
<body>
  <mention-input id="input" placeholder="写点什么..."></mention-input>

  <script>
    const el = document.getElementById('input');

    el.mentionSources = {
      items: [
        { id: '1', label: 'Alice', group: '用户', icon: 'A' },
        { id: '2', label: 'Bob', group: '用户', icon: 'B' },
      ],
      groupOrder: ['用户'],
    };

    el.commands = [
      { name: 'help', category: 'system', description: '显示帮助', action: 'execute' },
      { name: 'template', category: 'writing', description: '插入模板', action: 'fill', prompt: '请描述 {cursor}' },
    ];

    el.addEventListener('submit', (e) => {
      console.log('内容:', e.detail.value);
      console.log('提及:', e.detail.mentions);
      console.log('命令:', e.detail.commands);
      el.reset();
    });
  </script>
</body>
</html>
```

### React

```tsx
import { useEffect, useRef } from 'react';
import 'mention-input';

// 自定义元素类型声明
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mention-input': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        disabled?: boolean;
        value?: string;
      };
    }
  }
}

export function ChatInput() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.mentionSources = {
      items: [
        { id: '1', label: '张三', group: '用户', icon: '张' },
        { id: '2', label: '李四', group: '用户', icon: '李' },
      ],
      groupOrder: ['用户'],
    };

    el.commands = [
      { name: 'clear', category: 'system', description: '清空对话', action: 'execute' },
    ];

    const onSubmit = (e: CustomEvent) => {
      console.log(e.detail.value, e.detail.mentions);
      (el as any).reset();
    };

    el.addEventListener('submit', onSubmit);
    return () => el.removeEventListener('submit', onSubmit);
  }, []);

  return <mention-input ref={ref as any} placeholder="输入消息..." />;
}
```

### Vue

```vue
<template>
  <mention-input
    ref="inputRef"
    placeholder="输入消息..."
    @submit="onSubmit"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import 'mention-input';

const inputRef = ref(null);

onMounted(() => {
  const el = inputRef.value;
  if (!el) return;

  el.mentionSources = {
    items: [
      { id: '1', label: '张三', group: '用户', icon: '张' },
      { id: '2', label: '李四', group: '用户', icon: '李' },
    ],
    groupOrder: ['用户'],
  };

  el.commands = [
    { name: 'help', category: 'system', description: '显示帮助', action: 'execute' },
  ];
});

function onSubmit(e) {
  console.log(e.detail.value, e.detail.mentions);
  inputRef.value?.reset();
}
</script>
```

## 数据模型

### 提及 (Mentions)

```ts
interface MentionSource {
  items: MentionItem[];
  filter?: (query: string, items: MentionItem[]) => MentionItem[];
  groupOrder?: string[];
}

interface MentionItem {
  id: string;
  label: string;
  description?: string;
  group?: string;
  icon?: string;
  data?: unknown;
  children?: MentionItem[];
}
```

### 命令 (Commands)

```ts
interface Command {
  name: string;
  category: string;
  description: string;
  icon?: string;
  action?: 'execute' | 'fill' | 'modal';
  prompt?: string;       // 'fill' 动作：模板字符串，{cursor} 标记光标位置
  modalName?: string;    // 'modal' 动作：宿主应用用于识别弹窗的标识
  children?: Command[];
}
```

## 事件

| 事件 | Detail | 说明 |
|---|---|---|
| `submit` | `{ value, mentions, commands }` | 按下 Enter（非 Shift+Enter）时触发，包含完整文本和所有已选中的提及/命令 |
| `value-change` | `{ value, mentions, commands }` | 每次输入变化时触发，当提及/命令文本被删除时自动清理对应项 |
| `mention-select` | `{ item }` | 从建议面板选中一个提及时触发 |
| `command-select` | `{ command }` | 从建议面板选中一个命令时触发 |
| `reset` | — | 调用 `reset()` 时触发 |

## 公共 API

| 方法 | 说明 |
|---|---|
| `reset()` | 清空内容、建议列表、高亮，并触发 `reset` 事件 |
| `clear()` | 清空内容和所有已选项，不触发 `reset` 事件 |
| `focus()` | 聚焦内部 textarea |

## CSS 自定义属性

通过 CSS 自定义属性自定义组件外观：

```css
mention-input {
  --mi-font-family: inherit;
  --mi-font-size: 14px;
  --mi-line-height: 1.5;
  --mi-bg: #fff;
  --mi-border: #e2e8f0;
  --mi-border-focus: #3b82f6;
  --mi-text: #1a202c;
  --mi-text-muted: #718096;
  --mi-text-placeholder: #a0aec0;
  --mi-caret-color: #3b82f6;
  --mi-highlight-bg: rgba(59, 130, 246, 0.15);
  --mi-highlight-color: #3b82f6;
  --mi-cmd-highlight-bg: rgba(16, 185, 129, 0.15);
  --mi-cmd-highlight-color: #10b981;
  --mi-panel-bg: #fff;
  --mi-panel-border: #e2e8f0;
  --mi-panel-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
  --mi-selected-bg: rgba(59, 130, 246, 0.08);
  --mi-scrollbar-thumb: #cbd5e0;
  --mi-scrollbar-thumb-hover: #a0aec0;
  --mi-radius: 6px;
  --mi-padding: 8px 12px;
}
```

## Parts

内部 textarea 通过 `textarea` CSS part 暴露，可进行额外样式定制：

```css
mention-input::part(textarea) {
  /* 直接为 textarea 元素设置样式 */
}
```

## 许可证

MIT
