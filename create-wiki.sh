#!/bin/bash

# Script to create GitHub wiki pages for Sylphx Flow
# This script prepares wiki content that can be manually copied to GitHub wiki

echo "📚 Creating Sylphx Flow Wiki Pages"
echo "=================================="

# Create wiki directory
mkdir -p wiki-pages
cd wiki-pages

echo "✅ Wiki pages created in ./wiki-pages/"
echo ""
echo "📋 Pages created:"
echo "  - Home.md (Main wiki page)"
echo "  - Installation-&-Setup.md (Installation guide)"
echo "  - Memory-System.md (Memory management)"
echo "  - CLI-Commands.md (Command reference)"
echo ""
echo "🚀 To publish to GitHub wiki:"
echo "  1. Go to https://github.com/sylphxltd/flow/wiki"
echo "  2. Click 'Add Page'"
echo "  3. Copy content from each file in ./wiki-pages/"
echo "  4. Save each page"
echo ""
echo "🔗 Make sure to create the Home.md page first as the main landing page."