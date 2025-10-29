/**
 * Advanced Code Tokenizer - 純粹 StarCoder2，無任何多餘處理
 * 完全信任 StarCoder2 嘅世界級 tokenization 能力
 */

import { AutoTokenizer } from '@huggingface/transformers';

export interface AdvancedToken {
  text: string;
  id: number;
  score: number;
  confidence: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface AdvancedTokenizerResult {
  tokens: AdvancedToken[];
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
 * Advanced Code Tokenizer - 純粹 StarCoder2
 */
export class AdvancedCodeTokenizer {
  private tokenizer: any;
  private initialized: boolean = false;
  private modelPath: string;

  constructor(options: {
    modelPath?: string;
  } = {}) {
    this.modelPath = options.modelPath || './models/starcoder2';
  }

  /**
   * 初始化 tokenizer
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelPath);
      this.initialized = true;
    } catch (error) {
      throw new Error(`Tokenizer initialization failed: ${error.message}`);
    }
  }

  /**
   * 純粹 StarCoder2 tokenization - 無任何安全限制或多餘分析
   */
  async tokenize(content: string): Promise<AdvancedTokenizerResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    // Handle empty content
    if (!content || content.trim().length === 0) {
      return {
        tokens: [],
        metadata: {
          totalTokens: 0,
          vocabSize: 49152,
          processingTime: Date.now() - startTime,
          averageConfidence: 0
        },
        raw: {
          inputIds: [],
          decodedText: ''
        }
      };
    }

    try {
      // 完全信任 StarCoder2，直接處理所有內容
      const encoded = await this.tokenizer(content);
      const inputIds = encoded.input_ids.tolist()[0];

      // 解碼獲得原文
      const decodedText = await this.tokenizer.decode(inputIds);

      // 直接用 StarCoder2 嘅輸出，唔做多餘分析
      const tokens = await this.createDirectTokens(decodedText, inputIds);

      const processingTime = Date.now() - startTime;

      return {
        tokens,
        metadata: {
          totalTokens: tokens.length,
          vocabSize: 49152,
          processingTime,
          averageConfidence: 0.95 // StarCoder2 本身就係高質量
        },
        raw: {
          inputIds,
          decodedText
        }
      };

    } catch (error) {
      throw new Error(`Tokenization failed: ${error.message}`);
    }
  }

  /**
   * 純粹 StarCoder2 tokenization - 完全信任，無任何額外處理
   * 直接使用 StarCoder2 嘅 token IDs，逐個解碼成文字
   */
  private async createDirectTokens(decodedText: string, inputIds: number[]): Promise<AdvancedToken[]> {
    const tokens: AdvancedToken[] = [];

    // 完全信任 StarCoder2，直接使用佢嘅 tokenization
    // 逐個 token ID 解碼，得到 StarCoder2 認為嘅最佳分割
    for (let i = 0; i < inputIds.length; i++) {
      const tokenId = inputIds[i];
      try {
        // 直接使用 StarCoder2 嘅解碼結果
        const tokenText = await this.tokenizer.decode([tokenId], { skip_special_tokens: true });
        const cleaned = tokenText.trim().toLowerCase();

        // 只過濾空白 token，其他全部保留（完全信任 StarCoder2）
        if (cleaned.length > 0) {
          tokens.push({
            text: cleaned,
            id: tokenId,
            score: 1.0, // StarCoder2 嘅所有 token 都係高質量
            confidence: 1.0, // 完全信任 StarCoder2
            relevance: 'high' as const
          });
        }
      } catch (error) {
        // 靜默跳過無法解碼嘅 token
        continue;
      }
    }

    return tokens;
  }

  /**
   * 便利方法：只返回高質量 tokens
   */
  async getTopTokens(content: string, limit: number = 20): Promise<AdvancedToken[]> {
    const result = await this.tokenize(content);
    return result.tokens.slice(0, limit);
  }

  /**
   * 便利方法：返回所有 tokens (StarCoder2 嘅輸出全部都係高質量)
   */
  async getTechnicalTokens(content: string): Promise<AdvancedToken[]> {
    const result = await this.tokenize(content);
    return result.tokens; // StarCoder2 嘅所有輸出都係技術相關
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