import { LitElement, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { inputStyles } from './styles/input.styles.js';
import { detectCommand, detectMention } from './utils/detection.js';
import './components/command-suggestions.js';
import './components/mention-suggestions.js';
import type { CommandSuggestions } from './components/command-suggestions.js';
import type { MentionSuggestions } from './components/mention-suggestions.js';
import type {
  Command,
  MentionItem,
  MentionSource,
  SelectedMention,
  SelectedCommand,
  HighlightItem,
} from './types.js';

@customElement('mention-input')
export class MentionInput extends LitElement {
  static override styles = inputStyles;

  // ── Public properties ──

  @property({ type: String })
  value = '';

  @property({ type: String })
  placeholder = '';

  @property({ type: Array })
  commands: Command[] = [];

  @property({ type: Object })
  mentionSources: MentionSource = { items: [] };

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Number })
  maxRows = 15;

  @property({ type: Number })
  minRows = 2;

  // ── Internal state ──

  @state()
  private _commandActive = false;

  @state()
  private _commandQuery = '';

  @state()
  private _mentionActive = false;

  @state()
  private _mentionQuery = '';

  @state()
  private _mentionStartPos = 0;

  @state()
  private _commandStartPos = 0;

  @state()
  private _selectedMentions: SelectedMention[] = [];

  @state()
  private _selectedCommands: SelectedCommand[] = [];

  private _pendingRafs: number[] = [];

  // ── Refs ──

  @query('textarea')
  private _textarea!: HTMLTextAreaElement;

  @query('.highlight-layer')
  private _highlightLayer!: HTMLDivElement;

  @query('mi-command-suggestions')
  private _commandPanel!: CommandSuggestions;

  @query('mi-mention-suggestions')
  private _mentionPanel!: MentionSuggestions;

  // ── Computed highlights ──

  private get _highlights(): HighlightItem[] {
    const items: HighlightItem[] = [];
    for (const c of this._selectedCommands) {
      items.push({ displayText: c.displayText, kind: 'command' });
    }
    for (const m of this._selectedMentions) {
      items.push({ displayText: m.displayText, kind: 'mention' });
    }
    return items;
  }

  private _escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private _renderHighlightLayer() {
    const highlights = this._highlights;
    const text = this.value;

    // textarea 末尾有 \n 时会多出一行高度，div 不会，需要补偿
    const displayText = text.endsWith('\n') ? text + '\n' : text;

    if (highlights.length === 0) {
      return html`<div class="highlight-layer" aria-hidden="true">${displayText}</div>`;
    }

    // Build regex pattern, sorted by length descending to avoid partial matches
    const sorted = [...highlights].sort((a, b) => b.displayText.length - a.displayText.length);
    const pattern = new RegExp(
      sorted.map((m) => this._escapeRegExp(m.displayText)).join('|'),
      'g'
    );

    // Build kind map for styling
    const kindMap = new Map<string, string>();
    for (const item of sorted) {
      kindMap.set(item.displayText, item.kind);
    }

    // Split text into parts
    const parts: { text: string; kind?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    pattern.lastIndex = 0;
    match = pattern.exec(displayText);
    while (match !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: displayText.slice(lastIndex, match.index) });
      }
      parts.push({ text: match[0], kind: kindMap.get(match[0]) });
      lastIndex = pattern.lastIndex;
      match = pattern.exec(displayText);
    }
    if (lastIndex < displayText.length) {
      parts.push({ text: displayText.slice(lastIndex) });
    }

    return html`<div class="highlight-layer" aria-hidden="true">${parts.map((part) =>
      part.kind
        ? html`<mark class=${part.kind}>${part.text}</mark>`
        : html`<span>${part.text}</span>`
    )}</div>`;
  }

  // ── Lifecycle ──

  override disconnectedCallback() {
    super.disconnectedCallback();
    for (const id of this._pendingRafs) cancelAnimationFrame(id);
    this._pendingRafs = [];
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('value')) {
      this._autoResize();
    }
  }

  // ── Auto-resize ──

  private _autoResize() {
    const ta = this._textarea;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20;
    const maxHeight = lineHeight * this.maxRows;
    const minHeight = lineHeight * this.minRows;
    const height = Math.max(minHeight, Math.min(ta.scrollHeight, maxHeight));
    ta.style.height = `${height}px`;
  }

  // ── Event handlers ──

  private _handleInput() {
    const ta = this._textarea;
    if (!ta) return;

    this.value = ta.value;
    const cursorPos = ta.selectionStart;

    // Detect slash command
    const cmd = detectCommand(this.value, cursorPos);
    this._commandActive = cmd.active;
    this._commandQuery = cmd.query;
    if (cmd.active) {
      this._commandStartPos = cmd.startPos;
    }

    // Detect mention (only when command panel is not active)
    if (!this._commandActive) {
      const mention = detectMention(this.value, cursorPos);
      this._mentionActive = mention.active;
      if (!this._mentionPanel?.suppressQueryReset) {
        this._mentionQuery = mention.query;
      }
      this._mentionStartPos = mention.startPos;
    } else {
      this._mentionActive = false;
    }

    // Clean up mentions whose displayText is no longer in the value
    // Use negative lookahead to avoid false positives (e.g. @John vs @Johnny)
    // Note: \b doesn't work with CJK characters, so we use (?!\w) instead
    this._selectedMentions = this._selectedMentions.filter((m) => {
      const pattern = new RegExp(this._escapeRegExp(m.displayText) + '(?!\\w)');
      return pattern.test(this.value);
    });

    // Clean up commands whose displayText is no longer in the value
    this._selectedCommands = this._selectedCommands.filter((c) => {
      const pattern = new RegExp(this._escapeRegExp(c.displayText) + '(?!\\w)');
      return pattern.test(this.value);
    });

    this._dispatchValueChange();
  }

  private _handleScroll() {
    if (this._highlightLayer) {
      this._highlightLayer.scrollTop = this._textarea?.scrollTop ?? 0;
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    // Delegate to active suggestion panel first
    if (this._commandActive && this._commandPanel?.handleKeyDown(e)) {
      return;
    }
    if (this._mentionActive && this._mentionPanel?.handleKeyDown(e)) {
      return;
    }

    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._handleSubmit();
    }
  }

  // ── Command selection ──

  private _handleCommandSelect(e: CustomEvent<{ command: Command }>) {
    const { command } = e.detail;
    this._commandActive = false;

    // The commandStartPos points to the space (or / if at line start).
    // Check if the character AT startPos is whitespace to preserve it.
    const hasLeadingSpace =
      this._commandStartPos < this.value.length &&
      /\s/.test(this.value[this._commandStartPos]);

    // Keep the leading space, start the replacement from the / character
    const cmdTextStart = hasLeadingSpace
      ? this._commandStartPos + 1
      : this._commandStartPos;

    const cursorPos = this._textarea.selectionStart;

    if (command.action === 'execute') {
      if (cmdTextStart !== -1) {
        const before = this.value.substring(0, cmdTextStart);
        const after = this.value.substring(cursorPos);
        this.value = (before + after).replace(/^ +$/, '');
        this._textarea.value = this.value;
      }
      this._dispatchValueChange();
      this._pendingRafs.push(requestAnimationFrame(() => this._textarea.focus()));
      return;
    }

    // Keep the /command text in the input and track it for highlighting
    const displayText = `/${command.name}`;
    if (cmdTextStart !== -1) {
      // Replace /query with /commandName (complete the command name)
      const before = this.value.substring(0, cmdTextStart);
      const after = this.value.substring(cursorPos);
      const needsSpace = after.length === 0 || (after[0] !== ' ' && after[0] !== '\n');
      this.value = before + displayText + (needsSpace ? ' ' : '') + after;
      this._textarea.value = this.value;

      const newCmd: SelectedCommand = {
        command,
        displayText,
        startIndex: cmdTextStart,
      };
      this._selectedCommands = [
        ...this._selectedCommands.filter((c) => c.displayText !== displayText),
        newCmd,
      ];

      // Position cursor after the command text
      const newPos = before.length + displayText.length + (needsSpace ? 1 : 0);
      this._pendingRafs.push(requestAnimationFrame(() => {
        this._textarea.setSelectionRange(newPos, newPos);
        this._textarea.focus();
      }));
    }

    this._dispatchValueChange();
  }

  // ── Mention selection ──

  private _handleMentionSelect(e: CustomEvent<{ item: MentionItem }>) {
    const { item } = e.detail;
    const displayText = `@${item.label}`;
    const cursorPos = this._textarea?.selectionStart ?? this.value.length;

    // The regex (^|\s)@... means startPos points to the space (or @ if at line start).
    // Check if the character AT startPos is whitespace to preserve it.
    const hasLeadingSpace =
      this._mentionStartPos < this.value.length &&
      /\s/.test(this.value[this._mentionStartPos]);

    // Keep the leading space, start the replacement from the @ character
    const mentionTextStart = hasLeadingSpace
      ? this._mentionStartPos + 1
      : this._mentionStartPos;

    const before = this.value.substring(0, mentionTextStart);
    const after = this.value.substring(cursorPos);

    // Add trailing space if needed
    const needsSpace = after.length === 0 || (after[0] !== ' ' && after[0] !== '\n');
    this.value = before + displayText + (needsSpace ? ' ' : '') + after;
    this._textarea.value = this.value;

    // Add to selected mentions
    const newMention: SelectedMention = {
      item,
      displayText,
      startIndex: mentionTextStart,
    };
    this._selectedMentions = [
      ...this._selectedMentions.filter((m) => m.displayText !== displayText),
      newMention,
    ];

    // Position cursor after the mention
    const newPos = before.length + displayText.length + (needsSpace ? 1 : 0);
    this._pendingRafs.push(requestAnimationFrame(() => {
      this._textarea.setSelectionRange(newPos, newPos);
      this._textarea.focus();
    }));

    this._mentionActive = false;

    this._dispatchValueChange();
  }

  // ── Submit ──

  private _handleSubmit() {
    const detail = {
      value: this.value,
      mentions: [...this._selectedMentions],
      commands: [...this._selectedCommands],
    };

    this.dispatchEvent(
      new CustomEvent('submit', {
        detail,
        bubbles: true,
        composed: true,
      })
    );

    this.reset();
  }

  // ── Value change dispatch ──

  private _dispatchValueChange() {
    this.dispatchEvent(
      new CustomEvent('valuechange', {
        detail: {
          value: this.value,
          mentions: [...this._selectedMentions],
          commands: [...this._selectedCommands],
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  // ── Close handlers ──

  private _handleCommandClearQuery() {
    this._commandQuery = '';
  }

  private _handleCommandClose() {
    this._commandActive = false;
  }

  private _handleMentionClearQuery() {
    this._mentionQuery = '';
  }

  private _handleMentionClose() {
    this._mentionActive = false;
  }

  // ── Public API ──

  /** Clear the input value and all selected items. */
  clear() {
    this.value = '';
    this._selectedMentions = [];
    this._selectedCommands = [];
    this._commandActive = false;
    this._mentionActive = false;
    if (this._textarea) this._textarea.value = '';
    this._dispatchValueChange();
  }

  /** Reset the input: clear value, suggestions, highlights, and dispatch a reset event. */
  reset() {
    this.value = '';
    this._selectedMentions = [];
    this._selectedCommands = [];
    this._commandActive = false;
    this._mentionActive = false;
    this._commandQuery = '';
    this._mentionQuery = '';
    if (this._textarea) this._textarea.value = '';
    this.dispatchEvent(
      new CustomEvent('reset', { bubbles: true, composed: true })
    );
    this._dispatchValueChange();
  }

  /** Focus the textarea. */
  override focus(options?: FocusOptions) {
    this._textarea?.focus(options);
  }

  // ── Render ──

  override render() {
    return html`
      <div class="input-area">
        <mi-command-suggestions
          .commands=${this.commands}
          .query=${this._commandQuery}
          .visible=${this._commandActive}
          @commandselect=${this._handleCommandSelect}
          @clear-query=${this._handleCommandClearQuery}
          @close=${this._handleCommandClose}
        ></mi-command-suggestions>

        <mi-mention-suggestions
          .items=${this.mentionSources.items}
          .query=${this._mentionQuery}
          .visible=${this._mentionActive}
          .groupOrder=${this.mentionSources.groupOrder ?? []}
          .customFilter=${this.mentionSources.filter ?? undefined}
          @mentionselect=${this._handleMentionSelect}
          @clear-query=${this._handleMentionClearQuery}
          @close=${this._handleMentionClose}
        ></mi-mention-suggestions>

        <div class="input-wrapper">
          ${this._renderHighlightLayer()}
          <textarea
            part="textarea"
            .value=${this.value}
            .placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            @input=${this._handleInput}
            @scroll=${this._handleScroll}
            @keydown=${this._handleKeyDown}
          ></textarea>
        </div>
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'mention-input': MentionInput;
  }
}
