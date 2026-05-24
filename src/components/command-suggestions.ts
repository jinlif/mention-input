import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { suggestionsStyles } from '../styles/suggestions.styles.js';
import { getChildren, getCurrentLevelItems, searchAllLevels } from '../utils/nested-navigation.js';
import type { Command } from '../types.js';
import type { SearchResult } from '../utils/nested-navigation.js';

interface CommandGroup {
  category: string;
  commands: Command[];
}

@customElement('mi-command-suggestions')
export class CommandSuggestions extends LitElement {
  static override styles = suggestionsStyles;

  @property({ type: Array })
  commands: Command[] = [];

  @property({ type: String })
  query = '';

  @property({ type: Boolean, reflect: true })
  visible = false;

  @state()
  private _selectedIndex = 0;

  @state()
  private _navStack: Command[] = [];

  private _flattened: Command[] = [];
  private _cachedFiltered: { groups: CommandGroup[]; flat: Command[] } | null = null;
  private _cachedSearchResults: SearchResult<Command>[] | null = null;

  override updated(changed: Map<string, unknown>) {
    if (changed.has('visible') && !this.visible) {
      this._navStack = [];
      this._selectedIndex = 0;
    }
    if (changed.has('query') || changed.has('commands') || changed.has('visible')) {
      this._selectedIndex = 0;
    }
  }

  private get _isSearching(): boolean {
    return this.query.length > 0;
  }

  private get _hasBack(): boolean {
    return this._navStack.length > 0;
  }

  private get _parentLabel(): string {
    if (this._navStack.length === 0) return '';
    return this._navStack[this._navStack.length - 1].name;
  }

  private _computeFiltered(): { groups: CommandGroup[]; flat: Command[] } {
    const q = this.query.toLowerCase();
    const currentItems = getCurrentLevelItems(this.commands, this._navStack);

    if (this._isSearching) {
      // Search mode: search across all levels from root
      const results = searchAllLevels(
        this.commands,
        this.query,
        (cmd) => cmd.name,
        (cmd) => getChildren(cmd),
      );
      this._cachedSearchResults = results;
      return {
        flat: results.map((r) => r.item),
        groups: this._groupSearchResults(results),
      };
    }

    // Browse mode: show current level
    this._cachedSearchResults = null;
    const filtered = currentItems.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q)
    );

    const groups = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const list = groups.get(cmd.category) || [];
      list.push(cmd);
      groups.set(cmd.category, list);
    }

    return {
      flat: filtered,
      groups: Array.from(groups.entries()).map(([category, commands]) => ({
        category,
        commands,
      })),
    };
  }

  private _groupSearchResults(results: SearchResult<Command>[]): CommandGroup[] {
    const groups = new Map<string, Command[]>();
    for (const r of results) {
      const cat = r.item.category;
      const list = groups.get(cat) || [];
      list.push(r.item);
      groups.set(cat, list);
    }
    return Array.from(groups.entries()).map(([category, commands]) => ({
      category,
      commands,
    }));
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.visible) return false;
    const flat = this._cachedFiltered?.flat ?? [];
    const totalCount = flat.length + (this._hasBack ? 1 : 0);
    if (totalCount === 0) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._selectedIndex = (this._selectedIndex + 1) % totalCount;
        this._scrollSelectedIntoView();
        return true;
      case 'ArrowUp':
        e.preventDefault();
        this._selectedIndex = (this._selectedIndex - 1 + totalCount) % totalCount;
        this._scrollSelectedIntoView();
        return true;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        this._handleActivation();
        return true;
      case 'Escape':
        e.preventDefault();
        if (this._hasBack) {
          this._popLevel();
        } else {
          this._close();
        }
        return true;
      default:
        return false;
    }
  }

  private _scrollSelectedIntoView() {
    this.updateComplete.then(() => {
      const selected = this.shadowRoot?.querySelector('.item.selected');
      selected?.scrollIntoView({ block: 'nearest' });
    });
  }

  private _handleActivation() {
    if (this._hasBack && this._selectedIndex === 0) {
      this._popLevel();
      return;
    }
    const realIndex = this._hasBack ? this._selectedIndex - 1 : this._selectedIndex;
    const cmd = this._flattened[realIndex];
    if (!cmd) return;
    if (getChildren(cmd)) {
      this._pushLevel(cmd);
      if (this._isSearching) {
        this.dispatchEvent(new CustomEvent('clear-query', { bubbles: true, composed: true }));
      }
    } else {
      this._dispatchSelect(cmd);
    }
  }

  private _dispatchSelect(cmd: Command) {
    this.dispatchEvent(
      new CustomEvent('command-select', {
        detail: { command: cmd },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _pushLevel(item: Command) {
    this._navStack = [...this._navStack, item];
    this._selectedIndex = 0;
  }

  private _popLevel() {
    this._navStack = this._navStack.slice(0, -1);
    this._selectedIndex = 0;
  }

  private _handleItemClick(cmd: Command) {
    if (getChildren(cmd)) {
      this._pushLevel(cmd);
      if (this._isSearching) {
        this.dispatchEvent(new CustomEvent('clear-query', { bubbles: true, composed: true }));
      }
    } else {
      this._dispatchSelect(cmd);
    }
  }

  private _handleBackClick() {
    this._popLevel();
  }

  private _handleItemHover(index: number) {
    this._selectedIndex = index;
  }

  private _renderBackItem(idx: number) {
    return html`
      <div
        class=${classMap({ item: true, 'back-item': true, selected: idx === this._selectedIndex })}
        @click=${this._handleBackClick}
        @mouseenter=${() => this._handleItemHover(idx)}
      >
        <span class="item-icon">←</span>
        <div class="item-content">
          <div class="item-name">${this._isSearching ? 'Back to browsing' : `Back to ${this._parentLabel}`}</div>
        </div>
      </div>
    `;
  }

  private _renderItem(cmd: Command, idx: number, path?: string[]) {
    const hasKids = !!getChildren(cmd);
    return html`
      <div
        class=${classMap({ item: true, selected: idx === this._selectedIndex })}
        @click=${() => this._handleItemClick(cmd)}
        @mouseenter=${() => this._handleItemHover(idx)}
      >
        ${cmd.icon ? html`<span class="item-icon">${cmd.icon}</span>` : ''}
        <div class="item-content">
          <div class="item-name">
            ${path && path.length > 1
              ? html`<span class="item-path">${path.slice(0, -1).join(' / ')} /</span> ${cmd.name}`
              : html`/${cmd.name}`}
          </div>
          <div class="item-description">${cmd.description}</div>
        </div>
        ${hasKids ? html`<span class="item-chevron">›</span>` : ''}
      </div>
    `;
  }

  override render() {
    if (!this.visible) return html``;

    const { groups, flat } = this._computeFiltered();
    this._cachedFiltered = { groups, flat };
    this._flattened = flat;

    const totalCount = flat.length + (this._hasBack ? 1 : 0);
    if (totalCount === 0) {
      return html`<div class="empty">No matching commands</div>`;
    }

    let flatIndex = 0;
    const backIdx = this._hasBack ? flatIndex++ : -1;

    // Build search result path map from cached results
    let searchPaths: Map<Command, string[]> | null = null;
    if (this._cachedSearchResults) {
      searchPaths = new Map();
      for (const r of this._cachedSearchResults) {
        searchPaths.set(r.item, r.path);
      }
    }

    return html`
      ${this._hasBack ? this._renderBackItem(backIdx) : ''}
      ${groups.map(
        (group) => html`
          ${!this._isSearching
            ? html`<div class="group-label">${group.category}</div>`
            : ''}
          ${group.commands.map((cmd) => {
            const idx = flatIndex++;
            const path = searchPaths?.get(cmd);
            return this._renderItem(cmd, idx, path);
          })}
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mi-command-suggestions': CommandSuggestions;
  }
}
