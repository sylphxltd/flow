#!/bin/bash

# Rules Installer - Easy installation of development rules to your project
# Usage: ./install-rules.sh [options]

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Rules repository URL
RULES_REPO="https://github.com/sylphxltd/rules.git"
RULES_DIR=".cursor/rules"

# Show help information
show_help() {
    echo -e "${BLUE}Rules Installer - Easy installation of development rules${NC}"
    echo ""
    echo "Usage:"
    echo "  ./install-rules.sh [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h          Show help information"
    echo "  --all, -a           Install all rules"
    echo "  --interactive, -i   Interactive rule selection"
    echo "  --nextjs            Install Next.js related rules"
    echo "  --sveltekit         Install SvelteKit related rules"
    echo "  --react             Install React related rules"
    echo "  --flutter           Install Flutter related rules"
    echo "  --minimal           Install only universal rules"
    echo "  --update            Update existing rules"
    echo ""
    echo "Examples:"
    echo "  ./install-rules.sh --nextjs     # Next.js project"
    echo "  ./install-rules.sh --minimal    # Minimal installation"
    echo "  ./install-rules.sh --all        # Install all"
    echo ""
}

# Check if git is installed
check_dependencies() {
    if ! command -v git &> /dev/null; then
        echo -e "${RED}Error: Git is required${NC}"
        exit 1
    fi
}

# Create rules directory
create_rules_dir() {
    mkdir -p "$RULES_DIR"
    echo -e "${GREEN}✓ Created rules directory: $RULES_DIR${NC}"
}

# Download rules files
download_rules() {
    echo -e "${BLUE}Downloading rules files...${NC}"

    if [ -d "$RULES_DIR/.git" ]; then
        cd "$RULES_DIR"
        git pull origin main --quiet
        echo -e "${GREEN}✓ Rules updated${NC}"
    else
        git clone "$RULES_REPO" "$RULES_DIR" --quiet
        echo -e "${GREEN}✓ Rules downloaded${NC}"
    fi
}

# Selective installation of rules
selective_install() {
    local selection="$1"

    case "$selection" in
        "nextjs")
            echo -e "${YELLOW}Installing Next.js rules...${NC}"
            keep_files=("docs/rules/README.md" "docs/rules/general.mdc" "docs/rules/typescript.mdc" "docs/rules/nextjs.mdc" "docs/rules/biome.mdc" "docs/rules/pandacss.mdc" "docs/rules/drizzle.mdc" "docs/rules/trpc.mdc" "docs/rules/zustand.mdc" "docs/rules/id-generation.mdc")
            ;;
        "sveltekit")
            echo -e "${YELLOW}Installing SvelteKit rules...${NC}"
            keep_files=("docs/rules/README.md" "docs/rules/general.mdc" "docs/rules/typescript.mdc" "docs/rules/sveltekit.mdc" "docs/rules/biome.mdc" "docs/rules/pandacss.mdc" "docs/rules/drizzle.mdc" "docs/rules/trpc.mdc" "docs/rules/id-generation.mdc")
            ;;
        "react")
            echo -e "${YELLOW}Installing React rules...${NC}"
            keep_files=("docs/rules/README.md" "docs/rules/general.mdc" "docs/rules/typescript.mdc" "docs/rules/react.mdc" "docs/rules/biome.mdc" "docs/rules/pandacss.mdc" "docs/rules/zustand.mdc")
            ;;
        "flutter")
            echo -e "${YELLOW}Installing Flutter rules...${NC}"
            keep_files=("docs/rules/README.md" "docs/rules/general.mdc" "docs/rules/flutter.mdc")
            ;;
        "minimal")
            echo -e "${YELLOW}Installing minimal rules...${NC}"
            keep_files=("docs/rules/README.md" "docs/rules/general.mdc")
            ;;
        "all")
            echo -e "${YELLOW}Installing all rules...${NC}"
            keep_files=("docs/rules/*")
            ;;
        *)
            echo -e "${RED}Invalid option: $selection${NC}"
            show_help
            exit 1
            ;;
    esac

    # If not installing all, remove unnecessary files
    if [ "$selection" != "all" ]; then
        cd "$RULES_DIR"
        for file in *.mdc *.md; do
            if [[ ! " ${keep_files[@]} " =~ " ${file} " ]]; then
                rm -f "$file"
            fi
        done
        echo -e "${GREEN}✓ Cleaned up unnecessary rule files${NC}"
    fi
}

# Interactive installation
interactive_install() {
    echo -e "${BLUE}Interactive Rules Installation${NC}"
    echo ""

    # Project type selection
    echo "Choose your project type:"
    echo "1) Next.js"
    echo "2) SvelteKit"
    echo "3) React"
    echo "4) Flutter"
    echo "5) Other/Minimal installation"
    read -p "Enter your choice (1-5): " choice

    case "$choice" in
        1) selection="nextjs" ;;
        2) selection="sveltekit" ;;
        3) selection="react" ;;
        4) selection="flutter" ;;
        5) selection="minimal" ;;
        *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
    esac

    selective_install "$selection"
}

# Update rules
update_rules() {
    if [ -d "$RULES_DIR/.git" ]; then
        cd "$RULES_DIR"
        git pull origin main --quiet
        echo -e "${GREEN}✓ Rules updated${NC}"
    else
        echo -e "${YELLOW}Rules directory does not exist, please run installation command first${NC}"
        exit 1
    fi
}

# Main function
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
            echo -e "${YELLOW}Please specify installation option, or use --help for help${NC}"
            echo ""
            show_help
            ;;
        *)
            echo -e "${RED}Invalid option: $1${NC}"
            echo ""
            show_help
            ;;
    esac

    if [ "$1" != "--help" ] && [ "$1" != "-h" ] && [ "$1" != "--update" ]; then
        echo ""
        echo -e "${GREEN}🎉 Rules installation completed!${NC}"
        echo -e "${BLUE}Rules files located at: $RULES_DIR${NC}"
        echo -e "${YELLOW}Tip: Check $RULES_DIR/README.md for usage instructions${NC}"
    fi
}

# Run main function
main "$@"
