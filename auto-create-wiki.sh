#!/bin/bash

# Automated Wiki Creation Script for Sylphx Flow
# This script uses GitHub API to create wiki pages automatically

set -e

echo "🚀 Sylphx Flow Auto Wiki Creator"
echo "================================="

# Configuration
REPO_OWNER="sylphxltd"
REPO_NAME="flow"
WIKI_DIR="wiki-pages"

# Check if we're authenticated with GitHub
if ! gh auth status >/dev/null 2>&1; then
    echo "❌ Please authenticate with GitHub first:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub authentication found"

# Check if wiki directory exists
if [ ! -d "$WIKI_DIR" ]; then
    echo "❌ Wiki directory '$WIKI_DIR' not found"
    echo "   Please run ./create-wiki.sh first"
    exit 1
fi

echo "✅ Wiki directory found"

# Function to create a wiki page via GitHub API
create_wiki_page() {
    local title="$1"
    local filename="$2"
    local content="$3"
    
    echo "📝 Creating page: $title"
    
    # Prepare the content for GitHub API
    # GitHub wiki pages need to be in Git format
    local escaped_content=$(echo "$content" | jq -Rs .)
    
    # Create the page using GitHub API
    response=$(gh api --method POST \
        -H "Accept: application/vnd.github.v3+json" \
        "repos/$REPO_OWNER/$REPO_NAME/wiki/pages" \
        --field title="$title" \
        --field content="$escaped_content" \
        --field format="markdown" 2>/dev/null || echo "API_ERROR")
    
    if [[ "$response" == "API_ERROR" ]]; then
        echo "⚠️  API method failed, trying alternative approach..."
        
        # Alternative: Create the first page to initialize the wiki
        if [ "$title" = "Home" ]; then
            echo "🏠 Initializing wiki with Home page..."
            
            # Create a temporary git repository for the wiki
            temp_dir=$(mktemp -d)
            cd "$temp_dir"
            
            git init
            git config user.name "Sylphx Flow Bot"
            git config user.email "bot@sylphxltd.com"
            
            # Create the Home page
            echo "$content" > "Home.md"
            git add Home.md
            git commit -m "Initial wiki: Add Home page"
            
            # Try to push to wiki (this will work once wiki is initialized)
            if git push "https://github.com/$REPO_OWNER/$REPO_NAME.wiki.git" main 2>/dev/null; then
                echo "✅ Wiki initialized successfully!"
            else
                echo "⚠️  Wiki initialization failed. You may need to create the first page manually."
                echo "   Please go to: https://github.com/$REPO_OWNER/$REPO_NAME/wiki"
                echo "   Create the first page with content from: $WIKI_DIR/Home.md"
                cd - >/dev/null
                rm -rf "$temp_dir"
                return 1
            fi
            
            cd - >/dev/null
            rm -rf "$temp_dir"
        fi
    else
        echo "✅ Page created: $title"
    fi
}

# Try to create each wiki page
echo ""
echo "📚 Creating wiki pages..."

# Create Home page first (required to initialize wiki)
if [ -f "$WIKI_DIR/Home.md" ]; then
    home_content=$(cat "$WIKI_DIR/Home.md")
    create_wiki_page "Home" "Home.md" "$home_content"
else
    echo "❌ Home.md not found in $WIKI_DIR"
    exit 1
fi

# Wait a moment for wiki initialization
echo "⏳ Waiting for wiki initialization..."
sleep 2

# Create other pages
for page_file in "$WIKI_DIR"/*.md; do
    if [ -f "$page_file" ]; then
        filename=$(basename "$page_file" .md)
        
        # Skip Home.md as it's already created
        if [ "$filename" = "Home" ]; then
            continue
        fi
        
        # Convert filename to title (replace hyphens with spaces)
        title=$(echo "$filename" | sed 's/-/ /g')
        
        content=$(cat "$page_file")
        create_wiki_page "$title" "$filename.md" "$content"
        
        # Small delay between requests
        sleep 1
    fi
done

echo ""
echo "🎉 Wiki creation process completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Visit: https://github.com/$REPO_OWNER/$REPO_NAME/wiki"
echo "   2. Verify all pages are created"
echo "   3. Check that internal links work correctly"
echo ""
echo "🔧 If some pages failed to create, you can:"
echo "   - Manually create them using the content in $WIKI_DIR/"
echo "   - Run this script again (it's idempotent)"
echo "   - Check GitHub API rate limits"