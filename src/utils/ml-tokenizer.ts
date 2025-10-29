/**
 * Machine Learning Enhanced Tokenizer
 * 使用統計模型和機器學習技術優化分詞質量
 */

export interface TokenFeatures {
  length: number;
  case: 'upper' | 'lower' | 'camel' | 'snake' | 'mixed';
  hasNumbers: boolean;
  hasSymbols: boolean;
  isStopWord: boolean;
  tfidf: number;
  frequency: number;
  position: number;
}

export interface MLToken {
  text: string;
  score: number;
  confidence: number;
  features: TokenFeatures;
  suggestions?: string[];
}

/**
 * 機器學習分詞器
 */
export class MLTokenizer {
  private vocabulary: Map<string, TokenFeatures>;
  private ngramModel: Map<string, number>;
  private contextModel: Map<string, string[]>;
  private stopWords: Set<string>;

  constructor() {
    this.vocabulary = new Map();
    this.ngramModel = new Map();
    this.contextModel = new Map();
    this.stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you'
    ]);

    this.initialize();
  }

  /**
   * 初始化模型
   */
  private async initialize(): Promise<void> {
    // 在實際應用中，這裡會從訓練好的模型加載
    this.loadPretrainedModels();
  }

  /**
   * 智能分詞
   */
  async tokenize(text: string): Promise<MLToken[]> {
    const rawTokens = this.extractRawTokens(text);
    const mlTokens: MLToken[] = [];

    for (const rawToken of rawTokens) {
      const features = this.extractFeatures(rawToken, text);
      const score = this.calculateMLScore(rawToken, features, text);
      const confidence = this.calculateConfidence(features, score);

      mlTokens.push({
        text: rawToken.text,
        score,
        confidence,
        features,
        suggestions: this.generateSuggestions(rawToken, features)
      });
    }

    return this.postProcessMLTokens(mlTokens);
  }

  /**
   * 提取原始 tokens
   */
  private extractRawTokens(text: string): Array<{ text: string; position: number }> {
    const tokens: Array<{ text: string; position: number }> = [];
    let position = 0;

    // 基本分詞（可以替換為更複雜的邏輯）
    text.replace(/[a-z0-9_-]+/gi, (match, term, offset) => {
      if (term.length > 2) {
        tokens.push({ text: term, position: position + offset });
      }
      return '';
    });

    // 識別複合詞
    const compoundTokens = this.detectCompoundTokens(text);
    tokens.push(...compoundTokens);

    return tokens;
  }

  /**
   * 提取特徵
   */
  private extractFeatures(token: { text: string; position: number }, context: string): TokenFeatures {
    const text = token.text;

    return {
      length: text.length,
      case: this.detectCase(text),
      hasNumbers: /\d/.test(text),
      hasSymbols: /[^a-z0-9]/i.test(text),
      isStopWord: this.stopWords.has(text.toLowerCase()),
      tfidf: this.calculateTFIDF(text),
      frequency: this.getWordFrequency(text),
      position: token.position / context.length
    };
  }

  /**
   * 機器學習評分
   */
  private calculateMLScore(token: { text: string; position: number }, features: TokenFeatures, context: string): number {
    let score = 0.5;

    // 基於特徵的權重
    score += this.weightByLength(features.length);
    score += this.weightByCase(features.case);
    score += this.weightByTechnicalNature(features.hasNumbers, features.hasSymbols);
    score += this.weightByFrequency(features.frequency);

    // 基於上下文的權重
    score += this.weightByContext(token, context);

    // 基於 n-gram 模型的權重
    score += this.weightByNGram(token, context);

    // 基於位置信息
    score += this.weightByPosition(features.position);

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 計算置信度
   */
  private calculateConfidence(features: TokenFeatures, score: number): number {
    let confidence = 0.5;

    // 長度適中的詞置信度更高
    if (features.length >= 4 && features.length <= 12) {
      confidence += 0.2;
    }

    // 技術術語置信度更高
    if (features.hasNumbers || features.hasSymbols) {
      confidence += 0.2;
    }

    // 常見詞置信度較低
    if (features.isStopWord) {
      confidence -= 0.3;
    }

    // 高分詞置信度高
    if (score > 0.8) {
      confidence += 0.2;
    }

    return Math.max(0.1, Math.min(1, confidence));
  }

  /**
   * 生成建議
   */
  private generateSuggestions(token: { text: string; position: number }, features: TokenFeatures): string[] {
    const suggestions: string[] = [];

    // 基於拼寫建議
    if (features.hasNumbers && !features.hasSymbols) {
      suggestions.push(token.text + '()');
    }

    // 基於常見模式
    if (token.text.startsWith('get') && !token.text.includes('()')) {
      suggestions.push(token.text + '()');
    }

    if (token.text.startsWith('is') && token.text.length === 2) {
      suggestions.push(token.text + 'Valid', token.text + 'Enabled');
    }

    // 基於上下文建議
    const contextualSuggestions = this.getContextualSuggestions(token);
    suggestions.push(...contextualSuggestions);

    return suggestions.slice(0, 3); // 最多3個建議
  }

  /**
   * 後處理 ML tokens
   */
  private postProcessMLTokens(tokens: MLToken[]): MLToken[] {
    return tokens
      // 移除重複
      .filter((token, index, arr) =>
        arr.findIndex(t => t.text.toLowerCase() === token.text.toLowerCase()) === index
      )
      // 按分數排序
      .sort((a, b) => b.score - a.score)
      // 應用權重
      .map(token => ({
        ...token,
        score: token.score * token.confidence
      }));
  }

  /**
   * 檢測複合詞
   */
  private detectCompoundTokens(text: string): Array<{ text: string; position: number }> {
    const compoundTokens: Array<{ text: string; position: number }> = [];

    // 識別常見技術模式
    const patterns = [
      /\b([A-Z][a-z]+)([A-Z][a-z]+)\b/g, // PascalCase
      /\b(get|set|is|has|can)([A-Z][a-z]+)\b/gi, // get + PascalCase
      /\b(http|https|ftp):\/\/([^\s]+)/g, // URLs
      /\b([a-z]+)\/([a-z]+)\b/g, // 路徑
      /\b([a-z]+)\.([a-z]+)\b/g // 文件擴展
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        compoundTokens.push({
          text: fullMatch.toLowerCase(),
          position: match.index
        });
      }
    });

    return compoundTokens;
  }

  /**
   * 權重函數
   */
  private weightByLength(length: number): number {
    if (length <= 3) return -0.1;
    if (length >= 12) return -0.1;
    return 0;
  }

  private weightByCase(caseType: string): number {
    switch (caseType) {
      case 'camel': return 0.2;
      case 'upper': return 0.3;
      case 'snake': return 0.2;
      default: return 0;
    }
  }

  private weightByTechnicalNature(hasNumbers: boolean, hasSymbols: boolean): number {
    let weight = 0;
    if (hasNumbers) weight += 0.2;
    if (hasSymbols) weight += 0.1;
    return weight;
  }

  private weightByFrequency(frequency: number): number {
    // 使用對數權重，稀有詞得分更高
    return Math.min(0.2, Math.log(1000 / Math.max(1, frequency)) / 10);
  }

  private weightByContext(token: { text: string; position: number }, context: string): number {
    // 簡單的上下文分析
    const before = context.substring(Math.max(0, token.position - 10), token.position);
    const after = context.substring(token.position + token.text.length,
                                     token.position + token.text.length + 10);

    let weight = 0;
    if (before.includes('function') || after.includes('function')) weight += 0.2;
    if (before.includes('class') || after.includes('class')) weight += 0.2;
    if (before.includes('import') || after.includes('from')) weight += 0.1;

    return weight;
  }

  private weightByNGram(token: { text: string; position: number }, context: string): number {
    const contextWords = context.toLowerCase().split(/\s+/);
    const tokenLower = token.text.toLowerCase();

    for (let i = 0; i < contextWords.length - 1; i++) {
      const bigram = `${contextWords[i]} ${contextWords[i + 1]}`;
      const score = this.ngramModel.get(bigram) || 0;

      if (bigram.includes(tokenLower)) {
        return Math.min(0.3, score / 10);
      }
    }

    return 0;
  }

  private weightByPosition(position: number): number {
    // 標題和結尾位置的詞可能更重要
    if (position < 0.1 || position > 0.9) return 0.1;
    return 0;
  }

  /**
   * 輔助方法
   */
  private detectCase(text: string): 'upper' | 'lower' | 'camel' | 'snake' | 'mixed' {
    if (text === text.toUpperCase()) return 'upper';
    if (text === text.toLowerCase()) return 'lower';
    if (text.includes('_')) return 'snake';
    if (/[A-Z]/.test(text) && /[a-z]/.test(text)) return 'camel';
    return 'mixed';
  }

  private calculateTFIDF(text: string): number {
    // 簡化的 TF-IDF 計算
    return 1 / (1 + this.getWordFrequency(text));
  }

  private getWordFrequency(text: string): number {
    // 在實際應用中，這會從預先計算的頻率表中獲取
    return Math.floor(Math.random() * 100); // 模擬數據
  }

  private getContextualSuggestions(token: { text: string; position: number }): string[] {
    // 基於上下文的智能建議
    const suggestions: string[] = [];

    if (token.text === 'get') {
      suggestions.push('getKnowledgeDir', 'getConfig', 'getData', 'getUsers');
    }

    if (token.text === 'set') {
      suggestions.push('setData', 'setConfig', 'setState', 'setValue');
    }

    return suggestions;
  }

  /**
   * 訓練方法（在實際應用中會使用真實數據）
   */
  async train(corpus: string[]): Promise<void> {
    console.log('Training ML tokenizer...');

    // 從語料庫中提取 n-gram 模式
    this.extractNGrams(corpus);

    // 建立詞彙表
    this.buildVocabulary(corpus);

    // 訓練上下文模型
    this.trainContextModel(corpus);

    console.log('Training completed!');
  }

  private extractNGrams(corpus: string[]): void {
    const bigrams = new Map<string, number>();

    corpus.forEach(text => {
      const words = text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
      }
    });

    this.ngramModel = bigrams;
  }

  private buildVocabulary(corpus: string[]): void {
    const wordFreq = new Map<string, number>();

    corpus.forEach(text => {
      const words = text.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      });
    });

    this.vocabulary = new Map();
    wordFreq.forEach((freq, word) => {
      const features = this.extractFeatures({ text: word, position: 0 }, word);
      this.vocabulary.set(word, features);
    });
  }

  private trainContextModel(corpus: string[]): void {
    const contextModel = new Map<string, string[]>();

    corpus.forEach(text => {
      const words = text.toLowerCase().split(/\s+/);
      words.forEach((word, index) => {
        const context = [
          words[index - 2] || '',
          words[index - 1] || '',
          words[index + 1] || '',
          words[index + 2] || ''
        ].filter(w => w.length > 0);

        if (context.length > 0) {
          contextModel.set(word, [...new Set([...( contextModel.get(word) || [], ...context)])]);
        }
      });
    });

    this.contextModel = contextModel;
  }

  private loadPretrainedModels(): void {
    // 在實際應用中，這裡會從文件或服務加載預訓練的模型
    console.log('Loading pretrained models...');
  }
}

/**
 * 適應學習分詞器
 */
export class AdaptiveTokenizer extends MLTokenizer {
  private userFeedback: Map<string, number[]> = new Map();

  /**
   * 從用戶反饒中學習
   */
  provideFeedback(token: string, relevant: boolean): void {
    if (!this.userFeedback.has(token)) {
      this.userFeedback.set(token, []);
    }

    const feedback = this.userFeedback.get(token)!;
    feedback.push(relevant ? 1 : 0);

    // 簡單的適應：調整詞的分數
    if (feedback.length >= 5) {
      const avgFeedback = feedback.reduce((a, b) => a + b, 0) / feedback.length;
      this.adjustTokenScore(token, avgFeedback);
    }
  }

  private adjustTokenScore(token: string, feedback: number): void {
    // 實現自適應調整邏輯
    console.log(`Adjusting score for "${token}" based on feedback: ${feedback}`);
  }
}