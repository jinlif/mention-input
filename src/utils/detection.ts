export interface CommandDetection {
  active: boolean;
  query: string;
}

export interface MentionDetection {
  active: boolean;
  query: string;
  startPos: number;
}

/**
 * Detect a `/command` at the end of the text.
 * Matches: start-of-line or whitespace, followed by `/`, then optional word chars or hyphens.
 */
export function detectCommand(text: string): CommandDetection {
  const match = text.match(/(^|\s)\/([^\s]*)$/);
  if (match) {
    return { active: true, query: match[2] };
  }
  return { active: false, query: '' };
}

/**
 * Detect an `@mention` before the cursor position.
 * Matches: start-of-line or whitespace, followed by `@`, then non-whitespace non-@ chars.
 */
export function detectMention(text: string, cursorPos: number): MentionDetection {
  const beforeCursor = text.substring(0, cursorPos);
  const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/);
  if (match) {
    const fullMatch = match[0];
    const queryPart = match[2] || '';
    const startPos = cursorPos - fullMatch.length;
    return { active: true, query: queryPart, startPos };
  }
  return { active: false, query: '', startPos: 0 };
}
