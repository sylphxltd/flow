/**
 * Ultimate Code Tokenizer - 真正實用嘅 StarCoder2 + 搜索優化整合
 * 結合 StarCoder2 嘅強大代碼理解能力同實際搜索需求
 */

import { AutoTokenizer } from '@huggingface/transformers';
import { ProfessionalTokenizer } from './professional-tokenizer.js';

export interface UltimateToken {
  text: string;
  starcoderId?: number;
  starcoderScore: number; // StarCoder2 置信度
  professionalScore: number; // 原有分數
  finalScore: number; // 最終分數
  confidence: number;
  relevance: 'high' | 'medium' | 'low';
  source: 'starcoder' | 'professional' | 'both';
}

export interface UltimateResult {
  tokens: UltimateToken[];
  metadata: {
    totalTokens: number;
    starcoderTokens: number;
    professionalTokens: number;
    processingTime: number;
    averageScore: number;
  };
  starcoder: {
    available: boolean;
    decodedText: string;
    tokenCount: number;
  };
}

/**
 * Ultimate Code Tokenizer - 真正實用嘅整合方案
 */
export class UltimateCodeTokenizer {
  private starcoderTokenizer: any;
  private professionalTokenizer: ProfessionalTokenizer;
  private initialized: boolean = false;
  private options: {
    starcoderModelPath: string;
    starcoderWeight: number;
    professionalWeight: number;
    enableStarcoder: boolean;
  };

  constructor(options: {
    starcoderModelPath?: string;
    starcoderWeight?: number;
    professionalWeight?: number;
    enableStarcoder?: boolean;
  } = {}) {
    this.options = {
      starcoderModelPath: options.starcoderModelPath || './models/starcoder2',
      starcoderWeight: options.starcoderWeight || 0.7,
      professionalWeight: options.professionalWeight || 0.3,
      enableStarcoder: options.enableStarcoder !== false
    };

    this.professionalTokenizer = new ProfessionalTokenizer({
      codeAware: true,
      extractTechnicalTerms: true,
      useNgrams: true,
      extractCompoundWords: true,
      useContextualScoring: true,
    });
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing Ultimate Code Tokenizer...');

    // 初始化 StarCoder2 (如果啟用)
    if (this.options.enableStarcoder) {
      try {
        console.log('🤖 Loading StarCoder2 tokenizer...');
        this.starcoderTokenizer = await AutoTokenizer.from_pretrained(this.options.starcoderModelPath);
        console.log('✅ StarCoder2 loaded successfully');
      } catch (error) {
        console.warn('⚠️  StarCoder2 loading failed, using ProfessionalTokenizer only:', error.message);
        this.options.enableStarcoder = false;
      }
    }

    this.initialized = true;
    console.log('🎉 Ultimate Code Tokenizer initialized successfully!');
  }

  /**
   * 主要 tokenization 方法
   */
  async tokenize(content: string): Promise<UltimateResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    console.log('🔤 Starting ultimate tokenization...');

    let starcoderResult: any = null;
    let professionalTokens = [];

    // 並行處理
    const promises = [
      this.processWithProfessional(content)
    ];

    if (this.options.enableStarcoder) {
      promises.push(this.processWithStarCoder(content));
    }

    const [professional, starcoder] = await Promise.all(promises);
    professionalTokens = professional;
    starcoderResult = starcoder;

    // 融合結果
    const ultimateTokens = this.mergeResults(professionalTokens, starcoderResult, content);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Ultimate tokenization completed in ${processingTime}ms`);

    return {
      tokens: ultimateTokens,
      metadata: {
        totalTokens: ultimateTokens.length,
        starcoderTokens: starcoderResult ? starcoderResult.tokenCount : 0,
        professionalTokens: professionalTokens.length,
        processingTime,
        averageScore: this.calculateAverageScore(ultimateTokens)
      },
      starcoder: {
        available: this.options.enableStarcoder && starcoderResult !== null,
        decodedText: starcoderResult?.decodedText || '',
        tokenCount: starcoderResult?.tokenCount || 0
      }
    };
  }

  /**
   * 使用 ProfessionalTokenizer 處理
   */
  private async processWithProfessional(content: string) {
    return this.professionalTokenizer.tokenize(content);
  }

  /**
   * 使用 StarCoder2 處理
   */
  private async processWithStarCoder(content: string) {
    if (!this.starcoderTokenizer) return null;

    try {
      const encoded = await this.starcoderTokenizer(content);
      const inputIds = encoded.input_ids.tolist()[0];
      const decodedText = await this.starcoderTokenizer.decode(inputIds);

      return {
        inputIds,
        decodedText,
        tokenCount: inputIds.length
      };
    } catch (error) {
      console.warn('StarCoder2 processing failed:', error.message);
      return null;
    }
  }

  /**
   * 融合兩種 tokenizer 的結果
   */
  private mergeResults(
    professionalTokens: any[],
    starcoderResult: any,
    originalContent: string
  ): UltimateToken[] {
    const ultimateTokens: UltimateToken[] = [];

    // 1. 首先處理 ProfessionalTokenizer 的結果
    for (const profToken of professionalTokens) {
      const ultimateToken: UltimateToken = {
        text: profToken.text,
        professionalScore: profToken.score,
        starcoderScore: this.options.enableStarcoder ? 0.8 : 0, // 默認高置信度
        finalScore: profToken.score * this.options.professionalWeight,
        confidence: profToken.score,
        relevance: this.determineRelevance(profToken.score),
        source: 'professional'
      };

      // 如果有 StarCoder2，嘗試找到對應
      if (starcoderResult && starcoderResult.decodedText) {
        const matchScore = this.calculateMatchScore(profToken.text, starcoderResult.decodedText);
        ultimateToken.starcoderScore = matchScore;
        ultimateToken.finalScore = (
          profToken.score * this.options.professionalWeight +
          matchScore * this.options.starcoderWeight
        );
        ultimateToken.source = matchScore > 0.5 ? 'both' : 'professional';
      }

      ultimateTokens.push(ultimateToken);
    }

    // 2. 如果啟用 StarCoder2，添加獨特嘅 tokens
    if (starcoderResult && this.options.enableStarcoder) {
      const uniqueStarTokens = this.extractUniqueTokens(starcoderResult, professionalTokens);
      for (const starToken of uniqueStarTokens) {
        const ultimateToken: UltimateToken = {
          text: starToken.text,
          professionalScore: 0.3, // 給個基礎分數
          starcoderScore: 0.9,
          finalScore: 0.9 * this.options.starcoderWeight + 0.3 * this.options.professionalWeight,
          confidence: 0.8,
          relevance: 'medium',
          source: 'starcoder'
        };
        ultimateTokens.push(ultimateToken);
      }
    }

    // 3. 去重、排序、過濾
    const uniqueTokens = this.deduplicateTokens(ultimateTokens);
    const filteredTokens = uniqueTokens.filter(token => token.finalScore > 0.2);
    const sortedTokens = filteredTokens.sort((a, b) => b.finalScore - a.finalScore);

    return sortedTokens;
  }

  /**
   * 計算匹配分數
   */
  private calculateMatchScore(profTokenText: string, decodedText: string): number {
    const lowerProfToken = profTokenText.toLowerCase();
    const lowerDecoded = decodedText.toLowerCase();

    // 精確匹配
    if (lowerDecoded.includes(lowerProfToken)) return 1.0;

    // 部分匹配
    const profWords = lowerProfToken.split(/\s+/);
    let matchCount = 0;
    for (const word of profWords) {
      if (lowerDecoded.includes(word)) matchCount++;
    }

    if (matchCount > 0) {
      return matchCount / profWords.length;
    }

    // 字符級別匹配
    let charMatches = 0;
    for (const char of lowerProfToken) {
      if (lowerDecoded.includes(char)) charMatches++;
    }

    return charMatches / lowerProfToken.length * 0.3;
  }

  /**
   * 提取 StarCoder2 獨特嘅 tokens
   */
  private extractUniqueTokens(starcoderResult: any, professionalTokens: any[]): { text: string; id: number }[] {
    const profTokenTexts = new Set(professionalTokens.map(t => t.text.toLowerCase()));
    const uniqueTokens: { text: string; id: number }[] = [];

    // 從解碼文本中提取詞彙
    const words = starcoderResult.decodedText
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !profTokenTexts.has(word));

    // 為每個獨特詞彙創建 token
    words.forEach((word, index) => {
      uniqueTokens.push({
        text: word,
        id: starcoderResult.inputIds[index] || index
      });
    });

    return uniqueTokens;
  }

  /**
   * 去重 tokens
   */
  private deduplicateTokens(tokens: UltimateToken[]): UltimateToken[] {
    const seen = new Set<string>();
    const unique: UltimateToken[] = [];

    for (const token of tokens) {
      const key = token.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(token);
      } else {
        // 如果已存在，保留分數更高嘅版本
        const existingIndex = unique.findIndex(t => t.text.toLowerCase() === key);
        if (existingIndex >= 0 && token.finalScore > unique[existingIndex].finalScore) {
          unique[existingIndex] = token;
        }
      }
    }

    return unique;
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
   * 計算平均分數
   */
  private calculateAverageScore(tokens: UltimateToken[]): number {
    if (tokens.length === 0) return 0;
    const totalScore = tokens.reduce((sum, token) => sum + token.finalScore, 0);
    return totalScore / tokens.length;
  }

  /**
   * 便利方法：獲取最高分數的 tokens
   */
  async getTopTokens(content: string, limit: number = 20): Promise<UltimateToken[]> {
    const result = await this.tokenize(content);
    return result.tokens.slice(0, limit);
  }

  /**
   * 便利方法：獲取技術相關 tokens
   */
  async getTechnicalTokens(content: string): Promise<UltimateToken[]> {
    const result = await this.tokenize(content);
    return result.tokens.filter(token =>
      token.finalScore > 0.6 &&
      (token.text.match(/^[A-Z_]+$/) || // 技術術語
       token.text.match(/^[a-z]+[A-Z]/) || // camelCase
       token.text.length > 6) // 長詞彙
    );
  }

  /**
   * 便利方法：搜索特定內容
   */
  async searchTokens(content: string, pattern: RegExp): Promise<UltimateToken[]> {
    const result = await this.tokenize(content);
    return result.tokens.filter(token => pattern.test(token.text));
  }
}