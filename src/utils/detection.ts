export interface CommandDetection {
  active: boolean;
  query: string;
  startPos: number;
}

export interface MentionDetection {
  active: boolean;
  query: string;
  startPos: number;
}

/**
 * Detect a `/command` before the cursor position.
 * Matches: start-of-line or whitespace, followed by `/`, then optional non-whitespace chars.
 */
export function detectCommand(text: string, cursorPos: number): CommandDetection {
  const beforeCursor = text.substring(0, cursorPos);
  const match = beforeCursor.match(/(^|\s)\/([^\s]*)$/);
  if (match) {
    const fullMatch = match[0];
    const startPos = cursorPos - fullMatch.length;
    return { active: true, query: match[2], startPos };
  }
  return { active: false, query: '', startPos: 0 };
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
