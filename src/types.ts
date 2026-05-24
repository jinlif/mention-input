// ── Command types ──

export type CommandAction = 'modal' | 'fill' | 'execute';

export interface Command {
  name: string;
  category: string;
  description: string;
  icon?: string;
  /** For 'fill' action: template string. Use {cursor} to position caret after insertion. */
  prompt?: string;
  action?: CommandAction;
  /** For 'modal' action: identifier for the host application to open a specific modal. */
  modalName?: string;
  /** Nested child commands. Items with children are navigable but not selectable. */
  children?: Command[];
}

// ── Mention types ──

export interface MentionItem {
  id: string;
  label: string;
  description?: string;
  group?: string;
  icon?: string;
  /** Arbitrary data for host application use. */
  data?: unknown;
  /** Nested child items. Items with children are navigable but not selectable. */
  children?: MentionItem[];
}

export interface MentionSource {
  items: MentionItem[];
  /** Custom filter function. Receives query and flattened list of all items across all nesting levels. Defaults to case-insensitive label match. */
  filter?: (query: string, items: MentionItem[]) => MentionItem[];
  /** Display order for groups. Groups not listed appear at the end. */
  groupOrder?: string[];
}

export interface SelectedMention {
  item: MentionItem;
  displayText: string;
  startIndex: number;
}

export interface SelectedCommand {
  command: Command;
  displayText: string;
  startIndex: number;
}

/** Unified highlight item for both /commands and @mentions. */
export interface HighlightItem {
  displayText: string;
  kind: 'command' | 'mention';
}

// ── Event detail types ──

export interface MentionInputValueChangeEvent {
  value: string;
  mentions: SelectedMention[];
  commands: SelectedCommand[];
}

export interface CommandSelectEvent {
  command: Command;
}

export interface MentionSelectEvent {
  item: MentionItem;
}
