#!/bin/bash

# 推送到新倉庫的腳本

set -e

# 顏色代碼
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 推送到新倉庫腳本${NC}"
echo ""

# 檢查參數
if [ $# -eq 0 ]; then
    echo -e "${RED}錯誤: 請提供新倉庫的 URL${NC}"
    echo ""
    echo -e "${YELLOW}使用方法:${NC}"
    echo "  $0 <new-repo-url>"
    echo ""
    echo -e "${YELLOW}例如:${NC}"
    echo "  $0 https://github.com/YOUR_USERNAME/rules.git"
    echo "  $0 git@github.com:YOUR_USERNAME/rules.git"
    exit 1
fi

NEW_REPO_URL="$1"

echo -e "${YELLOW}新倉庫 URL: $NEW_REPO_URL${NC}"
echo ""

# 添加新遠程倉庫
echo -e "${BLUE}📝 添加新遠程倉庫...${NC}"
git remote add new-origin "$NEW_REPO_URL" 2>/dev/null || git remote set-url new-origin "$NEW_REPO_URL"

# 推送主分支
echo -e "${BLUE}🚀 推送主分支到新倉庫...${NC}"
git push -u new-origin main

echo -e "${GREEN}✅ 成功推送到新倉庫!${NC}"
echo ""
echo -e "${BLUE}新倉庫: $NEW_REPO_URL${NC}"

# 設置新倉庫為默認
echo ""
echo -e "${YELLOW}是否要將新倉庫設置為默認遠程倉庫? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${BLUE}🔄 設置新倉庫為默認...${NC}"
    git remote remove origin 2>/dev/null || true
    git remote rename new-origin origin
    echo -e "${GREEN}✅ 已設置新倉庫為默認!${NC}"
fi

echo ""
echo -e "${BLUE}🎉 完成!${NC}"
