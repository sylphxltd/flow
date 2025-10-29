/**
 * Direct StarCoder2 Tokenizer - 完全用 StarCoder2 取代現有方案
 * StarCoder2 咁勁，直接用佢就得
 */

import { AutoTokenizer } from '@huggingface/transformers';

export interface DirectStarCoder2Token {
  text: string;
  id: number;
  score: number; // 基於頻率和重要性的搜索分數
  confidence: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface DirectStarCoder2Result {
  tokens: DirectStarCoder2Token[];
  metadata: {
    totalTokens: number;
    vocabSize: number;
    processingTime: number;
    averageConfidence: number;
  };
  raw: {
    inputIds: number[];
    decodedText: string;
  };
}

/**
 * Direct StarCoder2 Tokenizer - 完全基於業界最強嘅代碼理解模型
 */
export class DirectStarCoder2Tokenizer {
  private tokenizer: any;
  private initialized: boolean = false;
  private modelPath: string;

  constructor(options: {
    modelPath?: string;
  } = {}) {
    this.modelPath = options.modelPath || './models/starcoder2';
  }

  /**
   * 初始化 StarCoder2 tokenizer
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing Direct StarCoder2 Tokenizer...');

    try {
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelPath);
      this.initialized = true;
      console.log('✅ Direct StarCoder2 Tokenizer initialized successfully!');
    } catch (error) {
      console.error('❌ Failed to initialize StarCoder2 tokenizer:', error);
      throw new Error(`StarCoder2 initialization failed: ${error.message}`);
    }
  }

  /**
   * 主要 tokenization 方法
   */
  async tokenize(content: string): Promise<DirectStarCoder2Result> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    console.log('🔤 Starting Direct StarCoder2 tokenization...');

    try {
      // 使用 StarCoder2 進行 tokenization
      const encoded = await this.tokenizer(content);
      const inputIds = encoded.input_ids.tolist()[0];

      // 解碼獲得原文
      const decodedText = await this.tokenizer.decode(inputIds);

      // 使用 decode 結果來創建有意義嘅 tokens
      const tokens = this.extractMeaningfulTokens(decodedText, inputIds, content);

      // 計算分數和相關性
      const scoredTokens = this.calculateScores(tokens, content);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Direct StarCoder2 tokenization completed in ${processingTime}ms`);

      return {
        tokens: scoredTokens,
        metadata: {
          totalTokens: scoredTokens.length,
          vocabSize: 49152, // StarCoder2 詞彙表大小
          processingTime,
          averageConfidence: this.calculateAverageConfidence(scoredTokens)
        },
        raw: {
          inputIds,
          decodedText
        }
      };

    } catch (error) {
      console.error('❌ StarCoder2 tokenization failed:', error);
      throw new Error(`Tokenization failed: ${error.message}`);
    }
  }

  /**
   * 從解碼文本中提取有意義嘅 tokens
   */
  private extractMeaningfulTokens(decodedText: string, inputIds: number[], originalContent: string): DirectStarCoder2Token[] {
    const tokens: DirectStarCoder2Token[] = [];

    // 方法1: 使用簡單的分詞，但保留技術術語
    const words = decodedText
      .replace(/[{}()\[\];,<\.>]/g, ' $& ') // 為符號周圍加空格
      .split(/\s+/)
      .filter(word => word.length > 0);

    // 為每個詞創建 token
    let idIndex = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // 為每個詞分配一個或多個 ID (簡化處理)
      const tokenId = idIndex < inputIds.length ? inputIds[idIndex] : inputIds[inputIds.length - 1];
      idIndex++;

      tokens.push({
        text: word,
        id: tokenId,
        score: 0.5, // 基礎分數
        confidence: 0.9,
        relevance: 'medium' as const
      });
    }

    // 方法2: 添加特殊識別嘅技術術語
    const technicalTerms = this.extractTechnicalTerms(decodedText);
    for (const term of technicalTerms) {
      const existingToken = tokens.find(t => t.text.toLowerCase() === term.toLowerCase());
      if (existingToken) {
        // 提升現有技術術語的分數
        existingToken.score = Math.min(existingToken.score + 0.3, 1.0);
        existingToken.confidence = Math.min(existingToken.confidence + 0.1, 1.0);
        existingToken.relevance = this.determineRelevance(existingToken.score);
      } else {
        // 添加新嘅技術術語 token
        const tokenId = idIndex < inputIds.length ? inputIds[idIndex] : inputIds[inputIds.length - 1];
        idIndex++;
        tokens.push({
          text: term,
          id: tokenId,
          score: 0.8,
          confidence: 0.95,
          relevance: 'high' as const
        });
      }
    }

    return tokens;
  }

  /**
   * 提取技術術語
   */
  private extractTechnicalTerms(text: string): string[] {
    const technicalTerms: string[] = [];

    // 常見技術術語模式
    const patterns = [
      // 全大寫縮寫
      /\b[A-Z]{2,}\b/g,
      // camelCase
      /\b[a-z]+[A-Z][a-zA-Z]*\b/g,
      // snake_case
      /\b[a-z]+_[a-z_]+\b/g,
      // 版本號
      /\bv?\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?\b/g,
      // 文件路徑
      /\b(?:\/|[a-zA-Z]:\\\\)[^\s<>:"|?*]*\b/g,
      // URL
      /https?:\/\/[^\s<>"]+/g,
      // 技術關鍵詞
      /\b(async|await|function|class|const|let|var|import|export|return|throw|try|catch|finally|interface|type|enum|Promise|Array|Object|String|Number|Boolean)\b/g
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        technicalTerms.push(...matches);
      }
    }

    // 去重
    return [...new Set(technicalTerms)];
  }

  /**
   * 計算分數
   */
  private calculateScores(tokens: DirectStarCoder2Token[], content: string): DirectStarCoder2Token[] {
    const scoredTokens: DirectStarCoder2Token[] = [];

    for (const token of tokens) {
      let score = token.score;

      // 1. 技術術語加權
      if (this.isTechnicalTerm(token.text)) score += 0.2;

      // 2. 長度加權
      if (token.text.length > 6) score += 0.1;
      if (token.text.length > 10) score += 0.1;

      // 3. 頻率加權
      const frequency = this.calculateTokenFrequency(token.text, content);
      if (frequency === 1) score += 0.2; // 獨特詞更重要
      else if (frequency >= 5) score -= 0.1; // 常見詞降低重要性

      // 4. 結構重要性加權
      if (this.isStructuralToken(token.text)) score += 0.15;

      scoredTokens.push({
        ...token,
        score: Math.min(score, 1.0),
        relevance: this.determineRelevance(score)
      });
    }

    // 按分數排序
    return scoredTokens.sort((a, b) => b.score - a.score);
  }

  /**
   * 判斷是否為技術術語
   */
  private isTechnicalTerm(token: string): boolean {
    return /^[A-Z]{2,}$/.test(token) || // 全大寫縮寫
           /^[a-z]+[A-Z]/.test(token) || // camelCase
           /^[a-z]+_[a-z_]+$/.test(token) || // snake_case
           /^v?\d+\.\d+\.\d+/.test(token) || // 版本號
           /^(async|await|function|class|const|let|var|import|export|return|throw|try|catch|finally|interface|type|enum)$/.test(token); // 關鍵字
  }

  /**
   * 判斷是否為結構 token
   */
  private isStructuralToken(token: string): boolean {
    return /^[\{\}\(\)\[\];,<\.>]$/.test(token);
  }

  /**
   * 計算 token 頻率
   */
  private calculateTokenFrequency(token: string, content: string): number {
    const regex = new RegExp(this.escapeRegExp(token), 'g');
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * 轉義正則表達式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 確定相關性級別
   */
  private determineRelevance(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * 計算平均置信度
   */
  private calculateAverageConfidence(tokens: DirectStarCoder2Token[]): number {
    if (tokens.length === 0) return 0;
    const totalConfidence = tokens.reduce((sum, token) => sum + token.confidence, 0);
    return totalConfidence / tokens.length;
  }

  /**
   * 便利方法：只返回高分數 tokens
   */
  async getTopTokens(content: string, limit: number = 20, minScore: number = 0.3): Promise<DirectStarCoder2Token[]> {
    const result = await this.tokenize(content);
    return result.tokens.filter(token => token.score >= minScore).slice(0, limit);
  }

  /**
   * 便利方法：只返回技術相關 tokens
   */
  async getTechnicalTokens(content: string): Promise<DirectStarCoder2Token[]> {
    const result = await this.tokenize(content);
    return result.tokens.filter(token =>
      this.isTechnicalTerm(token.text) ||
      token.relevance === 'high'
    );
  }

  /**
   * 解碼 token IDs 回文本
   */
  async decode(tokenIds: number[]): Promise<string> {
    if (!this.initialized) {
      throw new Error('Tokenizer not initialized. Call initialize() first.');
    }
    return await this.tokenizer.decode(tokenIds);
  }

  /**
   * 編碼文本為 token IDs
   */
  async encode(text: string): Promise<number[]> {
    if (!this.initialized) {
      throw new Error('Tokenizer not initialized. Call initialize() first.');
    }
    const result = await this.tokenizer(text);
    return result.input_ids.tolist()[0];
  }
}