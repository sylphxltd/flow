#!/bin/bash

# Quick Rules Installer - One-command installation of rules to project
# Usage: curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/quick-install.sh | bash

set -e

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
RULES_REPO="https://github.com/sylphxltd/rules.git"
RULES_DIR=".cursor/rules"

echo -e "${BLUE}🚀 Quick Rules Installer${NC}"
echo ""

# Create directory
mkdir -p "$RULES_DIR"

# Download rules
echo -e "${YELLOW}Downloading rules...${NC}"
if command -v git &> /dev/null; then
    if [ -d "$RULES_DIR/.git" ]; then
        cd "$RULES_DIR"
        git pull origin main --quiet
    else
        git clone "$RULES_REPO" "$RULES_DIR" --quiet
    fi
    echo -e "${GREEN}✓ Rules downloaded${NC}"
else
    echo -e "${YELLOW}Git not detected, downloading with curl...${NC}"
    mkdir -p "$RULES_DIR"
    curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/README.md -o "$RULES_DIR/README.md"
    echo -e "${GREEN}✓ Basic documentation downloaded${NC}"
    echo -e "${YELLOW}Tip: Install git to get the complete rule collection${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Installation completed!${NC}"
echo -e "${BLUE}Rules location: $RULES_DIR${NC}"
echo ""
echo -e "${YELLOW}Usage:${NC}"
echo "  View rules: cat $RULES_DIR/README.md"
echo "  Edit rules: cursor $RULES_DIR/"
echo ""
echo -e "${BLUE}More installation options: https://github.com/sylphxltd/rules${NC}"
