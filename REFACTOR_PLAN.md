# Sylphx Flow 大重構計劃

## 🎯 目標
從現有混亂結構重構到清晰嘅Domain-Based Architecture，解决：
1. frameworks/ 名稱混亂問題
2. assets/ vs src/ 分佈問題
3. cross-cutting concerns (search/indexer) 問題
4. 缺乏清晰domain boundaries問題

## 📋 重構前現狀
```
src/
├── tools/
│   ├── codebase-tools.ts
│   ├── knowledge-tools.ts
│   ├── time-tools.ts
│   └── workspace-tools.ts (包含reasoning)
├── resources/knowledge-resources.ts
├── utils/knowledge-indexer.ts

assets/
├── agents/ (master-craftsman.md, prompt-engineer.md)
└── knowledge/ (static knowledge data)
```

## 🏗️ 重構後目標結構
```
src/
├── agents/                           # 🤖 AI Agent definitions
│   ├── core/master-craftsman.md
│   └── specialized/prompt-engineer.md

├── domains/                          # 🏗️ Business domains
│   ├── workspace/                    # 📋 Workspace management
│   │   ├── reasoning/               # Reasoning tools
│   │   │   ├── frameworks/          # Framework definitions
│   │   │   └── tools.ts             # reasoning_start/analyze/conclude
│   │   ├── tasks/                   # Task management
│   │   └── documents/               # File operations
│   ├── codebase/                    # 💻 Code analysis
│   │   └── tools.ts                 # Code search and analysis
│   ├── knowledge/                   # 📚 Knowledge management
│   │   ├── tools.ts                 # Knowledge operations
│   │   └── resources.ts             # Knowledge definitions
│   └── utilities/                   # ⚙️ General utilities
│       └── time/tools.ts            # Time/date operations

├── services/                        # 🔧 Shared services
│   ├── search/                      # 🔍 Unified search infrastructure
│   │   ├── semantic-search.ts       # Core semantic search
│   │   ├── indexer.ts               # Unified indexing
│   │   ├── embeddings-provider.ts   # Embedding generation
│   │   └── search-client.ts         # Search interface
│   ├── storage/                     # 💾 Data persistence
│   └── cache/                       # ⚡ Caching layer

├── infrastructure/                  # 🌐 External integrations
│   ├── mcp/                         # MCP server
│   └── external-apis/               # Third-party services

└── interfaces/                      # 🎛️ User interfaces
    ├── cli/                         # CLI commands
    ├── mcp-server.ts                # MCP server setup
    └── index.ts                     # Main entry point
```

## 🔄 遷移映射表

### Agents Migration:
- `assets/agents/` → `src/agents/`

### Tools Migration:
- `src/tools/workspace-tools.ts` → `src/domains/workspace/reasoning/tools.ts`
- `src/tools/codebase-tools.ts` → `src/domains/codebase/tools.ts`
- `src/tools/knowledge-tools.ts` → `src/domains/knowledge/tools.ts`
- `src/tools/time-tools.ts` → `src/domains/utilities/time/tools.ts`

### Services Extraction:
- `src/utils/knowledge-indexer.ts` → `src/services/search/indexer.ts`
- Search logic from `src/tools/knowledge-tools.ts` → `src/services/search/semantic-search.ts`
- Embedding logic → `src/services/search/embeddings-provider.ts`

### Resources:
- `src/resources/knowledge-resources.ts` → `src/domains/knowledge/resources.ts`
- `assets/knowledge/` → `src/domains/knowledge/data/`

### Infrastructure:
- MCP server logic → `src/infrastructure/mcp/`
- CLI commands → `src/interfaces/cli/`

## ⚠️ 風險控制
1. **備份現狀** - 建立backup branch
2. **逐步遷移** - 一個domain一個domain處理
3. **保持測試** - 每步都確保build成功
4. **Import追蹤** - 確保所有import paths正確更新
5. **功能驗證** - 每個tool遷移後測試功能

## ✅ 驗收標準
- [ ] 所有files遷移到正確位置
- [ ] 所有import paths正確
- [ ] Build成功無error
- [ ] 所有MCP tools正常運作
- [ ] Reasoning frameworks正常加載
- [ ] Documentation更新完成
- [ ] 舊directories清理乾淨