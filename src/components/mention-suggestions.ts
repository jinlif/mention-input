import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { suggestionsStyles } from '../styles/suggestions.styles.js';
import { getChildren, getCurrentLevelItems, searchAllLevels } from '../utils/nested-navigation.js';
import type { MentionItem } from '../types.js';
import type { SearchResult } from '../utils/nested-navigation.js';

interface MentionGroup {
  group: string;
  items: MentionItem[];
}

@customElement('mi-mention-suggestions')
export class MentionSuggestions extends LitElement {
  static override styles = suggestionsStyles;

  @property({ type: Array })
  items: MentionItem[] = [];

  @property({ type: String })
  query = '';

  @property({ type: Boolean, reflect: true })
  visible = false;

  @property({ type: Array })
  groupOrder: string[] = [];

  @property({ attribute: false })
  customFilter?: (query: string, items: MentionItem[]) => MentionItem[];

  @state()
  private _selectedIndex = 0;

  @state()
  private _navStack: MentionItem[] = [];

  private _flattened: MentionItem[] = [];
  private _cachedSearchResults: SearchResult<MentionItem>[] | null = null;
  private _suppressQueryReset = false;

  override updated(changed: Map<string, unknown>) {
    if (changed.has('visible') && !this.visible) {
      this._navStack = [];
      this._selectedIndex = 0;
      this._suppressQueryReset = false;
    }
    if (changed.has('query') || changed.has('items') || changed.has('visible')) {
      this._selectedIndex = 0;
    }
  }

  private get _isSearching(): boolean {
    return this.query.length > 0;
  }

  /** Whether the panel is navigating into children and query should not be recalculated. */
  get suppressQueryReset(): boolean {
    return this._suppressQueryReset;
  }

  private get _hasBack(): boolean {
    return this._navStack.length > 0;
  }

  private get _parentLabel(): string {
    if (this._navStack.length === 0) return '';
    return this._navStack[this._navStack.length - 1].label;
  }

  private _computeGrouped(): { groups: MentionGroup[]; flat: MentionItem[] } {
    const currentItems = getCurrentLevelItems(this.items, this._navStack);

    if (this._isSearching) {
      // Search mode: search across all levels from root
      const results = this._searchWithFilter();
      this._cachedSearchResults = results;
      const flat = results.map((r) => r.item);
      // Group search results by the last path segment's group or empty
      const groups = new Map<string, MentionItem[]>();
      for (const r of results) {
        const group = r.item.group || '';
        const list = groups.get(group) || [];
        list.push(r.item);
        groups.set(group, list);
      }
      return { groups: this._sortGroups(groups), flat };
    }

    // Browse mode: show current level
    this._cachedSearchResults = null;
    const groups = new Map<string, MentionItem[]>();
    for (const item of currentItems) {
      const group = item.group || '';
      const list = groups.get(group) || [];
      list.push(item);
      groups.set(group, list);
    }
    return { groups: this._sortGroups(groups), flat: currentItems };
  }

  private _searchWithFilter(): SearchResult<MentionItem>[] {
    if (this.customFilter) {
      // Build path map for all items, then use custom filter on flattened items
      const pathMap = this._buildPathMap(this.items, []);
      const allFlat = Array.from(pathMap.keys());
      const filtered = this.customFilter(this.query, allFlat);
      return filtered.map((item) => ({
        item,
        path: pathMap.get(item) ?? [item.label],
      }));
    }
    return searchAllLevels(
      this.items,
      this.query,
      (item) => item.label,
      (item) => getChildren(item),
    );
  }

  private _buildPathMap(items: MentionItem[], path: string[], map = new Map<MentionItem, string[]>()): Map<MentionItem, string[]> {
    for (const item of items) {
      const currentPath = [...path, item.label];
      map.set(item, currentPath);
      const children = getChildren(item);
      if (children) {
        this._buildPathMap(children, currentPath, map);
      }
    }
    return map;
  }

  private _sortGroups(groups: Map<string, MentionItem[]>): MentionGroup[] {
    const order = this.groupOrder;
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
      .map(([group, items]) => ({ group, items }));
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.visible) return false;
    const totalCount = this._flattened.length + (this._hasBack ? 1 : 0);
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
    const item = this._flattened[realIndex];
    if (!item) return;
    if (getChildren(item)) {
      this._pushLevel(item);
      if (this._isSearching) {
        this._suppressQueryReset = true;
        this.dispatchEvent(new CustomEvent('clear-query', { bubbles: true, composed: true }));
      }
    } else {
      this._dispatchSelect(item);
    }
  }

  private _dispatchSelect(item: MentionItem) {
    this.dispatchEvent(
      new CustomEvent('mentionselect', {
        detail: { item },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _pushLevel(item: MentionItem) {
    this._navStack = [...this._navStack, item];
    this._selectedIndex = 0;
  }

  private _popLevel() {
    this._navStack = this._navStack.slice(0, -1);
    this._selectedIndex = 0;
    if (this._navStack.length === 0) {
      this._suppressQueryReset = false;
    }
  }

  private _handleItemClick(item: MentionItem) {
    if (getChildren(item)) {
      this._pushLevel(item);
      if (this._isSearching) {
        this._suppressQueryReset = true;
        this.dispatchEvent(new CustomEvent('clear-query', { bubbles: true, composed: true }));
      }
    } else {
      this._dispatchSelect(item);
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

  private _renderItem(item: MentionItem, idx: number, path?: string[]) {
    const hasKids = !!getChildren(item);
    return html`
      <div
        class=${classMap({ item: true, selected: idx === this._selectedIndex })}
        @click=${() => this._handleItemClick(item)}
        @mouseenter=${() => this._handleItemHover(idx)}
      >
        ${item.icon ? html`<span class="item-icon">${item.icon}</span>` : ''}
        <div class="item-content">
          <div class="item-name">
            ${path && path.length > 1
              ? html`<span class="item-path">${path.slice(0, -1).join(' / ')} /</span> ${item.label}`
              : item.label}
          </div>
          ${item.description
            ? html`<div class="item-description">${item.description}</div>`
            : ''}
        </div>
        ${item.group && !hasKids
          ? html`<span class="item-badge">${item.group}</span>`
          : ''}
        ${hasKids ? html`<span class="item-chevron">›</span>` : ''}
      </div>
    `;
  }

  override render() {
    if (!this.visible) return html``;

    // Compute grouping and flat list
    const { groups, flat } = this._computeGrouped();
    this._flattened = flat;

    const totalCount = flat.length + (this._hasBack ? 1 : 0);
    if (totalCount === 0) {
      return html`<div class="empty">No matching items</div>`;
    }

    // Build search result path map from cached results
    let searchPaths: Map<MentionItem, string[]> | null = null;
    if (this._cachedSearchResults) {
      searchPaths = new Map();
      for (const r of this._cachedSearchResults) {
        searchPaths.set(r.item, r.path);
      }
    }

    let flatIndex = 0;
    const backIdx = this._hasBack ? flatIndex++ : -1;

    return html`
      ${this._hasBack ? this._renderBackItem(backIdx) : ''}
      ${groups.map(
        (group) => html`
          ${group.group
            ? html`<div class="group-label">${group.group}</div>`
            : ''}
          ${group.items.map((item) => {
            const idx = flatIndex++;
            const path = searchPaths?.get(item);
            return this._renderItem(item, idx, path);
          })}
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mi-mention-suggestions': MentionSuggestions;
  }
}
