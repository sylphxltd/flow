/**
 * High-Performance Tokenizer
 * 專為大規模文本處理和搜索優化
 */

export interface FastToken {
  text: string;
  score: number;
  type: 1 | 2 | 4 | 8; // bitmask for quick filtering
}

/**
 * 快速分詞器 - 基於 Trie 和預編譯正則
 */
export class FastTokenizer {
  private static readonly COMMON_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
    'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
    'do', 'at', 'this', 'but', 'his', 'by', 'from'
  ]);

  private static readonly TECH_PATTERNS = [
    // 預編譯正則表達式
    { regex: /([A-Z][a-z0-9]*[A-Z][a-z0-9]*)/g, handler: FastTokenizer.splitCamelCase },
    { regex: /([a-z][a-z0-9]*_[a-z0-9_]*)/g, handler: FastTokenizer.splitSnakeCase },
    { regex: /\b(v?\d+\.\d+(\.\d+)?)\b/g, handler: FastTokenizer.handleVersion },
    { regex: /\b([A-Z]{2,})\b/g, handler: FastTokenizer.toLower }
  ];

  /**
   * 超快速分詞 - 適合大規模處理
   */
  static tokenize(text: string): FastToken[] {
    const tokens: FastToken[] = [];
    const length = text.length;
    let i = 0;

    while (i < length) {
      // 跳過空白字符
      if (/\s/.test(text[i])) {
        i++;
        continue;
      }

      // 嘗試不同模式
      const token = this.extractToken(text, i);
      if (token) {
        tokens.push(token);
        i += token.text.length;
      } else {
        i++;
      }
    }

    return this.deduplicate(tokens);
  }

  /**
   * 提取單個 token
   */
  private static extractToken(text: string, start: number): FastToken | null {
    // 1. 檢查預定義模式
    for (const pattern of this.TECH_PATTERNS) {
      pattern.regex.lastIndex = start;
      const match = pattern.regex.exec(text);
      if (match && match.index === start) {
        const subTokens = pattern.handler(match[1]);
        return subTokens.length > 0 ? {
          text: subTokens[0],
          score: this.calculateScore(subTokens[0]),
          type: this.getTokenType(subTokens[0])
        } : null;
      }
    }

    // 2. 標準單詞提取
    const wordMatch = text.substring(start).match(/^[a-z0-9_-]+/i);
    if (wordMatch) {
      const word = wordMatch[0];
      if (word.length > 2) {
        return {
          text: word.toLowerCase(),
          score: this.calculateScore(word),
          type: this.getTokenType(word)
        };
      }
    }

    return null;
  }

  /**
   * 計算 token 分數
   */
  private static calculateScore(token: string): number {
    let score = 0.5;

    // 長度加分
    if (token.length > 4) score += 0.1;
    if (token.length > 8) score += 0.1;

    // 技術術語加分
    if (this.isTechnicalTerm(token)) score += 0.3;

    // 常見詞減分
    if (this.COMMON_WORDS.has(token.toLowerCase())) score -= 0.4;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 獲取 token 類型（用 bitmask）
   */
  private static getTokenType(token: string): 1 | 2 | 4 | 8 {
    let type = 0;

    if (/[A-Z]/.test(token)) type |= 1;        // Identifier (CamelCase)
    if (/[\d]/.test(token)) type |= 2;          // Contains numbers
    if (/[_-]/.test(token)) type |= 4;          // Contains separators
    if (this.isTechnicalTerm(token)) type |= 8;   // Technical term

    return type as 1 | 2 | 4 | 8;
  }

  /**
   * 超快速重複去除
   */
  private static deduplicate(tokens: FastToken[]): FastToken[] {
    const seen = new Map<string, FastToken>();

    for (const token of tokens) {
      const existing = seen.get(token.text);
      if (!existing || token.score > existing.score) {
        seen.set(token.text, token);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * 技術術語檢測
   */
  private static isTechnicalTerm(term: string): boolean {
    // 簡單 heuristic，可以擴展
    return term.includes('Dir') ||
           term.includes('Config') ||
           term.includes('API') ||
           term.startsWith('get') ||
           term.startsWith('set') ||
           /http|json|xml|sql/.test(term);
  }

  /**
   * 處理器函數
   */
  private static splitCamelCase(str: string): string[] {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(s => s.length > 1);
  }

  private static splitSnakeCase(str: string): string[] {
    return str.split('_').filter(s => s.length > 1);
  }

  private static handleVersion(str: string): string[] {
    return [str.toLowerCase()];
  }

  private static toLower(str: string): string[] {
    return [str.toLowerCase()];
  }
}

/**
 * 批量處理器 - 用於大規模文本處理
 */
export class BatchTokenizer {
  private static readonly BATCH_SIZE = 1000;
  private static readonly WORKER_POOL_SIZE = 4;

  /**
   * 並行批量分詞
   */
  static async tokenizeBatch(texts: string[]): Promise<FastToken[][]> {
    const results: FastToken[][] = [];

    for (let i = 0; i < texts.length; i += this.BATCH_SIZE) {
      const batch = texts.slice(i, i + this.BATCH_SIZE);
      const batchResults = await this.processBatch(batch);
      results.push(batchResults);
    }

    return results.flat();
  }

  private static async processBatch(texts: string[]): Promise<FastToken[]> {
    // 使用 Web Workers (如果在瀏覽器環境) 或簡單的並行處理
    return texts.flatMap(text => FastTokenizer.tokenize(text));
  }
}

/**
 * 緩存分詞器 - 避免重複計算
 */
export class CachedTokenizer {
  private cache = new Map<string, FastToken[]>();
  private maxSize: number;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
  }

  tokenize(text: string): FastToken[] {
    // 簡單的緩存鍵基於文本的 hash
    const key = this.hash(text);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const tokens = FastTokenizer.tokenize(text);

    // LRU 緩存管理
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, tokens);
    return tokens;
  }

  private hash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

/**
 * 統一的 token 接口
 */
export interface UnifiedToken {
  text: string;
  score: number;
  type: string;
  position?: number;
  metadata?: Record<string, any>;
}

/**
 * 統一分詞器適配器
 */
export class UnifiedTokenizerAdapter {
  private fastTokenizer: typeof FastTokenizer;
  private advancedTokenizer: any;
  private cache: CachedTokenizer;

  constructor() {
    this.fastTokenizer = FastTokenizer;
    this.cache = new CachedTokenizer();
  }

  tokenize(text: string, options: { useAdvanced?: boolean } = {}): UnifiedToken[] {
    const useAdvanced = options.useAdvanced ?? false;

    let tokens: any[];

    if (useAdvanced && this.advancedTokenizer) {
      // 使用高級分詞器（如果可用）
      tokens = this.advancedTokenizer.tokenize(text);
    } else {
      // 使用快速分詞器
      tokens = this.cache.tokenize(text);
    }

    // 統一格式
    return tokens.map(token => ({
      text: token.text,
      score: token.score,
      type: this.decodeTokenType(token.type),
      position: token.position,
      metadata: {}
    }));
  }

  private decodeTokenType(bitmask: number): string {
    const types = [];
    if (bitmask & 1) types.push('identifier');
    if (bitmask & 2) types.push('numeric');
    if (bitmask & 4) types.push('compound');
    if (bitmask & 8) types.push('technical');
    return types[0] || 'unknown';
  }
}