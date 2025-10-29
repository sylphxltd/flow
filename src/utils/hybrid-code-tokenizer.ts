/**
 * Hybrid Code Tokenizer - 結合 StarCoder2 同 ProfessionalTokenizer
 * 最佳代碼理解 + 搜索優化
 */

import { AutoTokenizer } from '@huggingface/transformers';
import { ProfessionalTokenizer, Token, TokenType } from './professional-tokenizer.js';

export interface HybridToken extends Token {
  // 來自 StarCoder2 嘅資訊
  starcoderId: number;
  starcoderText: string;
  confidence: number; // StarCoder2 的置信度

  // 來自 ProfessionalTokenizer 嘅資訊
  searchScore: number; // 搜索優化分數
  technicalScore: number; // 技術術語分數

  // 融合結果
  finalScore: number; // 最終融合分數
  relevance: 'high' | 'medium' | 'low'; // 相關性級別
}

export interface HybridTokenizationResult {
  tokens: HybridToken[];
  metadata: {
    totalTokens: number;
    starcoderTokens: number;
    professionalTokens: number;
    processingTime: number;
    confidence: number;
  };
  starcoder: {
    tokenIds: number[];
    rawTokens: string[];
    vocabSize: number;
  };
  professional: {
    tokens: Token[];
    categories: Record<string, number>;
  };
}

/**
 * 混合代碼 Tokenizer - 結合 StarCoder2 同搜索優化
 */
export class HybridCodeTokenizer {
  private starcoderTokenizer: any;
  private professionalTokenizer: ProfessionalTokenizer;
  private initialized: boolean = false;

  constructor(private options: {
    starcoderModelPath?: string;
    professionalOptions?: any;
    enableCaching?: boolean;
  } = {}) {
    this.professionalTokenizer = new ProfessionalTokenizer({
      codeAware: true,
      extractTechnicalTerms: true,
      useNgrams: true,
      extractCompoundWords: true,
      useContextualScoring: true,
      ...options.professionalOptions
    });
  }

  /**
   * 初始化混合 tokenizer
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing Hybrid Code Tokenizer...');

    // 初始化 StarCoder2
    if (this.options.starcoderModelPath) {
      console.log('🤖 Loading StarCoder2 tokenizer...');
      this.starcoderTokenizer = await AutoTokenizer.from_pretrained(this.options.starcoderModelPath);
      console.log('✅ StarCoder2 loaded successfully');
    } else {
      console.log('⚠️  StarCoder2 path not provided, using ProfessionalTokenizer only');
    }

    this.initialized = true;
    console.log('🎉 Hybrid Code Tokenizer initialized successfully!');
  }

  /**
   * 主要 tokenization 方法
   */
  async tokenize(content: string): Promise<HybridTokenizationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    console.log('🔤 Starting hybrid tokenization...');

    // 並行處理兩種 tokenization
    const [starcoderResult, professionalResult] = await Promise.all([
      this.processWithStarCoder(content),
      this.processWithProfessional(content)
    ]);

    // 融合結果
    const hybridTokens = await this.mergeResults(starcoderResult, professionalResult);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Hybrid tokenization completed in ${processingTime}ms`);

    return {
      tokens: hybridTokens,
      metadata: {
        totalTokens: hybridTokens.length,
        starcoderTokens: starcoderResult.tokens.length,
        professionalTokens: professionalResult.length,
        processingTime,
        confidence: this.calculateOverallConfidence(hybridTokens)
      },
      starcoder: starcoderResult,
      professional: {
        tokens: professionalResult,
        categories: this.categorizeTokens(professionalResult)
      }
    };
  }

  /**
   * 使用 StarCoder2 處理
   */
  private async processWithStarCoder(content: string) {
    if (!this.starcoderTokenizer) {
      return { tokenIds: [], rawTokens: [], vocabSize: 0 };
    }

    try {
      const result = await this.starcoderTokenizer(content);
      const tokenIds = result.input_ids.tolist()[0];

      // 轉換為 tokens
      const rawTokens = await this.starcoderTokenizer.convert_ids_to_tokens(tokenIds);

      return {
        tokenIds,
        rawTokens,
        vocabSize: this.starcoderTokenizer.get_vocab().size
      };
    } catch (error) {
      console.warn('StarCoder2 processing failed:', error.message);
      return { tokenIds: [], rawTokens: [], vocabSize: 0 };
    }
  }

  /**
   * 使用 ProfessionalTokenizer 處理
   */
  private async processWithProfessional(content: string): Promise<Token[]> {
    return this.professionalTokenizer.tokenize(content);
  }

  /**
   * 融合兩種 tokenizer 的結果
   */
  private async mergeResults(
    starcoderResult: any,
    professionalTokens: Token[]
  ): Promise<HybridToken[]> {
    const hybridTokens: HybridToken[] = [];

    // 如果 StarCoder2 不可用，只使用我們的 tokenizer
    if (starcoderResult.tokenIds.length === 0) {
      return professionalTokens.map(token => ({
        ...token,
        starcoderId: -1,
        starcoderText: token.text,
        confidence: 0.7,
        searchScore: token.score,
        technicalScore: this.calculateTechnicalScore(token),
        finalScore: token.score,
        relevance: this.determineRelevance(token.score)
      }));
    }

    // 建立 StarCoder2 token 映射
    const starcoderMap = new Map<number, string>();
    starcoderResult.tokenIds.forEach((id: number, index: number) => {
      starcoderMap.set(id, starcoderResult.rawTokens[index]);
    });

    // 為每個 professional token 找到對應的 StarCoder2 token
    for (const professionalToken of professionalTokens) {
      const matchingStarCoderTokens = this.findMatchingStarCoderTokens(
        professionalToken.text,
        starcoderResult.rawTokens
      );

      if (matchingStarCoderTokens.length > 0) {
        // 找到匹配，創建混合 token
        for (const starToken of matchingStarCoderTokens) {
          const hybridToken: HybridToken = {
            ...professionalToken,
            starcoderId: starcoderResult.tokenIds[starcoderResult.rawTokens.indexOf(starToken)],
            starcoderText: starToken,
            confidence: this.calculateStarCoderConfidence(starToken),
            searchScore: professionalToken.score,
            technicalScore: this.calculateTechnicalScore(professionalToken),
            finalScore: this.calculateFinalScore(professionalToken, starToken),
            relevance: this.determineRelevance(professionalToken.score)
          };
          hybridTokens.push(hybridToken);
        }
      } else {
        // 無匹配，但保留專業 token
        const hybridToken: HybridToken = {
          ...professionalToken,
          starcoderId: -1,
          starcoderText: professionalToken.text,
          confidence: 0.6,
          searchScore: professionalToken.score,
          technicalScore: this.calculateTechnicalScore(professionalToken),
          finalScore: professionalToken.score * 0.9,
          relevance: this.determineRelevance(professionalToken.score * 0.9)
        };
        hybridTokens.push(hybridToken);
      }
    }

    // 去重並排序
    const uniqueTokens = this.deduplicateTokens(hybridTokens);
    return uniqueTokens.sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * 尋找匹配的 StarCoder2 tokens
   */
  private findMatchingStarCoderTokens(
    professionalText: string,
    starcoderTokens: string[]
  ): string[] {
    const matches: string[] = [];

    // 精確匹配
    if (starcoderTokens.includes(professionalText)) {
      matches.push(professionalText);
      return matches;
    }

    // 模糊匹配
    for (const starToken of starcoderTokens) {
      if (starToken.toLowerCase().includes(professionalText.toLowerCase()) ||
          professionalText.toLowerCase().includes(starToken.toLowerCase())) {
        matches.push(starToken);
      }
    }

    return matches;
  }

  /**
   * 計算技術分數
   */
  private calculateTechnicalScore(token: Token): number {
    let score = token.score;

    // 技術術語加權
    if (token.type === TokenType.TECHNICAL) score *= 1.5;
    if (token.type === TokenType.IDENTIFIER) score *= 1.3;
    if (token.type === TokenType.METHOD) score *= 1.4;
    if (token.type === TokenType.VERSION) score *= 1.2;
    if (token.type === TokenType.URL) score *= 1.2;

    // 特殊模式加權
    if (/^[A-Z]{2,}$/.test(token.text)) score *= 1.2; // 全大寫縮寫
    if (/^[a-z]+[A-Z]/.test(token.text)) score *= 1.1; // camelCase
    if (/^[a-z]+_[a-z]/.test(token.text)) score *= 1.1; // snake_case

    return Math.min(score, 1.0);
  }

  /**
   * 計算 StarCoder2 置信度
   */
  private calculateStarCoderConfidence(starToken: string): number {
    // StarCoder2 通常有高置信度，但可以根據 token 特徵調整
    if (starToken.startsWith('Ġ')) return 0.95; // 標準 token
    if (/^[a-zA-Z]+$/.test(starToken)) return 0.9; // 純字母
    if (/^\W+$/.test(starToken)) return 0.8; // 純符號
    return 0.85; // 默認
  }

  /**
   * 計算最終分數
   */
  private calculateFinalScore(professionalToken: Token, starToken: string): number {
    const starcoderWeight = 0.6; // StarCoder2 權重
    const professionalWeight = 0.4; // Professional tokenizer 權重

    const starcoderScore = this.calculateStarCoderConfidence(starToken);
    const professionalScore = professionalToken.score;

    // 加權平均
    const weightedScore = (starcoderScore * starcoderWeight) + (professionalScore * professionalWeight);

    // 額外加權因素
    let bonus = 0;
    if (professionalToken.type === TokenType.TECHNICAL) bonus += 0.1;
    if (professionalToken.type === TokenType.IDENTIFIER) bonus += 0.05;
    if (starToken.length > 6) bonus += 0.02; // 長 token 更可能有意義

    return Math.min(weightedScore + bonus, 1.0);
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
   * 計算整體置信度
   */
  private calculateOverallConfidence(tokens: HybridToken[]): number {
    if (tokens.length === 0) return 0;

    const totalConfidence = tokens.reduce((sum, token) => sum + token.confidence, 0);
    return totalConfidence / tokens.length;
  }

  /**
   * 分類 tokens
   */
  private categorizeTokens(tokens: Token[]): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const token of tokens) {
      const category = token.type;
      categories[category] = (categories[category] || 0) + 1;
    }

    return categories;
  }

  /**
   * 去重 tokens
   */
  private deduplicateTokens(tokens: HybridToken[]): HybridToken[] {
    const seen = new Set<string>();
    const unique: HybridToken[] = [];

    for (const token of tokens) {
      const key = `${token.starcoderText}-${token.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(token);
      }
    }

    return unique;
  }

  /**
   * 便利方法：只返回最高分數的 tokens
   */
  async getTopTokens(content: string, limit: number = 20): Promise<HybridToken[]> {
    const result = await this.tokenize(content);
    return result.tokens.slice(0, limit);
  }

  /**
   * 便利方法：只返回技術相關 tokens
   */
  async getTechnicalTokens(content: string): Promise<HybridToken[]> {
    const result = await this.tokenize(content);
    return result.tokens.filter(token =>
      token.type === TokenType.TECHNICAL ||
      token.type === TokenType.IDENTIFIER ||
      token.technicalScore > 0.7
    );
  }
}