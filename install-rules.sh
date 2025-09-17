#!/bin/bash

# Rules Installer - 輕鬆安裝開發規則到你的項目
# 使用方法: ./install-rules.sh [選項]

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 規則倉庫 URL
RULES_REPO="https://github.com/sylphxltd/rules.git"
RULES_DIR=".cursor/rules"

# 顯示幫助信息
show_help() {
    echo -e "${BLUE}Rules Installer - 輕鬆安裝開發規則${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./install-rules.sh [選項]"
    echo ""
    echo "選項:"
    echo "  --help, -h          顯示幫助信息"
    echo "  --all, -a           安裝所有規則"
    echo "  --interactive, -i   互動式選擇規則"
    echo "  --nextjs            安裝 Next.js 相關規則"
    echo "  --sveltekit         安裝 SvelteKit 相關規則"
    echo "  --react             安裝 React 相關規則"
    echo "  --flutter           安裝 Flutter 相關規則"
    echo "  --minimal           只安裝通用規則"
    echo "  --update            更新現有規則"
    echo ""
    echo "範例:"
    echo "  ./install-rules.sh --nextjs     # Next.js 項目"
    echo "  ./install-rules.sh --minimal    # 最小安裝"
    echo "  ./install-rules.sh --all        # 安裝所有"
    echo ""
}

# 檢查是否安裝了 git
check_dependencies() {
    if ! command -v git &> /dev/null; then
        echo -e "${RED}錯誤: 需要安裝 git${NC}"
        exit 1
    fi
}

# 創建規則目錄
create_rules_dir() {
    mkdir -p "$RULES_DIR"
    echo -e "${GREEN}✓ 創建規則目錄: $RULES_DIR${NC}"
}

# 下載規則文件
download_rules() {
    echo -e "${BLUE}正在下載規則文件...${NC}"

    if [ -d "$RULES_DIR/.git" ]; then
        cd "$RULES_DIR"
        git pull origin main --quiet
        echo -e "${GREEN}✓ 規則已更新${NC}"
    else
        git clone "$RULES_REPO" "$RULES_DIR" --quiet
        echo -e "${GREEN}✓ 規則已下載${NC}"
    fi
}

# 選擇性安裝規則
selective_install() {
    local selection="$1"

    case "$selection" in
        "nextjs")
            echo -e "${YELLOW}安裝 Next.js 規則...${NC}"
            keep_files=("README.md" "general.mdc" "typescript.mdc" "nextjs.mdc" "biome.mdc" "pandacss.mdc" "drizzle.mdc" "trpc.mdc" "zustand.mdc")
            ;;
        "sveltekit")
            echo -e "${YELLOW}安裝 SvelteKit 規則...${NC}"
            keep_files=("README.md" "general.mdc" "typescript.mdc" "sveltekit.mdc" "biome.mdc" "pandacss.mdc" "drizzle.mdc" "trpc.mdc")
            ;;
        "react")
            echo -e "${YELLOW}安裝 React 規則...${NC}"
            keep_files=("README.md" "general.mdc" "typescript.mdc" "react.mdc" "biome.mdc" "pandacss.mdc" "zustand.mdc")
            ;;
        "flutter")
            echo -e "${YELLOW}安裝 Flutter 規則...${NC}"
            keep_files=("README.md" "general.mdc" "flutter.mdc")
            ;;
        "minimal")
            echo -e "${YELLOW}安裝最小規則...${NC}"
            keep_files=("README.md" "general.mdc" "code-quality.mdc")
            ;;
        "all")
            echo -e "${YELLOW}安裝所有規則...${NC}"
            keep_files=("*")
            ;;
        *)
            echo -e "${RED}無效選項: $selection${NC}"
            show_help
            exit 1
            ;;
    esac

    # 如果不是安裝所有，則刪除不需要的文件
    if [ "$selection" != "all" ]; then
        cd "$RULES_DIR"
        for file in *.mdc *.md; do
            if [[ ! " ${keep_files[@]} " =~ " ${file} " ]]; then
                rm -f "$file"
            fi
        done
        echo -e "${GREEN}✓ 已清理不需要的規則文件${NC}"
    fi
}

# 互動式安裝
interactive_install() {
    echo -e "${BLUE}互動式規則安裝${NC}"
    echo ""

    # 項目類型選擇
    echo "選擇你的項目類型:"
    echo "1) Next.js"
    echo "2) SvelteKit"
    echo "3) React"
    echo "4) Flutter"
    echo "5) 其他/最小安裝"
    read -p "請輸入選擇 (1-5): " choice

    case "$choice" in
        1) selection="nextjs" ;;
        2) selection="sveltekit" ;;
        3) selection="react" ;;
        4) selection="flutter" ;;
        5) selection="minimal" ;;
        *) echo -e "${RED}無效選擇${NC}"; exit 1 ;;
    esac

    selective_install "$selection"
}

# 更新規則
update_rules() {
    if [ -d "$RULES_DIR/.git" ]; then
        cd "$RULES_DIR"
        git pull origin main --quiet
        echo -e "${GREEN}✓ 規則已更新${NC}"
    else
        echo -e "${YELLOW}規則目錄不存在，請先運行安裝命令${NC}"
        exit 1
    fi
}

# 主函數
main() {
    check_dependencies

    case "${1:-}" in
        --help|-h)
            show_help
            ;;
        --all|-a)
            create_rules_dir
            download_rules
            selective_install "all"
            ;;
        --interactive|-i)
            create_rules_dir
            download_rules
            interactive_install
            ;;
        --nextjs)
            create_rules_dir
            download_rules
            selective_install "nextjs"
            ;;
        --sveltekit)
            create_rules_dir
            download_rules
            selective_install "sveltekit"
            ;;
        --react)
            create_rules_dir
            download_rules
            selective_install "react"
            ;;
        --flutter)
            create_rules_dir
            download_rules
            selective_install "flutter"
            ;;
        --minimal)
            create_rules_dir
            download_rules
            selective_install "minimal"
            ;;
        --update)
            update_rules
            ;;
        "")
            echo -e "${YELLOW}請指定安裝選項，或使用 --help 查看幫助${NC}"
            echo ""
            show_help
            ;;
        *)
            echo -e "${RED}無效選項: $1${NC}"
            echo ""
            show_help
            ;;
    esac

    if [ "$1" != "--help" ] && [ "$1" != "-h" ] && [ "$1" != "--update" ]; then
        echo ""
        echo -e "${GREEN}🎉 規則安裝完成！${NC}"
        echo -e "${BLUE}規則文件位於: $RULES_DIR${NC}"
        echo -e "${YELLOW}提示: 查看 $RULES_DIR/README.md 了解如何使用這些規則${NC}"
    fi
}

# 運行主函數
main "$@"
