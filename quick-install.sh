#!/bin/bash

# Quick Rules Installer - 一鍵安裝規則到項目
# 使用方法: curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/quick-install.sh | bash

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
RULES_REPO="https://github.com/sylphxltd/rules.git"
RULES_DIR=".cursor/rules"

echo -e "${BLUE}🚀 Quick Rules Installer${NC}"
echo ""

# 創建目錄
mkdir -p "$RULES_DIR"

# 下載規則
echo -e "${YELLOW}正在下載規則...${NC}"
if command -v git &> /dev/null; then
    if [ -d "$RULES_DIR/.git" ]; then
        cd "$RULES_DIR"
        git pull origin main --quiet
    else
        git clone "$RULES_REPO" "$RULES_DIR" --quiet
    fi
    echo -e "${GREEN}✓ 規則已下載${NC}"
else
    echo -e "${YELLOW}未檢測到 git，使用 curl 下載...${NC}"
    mkdir -p "$RULES_DIR"
    curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/README.md -o "$RULES_DIR/README.md"
    echo -e "${GREEN}✓ 基本文檔已下載${NC}"
    echo -e "${YELLOW}提示: 安裝 git 以獲取完整規則集合${NC}"
fi

echo ""
echo -e "${GREEN}🎉 安裝完成！${NC}"
echo -e "${BLUE}規則位置: $RULES_DIR${NC}"
echo ""
echo -e "${YELLOW}使用方法:${NC}"
echo "  查看規則: cat $RULES_DIR/README.md"
echo "  編輯規則: cursor $RULES_DIR/"
echo ""
echo -e "${BLUE}更多安裝選項請訪問: https://github.com/sylphxltd/rules${NC}"
