# Suggested Commands for Development

## Core Development Commands
These are essential for editing, managing, and testing the rules repository.

### Git Commands (Version Control)
```bash
# Check status
git status

# Add changes
git add docs/rules/new-rule.mdc
git add .

# Commit changes
git commit -m "Add new rule for AI SDK integration"

# Push to remote
git push origin main

# Pull latest changes
git pull origin main

# Create branch for features
git checkout -b feature/new-rule-category
```

### File Management (Darwin/macOS)
```bash
# List directory contents
ls -la docs/rules/

# Navigate directories
cd docs/rules/framework/
cd ..

# Search for files
find . -name "*.mdc" | grep nextjs

# Grep for content
grep -r "TypeScript" docs/rules/

# Create new directory/file
mkdir -p docs/rules/new-category/
touch docs/rules/new-category/example.mdc
```

### Editing and Viewing
```bash
# Open in Cursor (IDE)
cursor docs/rules/
cursor .

# View file content
cat docs/README.md
less scripts/install-rules.sh

# Edit with system editor (if needed)
open -a TextEdit README.md  # macOS default
```

### Script Testing and Execution
```bash
# Make script executable
chmod +x scripts/install-rules.sh

# Test installation script (dry-run or verbose)
bash scripts/install-rules.sh --help
bash scripts/install-rules.sh --nextjs  # Test in a temp dir

# Run quick install
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/quick-install.sh | bash

# NPM script testing
npm run install:nextjs
npm run install:all
```

### Package Management
```bash
# Install dependencies (if any added)
npm install

# Update package version
npm version patch  # or minor/major

# Publish to NPM (if configured)
npm publish
```

### Documentation and Search
```bash
# Preview Markdown
open -a "Markdown Preview" docs/README.md  # Or use browser: open docs/README.md

# Word count for rules
wc -w docs/rules/*.mdc

# Find rule files by category
ls docs/rules/framework/
```

### Utility Commands (Darwin-Specific)
```bash
# System info
uname -a  # Confirm Darwin
sw_vers   # macOS version

# Process management
ps aux | grep bash  # Check running scripts

# Disk usage
du -sh docs/  # Size of docs directory
```

## Workflow Commands
### Adding a New Rule
```bash
# 1. Create new file
touch docs/rules/core/new-rule.mdc

# 2. Edit in IDE
cursor docs/rules/core/new-rule.mdc

# 3. Add and commit
git add docs/rules/core/new-rule.mdc
git commit -m "Add new-rule: Description"
git push

# 4. Test installation impact
bash scripts/install-rules.sh --all  # In a test project
```

### Updating Existing Rules
```bash
# 1. Edit file
cursor docs/rules/general.mdc

# 2. Commit
git add docs/rules/general.mdc
git commit -m "Update general.mdc: Improve testing section"
git push

# 3. Update installation in test project
cd test-project/.cursor/rules && git pull origin main
```

### Maintenance
```bash
# Clean up (be careful)
git clean -fd  # Remove untracked files

# Check for broken links (manual or use tool)
grep -r "http" docs/ | less

# Validate JSON
cat package.json | python -m json.tool  # If Python available
```

These commands cover 90% of development tasks. For complex searches, use `grep` or `find`; for scripting, test in isolation before integrating.