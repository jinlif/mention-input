import { css } from 'lit';

export const suggestionsStyles = css`
  :host {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    margin-bottom: 4px;
    max-height: 260px;
    overflow-y: auto;
    background: var(--mi-panel-bg, #252526);
    border: 1px solid var(--mi-panel-border, #3c3c3c);
    border-radius: var(--mi-radius, 8px);
    box-shadow: var(--mi-panel-shadow, 0 -4px 12px rgba(0, 0, 0, 0.3));
    z-index: 1000;
    font-family: var(--mi-font-family, inherit);
    font-size: var(--mi-font-size, 13px);
    scrollbar-width: thin;
    scrollbar-color: var(--mi-scrollbar-thumb, #555) transparent;
  }

  :host::-webkit-scrollbar {
    width: 6px;
  }

  :host::-webkit-scrollbar-track {
    background: transparent;
  }

  :host::-webkit-scrollbar-thumb {
    background: var(--mi-scrollbar-thumb, #555);
    border-radius: 3px;
  }

  :host::-webkit-scrollbar-thumb:hover {
    background: var(--mi-scrollbar-thumb-hover, #777);
  }

  :host([visible]) {
    display: block;
  }

  .group-label {
    padding: 6px 12px 2px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--mi-text-muted, #858585);
    letter-spacing: 0.5px;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.1s;
    color: var(--mi-text, #e0e0e0);
  }

  .item:hover,
  .item.selected {
    background: var(--mi-selected-bg, #2a2d2e);
  }

  .item-icon {
    flex-shrink: 0;
    width: 18px;
    text-align: center;
    color: var(--mi-text-muted, #858585);
  }

  .item-content {
    flex: 1;
    min-width: 0;
  }

  .item-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-description {
    font-size: 12px;
    color: var(--mi-text-muted, #858585);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-badge {
    flex-shrink: 0;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--mi-text-muted, #858585);
  }

  .empty {
    padding: 12px;
    text-align: center;
    color: var(--mi-text-muted, #858585);
  }

  .back-item {
    border-bottom: 1px solid var(--mi-panel-border, #3c3c3c);
    color: var(--mi-text-muted, #858585);
  }

  .back-item .item-icon {
    font-size: 12px;
  }

  .item-path {
    color: var(--mi-text-muted, #858585);
    font-size: 11px;
    font-weight: 400;
  }

  .item-chevron {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--mi-text-muted, #858585);
    margin-left: auto;
  }
`;
