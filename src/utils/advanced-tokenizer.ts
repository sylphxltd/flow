/**
 * Advanced Tokenizer for Code Search
 * 混合多種分詞策略，專為程式碼搜索優化
 */

import { PorterStemmer } from './text-processing.js';

export interface Token {
  text: string;
  type: 'identifier' | 'keyword' | 'string' | 'comment' | 'symbol' | 'ngram';
  position: number;
  confidence: number;
}

export interface TokenizerOptions {
  language?: 'en' | 'zh' | 'ja' | 'mixed';
  preserveCase?: boolean;
  extractCamelCase?: boolean;
  extractTechnicalTerms?: boolean;
  useNgrams?: boolean;
}

/**
 * 高級分詞器 - 混合策略
 */
export class AdvancedTokenizer {
  private options: TokenizerOptions;
  private technicalTerms: Set<string>;
  private codePatterns: RegExp[];

  constructor(options: TokenizerOptions = {}) {
    this.options = {
      language: 'en',
      preserveCase: false,
      extractCamelCase: true,
      extractTechnicalTerms: true,
      useNgrams: true,
      ...options
    };

    this.technicalTerms = new Set([
      // JavaScript/TypeScript
      'get', 'set', 'const', 'let', 'var', 'function', 'class', 'interface',
      'import', 'export', 'default', 'async', 'await', 'promise', 'callback',
      'react', 'vue', 'angular', 'component', 'hook', 'state', 'props',
      // 技術術語
      'api', 'http', 'https', 'json', 'xml', 'yaml', 'config', 'env',
      'database', 'query', 'index', 'cache', 'server', 'client',
      // 常見前綴/後綴
      'get', 'set', 'is', 'has', 'can', 'should', 'will', 'dir', 'file', 'path'
    ]);

    this.codePatterns = [
      // 駝峰命名識別
      /[A-Z][a-z0-9]*[A-Z][a-z0-9]*/, // camelCase
      // 蛇蛇命名識別
      /[a-z][a-z0-9]*_[a-z0-9_]*/,
      // 常見技術模式
      /\b[A-Z]{2,}\b/, // 縮寫 (HTTP, API, JSON)
      /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/, // PascalCase
      // 數字和版本
      /\bv?\d+\.\d+(\.\d+)?\b/, // 版本號
      /\b\d+[kmg]b?\b/i, // 文件大小
    ];
  }

  /**
   * 主要分詞方法
   */
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let position = 0;

    // 1. 預處理
    const cleaned = this.preprocess(text);

    // 2. 代碼感知分詞
    tokens.push(...this.extractCodeTokens(cleaned, position));

    // 3. 技術詞識別
    if (this.options.extractTechnicalTerms) {
      tokens.push(...this.extractTechnicalTokens(cleaned, position));
    }

    // 4. N-gram 模式識別
    if (this.options.useNgrams) {
      tokens.push(...this.extractNGrams(cleaned, position));
    }

    // 5. 標準詞彙分詞
    tokens.push(...this.extractStandardTokens(cleaned, position));

    // 6. 後處理和過濾
    return this.postProcess(tokens);
  }

  /**
   * 預處理文本
   */
  private preprocess(text: string): string {
    return text
      // 移除代碼塊但保留內容
      .replace(/```[\s\S]*?```/g, (match) => {
        const content = match.replace(/```\w*/, '').trim();
        return ` ${content} `;
      })
      // 移除 Markdown 但保留鏈接文本
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 移除格式化
      .replace(/[#*_`~]/g, ' ')
      // 保留特殊符號以技術意義
      .replace(/[{}[\]();]/g, ' $& ');
  }

  /**
   * 代碼感知分詞
   */
  private extractCodeTokens(text: string, startPos: number): Token[] {
    const tokens: Token[] = [];

    // 駝峰命名分割
    text.replace(/([A-Z][a-z0-9]*[A-Z][a-z0-9]*)/g, (match, term, offset) => {
      const subTokens = this.splitCamelCase(term);
      subTokens.forEach((subToken, i) => {
        tokens.push({
          text: subToken.toLowerCase(),
          type: 'identifier',
          position: startPos + offset + i,
          confidence: 0.9
        });
      });
      return '';
    });

    // 蛇蛇命名分割
    text.replace(/([a-z][a-z0-9]*_[a-z0-9_]*)/g, (match, term, offset) => {
      const subTokens = term.split('_').filter(t => t.length > 1);
      subTokens.forEach((subToken, i) => {
        tokens.push({
          text: subToken,
          type: 'identifier',
          position: startPos + offset + i,
          confidence: 0.9
        });
      });
      return '';
    });

    return tokens;
  }

  /**
   * 技術詞識別
   */
  private extractTechnicalTokens(text: string, startPos: number): Token[] {
    const tokens: Token[] = [];

    // 識別已知技術術語
    this.technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        tokens.push({
          text: match[0].toLowerCase(),
          type: 'keyword',
          position: startPos + match.index,
          confidence: 0.8
        });
      }
    });

    return tokens;
  }

  /**
   * N-gram 模式識別
   */
  private extractNGrams(text: string, startPos: number): Token[] {
    const tokens: Token[] = [];
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // 2-gram 和 3-gram
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join('');

        // 檢查是否為有意義的複合詞
        if (this.isMeaningfulNgram(ngram)) {
          const pos = text.toLowerCase().indexOf(ngram);
          tokens.push({
            text: ngram,
            type: 'ngram',
            position: startPos + pos,
            confidence: 0.7
          });
        }
      }
    }

    return tokens;
  }

  /**
   * 標準詞彙分詞
   */
  private extractStandardTokens(text: string, startPos: number): Token[] {
    const tokens: Token[] = [];

    // 基本單詞提取
    text.split(/[^a-z0-9_-]+/)
      .filter(token => token.length > 2)
      .forEach((token, index) => {
        let processed = token;

        // 應用詞幹提取（改進版）
        if (this.isTechnicalTerm(token)) {
          processed = this.applyTechnicalStemming(token);
        } else {
          processed = PorterStemmer.stem(token);
        }

        if (processed.length > 1) {
          tokens.push({
            text: processed,
            type: 'symbol',
            position: startPos + index,
            confidence: 0.6
          });
        }
      });

    return tokens;
  }

  /**
   * 後處理和過濾
   */
  private postProcess(tokens: Token[]): Token[] {
    return tokens
      // 移除重複
      .filter((token, index, arr) =>
        arr.findIndex(t => t.text === token.text) === index
      )
      // 按位置排序
      .sort((a, b) => a.position - b.position)
      // 增強技術詞的重要性
      .map(token => ({
        ...token,
        confidence: token.type === 'keyword' ?
          Math.min(token.confidence * 1.2, 1.0) :
          token.confidence
      }));
  }

  /**
   * 輔助方法
   */
  private splitCamelCase(str: string): string[] {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(s => s.length > 1);
  }

  private isTechnicalTerm(term: string): boolean {
    // 檢查是否為技術術語
    return this.technicalTerms.has(term.toLowerCase()) ||
           term.includes('Dir') ||
           term.startsWith('get') ||
           term.startsWith('set') ||
           term.startsWith('is');
  }

  private applyTechnicalStemming(term: string): string {
    // 技術術語特定詞幹處理
    if (term.endsWith('Dir')) return term.slice(0, -3);
    if (term.startsWith('get')) return term.slice(3);
    if (term.startsWith('set')) return term.slice(3);
    if (term.startsWith('is')) return term.slice(2);

    return PorterStemmer.stem(term);
  }

  private isMeaningfulNgram(ngram: string): boolean {
    // 避免無意義的組合
    const meaningless = [
      'the a', 'a the', 'is are', 'and or', 'in on', 'at to',
      'it is', 'this that', 'for with', 'by from'
    ];

    return !meaningless.includes(ngram.toLowerCase());
  }
}

/**
 * 便利工廠函數
 */
export function createAdvancedTokenizer(options?: TokenizerOptions): AdvancedTokenizer {
  return new AdvancedTokenizer(options);
}

/**
 * 針對不同內容類型的預設配置
 */
export const TOKENIZER_PRESETS = {
  // 程式碼文件
  code: {
    extractCamelCase: true,
    extractTechnicalTerms: true,
    useNgrams: false,
    preserveCase: true
  },

  // 文檔文件
  documentation: {
    extractCamelCase: false,
    extractTechnicalTerms: true,
    useNgrams: true,
    preserveCase: false
  },

  // 混合內容
  mixed: {
    extractCamelCase: true,
    extractTechnicalTerms: true,
    useNgrams: true,
    preserveCase: false
  }
} as const;