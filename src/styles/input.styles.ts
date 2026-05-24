import { css } from "lit";

export const inputStyles = css`
  :host {
    --mi-bg: #2d2d2d;
    --mi-border: #404040;
    --mi-border-focus: #007acc;
    --mi-text: #e0e0e0;
    --mi-text-muted: #858585;
    --mi-text-placeholder: #6a6a6a;
    --mi-caret-color: #e0e0e0;
    --mi-highlight-bg: rgba(0, 122, 204, 0.3);
    --mi-highlight-color: #268fdf;
    --mi-cmd-highlight-bg: rgba(69, 129, 105, 0.4);
    --mi-cmd-highlight-color: #25a651;
    --mi-panel-bg: #252526;
    --mi-panel-border: #3c3c3c;
    --mi-panel-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
    --mi-selected-bg: #2a2d2e;
    --mi-scrollbar-thumb: #555;
    --mi-scrollbar-thumb-hover: #777;
    --mi-font-size: 13px;
    --mi-font-family: inherit;
    --mi-line-height: 1.5;
    --mi-radius: 8px;
    --mi-padding: 10px 12px;

    display: block;
    position: relative;
    font-family: var(--mi-font-family);
    font-size: var(--mi-font-size);
    color: var(--mi-text);
  }

  .input-area {
    position: relative;
  }

  .input-wrapper {
    position: relative;
    border: 1px solid var(--mi-border);
    border-radius: var(--mi-radius);
    background: var(--mi-bg);
    transition: border-color 0.15s;
  }

  .input-wrapper:focus-within {
    border-color: var(--mi-border-focus);
  }

  .input-wrapper textarea,
  .input-wrapper .highlight-layer {
    display: block;
    width: 100%;
    font-family: var(--mi-font-family);
    font-size: var(--mi-font-size);
    font-weight: 400;
    letter-spacing: normal;
    word-spacing: normal;
    line-height: var(--mi-line-height);
    padding: var(--mi-padding);
    word-break: break-all;
    white-space: pre-wrap;
    box-sizing: border-box;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
  }

  .input-wrapper textarea {
    color: transparent;
    caret-color: var(--mi-caret-color);
    overflow-y: auto;
    position: relative;
    z-index: 1;
    scrollbar-width: thin;
    scrollbar-color: var(--mi-scrollbar-thumb) transparent;
    scrollbar-gutter: stable;
  }

  .input-wrapper textarea::-webkit-scrollbar {
    width: 6px;
  }

  .input-wrapper textarea::-webkit-scrollbar-track {
    background: transparent;
  }

  .input-wrapper textarea::-webkit-scrollbar-thumb {
    background-color: var(--mi-scrollbar-thumb);
    border-radius: 3px;
  }

  .input-wrapper textarea::-webkit-scrollbar-thumb:hover {
    background-color: var(--mi-scrollbar-thumb-hover);
  }

  .input-wrapper textarea::placeholder {
    color: var(--mi-text-placeholder);
  }

  .input-wrapper textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input-wrapper .highlight-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    pointer-events: none;
    overflow-y: auto;
    color: var(--mi-text, #e0e0e0);
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  .input-wrapper .highlight-layer::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }

  .input-wrapper .highlight-layer::-webkit-scrollbar-track {
    background: transparent;
  }

  .input-wrapper .highlight-layer::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 3px;
  }

  .input-wrapper .highlight-layer mark {
    border-radius: 2px;
    padding: 0;
  }

  .input-wrapper .highlight-layer mark.mention {
    background: var(--mi-highlight-bg, rgba(0, 122, 204, 0.3));
    color: var(--mi-highlight-color, #268fdf);
  }

  .input-wrapper .highlight-layer mark.command {
    background: var(--mi-cmd-highlight-bg, rgba(69, 129, 105, 0.4));
    color: var(--mi-cmd-highlight-color, #25a651);
  }
`;
