#!/usr/bin/env node
// Simple script to run project startup tool
const { execSync } = require('child_process');
const path = require('path');

// Change to the project root directory
process.chdir(path.dirname(__filename));

// Run the MCP server and call the project_startup tool
// Since we can't easily call the tool directly, let's create the project structure manually

const fs = require('fs');
const { join } = require('path');

// Project details
const projectType = 'refactor';
const projectName = 'effect-ecosystem-migration';
const mode = 'implementer';
const timestamp = new Date().toISOString().split('T')[0];

// Generate random suffix
function generateRandomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `-${result}`;
}

const branchSuffix = generateRandomSuffix();
const branchName = `${projectType}/${projectName}${branchSuffix}`;
const workspaceDir = join('specs', projectType, `${projectName}${branchSuffix}`);

console.log(`🚀 Starting project initialization: ${branchName}`);

// Create git branch
try {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  if (currentBranch !== 'main') {
    console.error(
      `❌ Not on main branch. Current branch: ${currentBranch}. Please switch to main first.`
    );
    process.exit(1);
  }

  execSync(`git checkout -b ${branchName}`, { encoding: 'utf8' });
  console.log(`✅ Created and checked out branch: ${branchName}`);
} catch (error) {
  console.error(`❌ Failed to create branch "${branchName}": ${error.message}`);
  process.exit(1);
}

// Create workspace directory
if (!fs.existsSync(workspaceDir)) {
  fs.mkdirSync(workspaceDir, { recursive: true });
  console.log(`Created directory: ${workspaceDir}`);
}

// Basic project details
const description = `Code refactoring for ${projectName}`;
const requirements = [
  'Analyze current code structure',
  'Plan refactoring approach',
  'Implement refactored code',
  'Ensure all tests pass',
  'Update documentation',
];
const objective = `Improve code quality and maintainability for ${projectName}`;
const scope = 'Code structure improvements without changing external behavior';

// Create a basic spec file
const specContent = `# Project Specification: ${projectName}

## Project Details
- **Name**: ${projectName}
- **Type**: ${projectType}
- **Branch**: ${branchName}
- **Created**: ${timestamp}
- **Mode**: ${mode}

## Description
${description}

## Objective
${objective}

## Scope
${scope}

## Requirements
${requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

## Next Steps
1. Review and update this specification with detailed requirements
2. Fill in project-specific data
3. Proceed with implementation
4. Follow the refactoring workflow
`;

fs.writeFileSync(join(workspaceDir, 'spec.md'), specContent);
console.log(`Created file: ${workspaceDir}/spec.md`);

// Create initial commit
try {
  execSync('git add .', { encoding: 'utf8' });
  execSync(
    `git commit -m "refactor(refactor): initialize ${projectName} workspace and basic templates"`,
    { encoding: 'utf8' }
  );
  console.log('✅ Created initial commit with project templates');
} catch (error) {
  console.error('Warning: Failed to create initial commit:', error.message);
}

console.log(`✅ Project "${projectName}" initialized successfully!`);
console.log(`
Next steps:
1. Review and update specs/${projectType}/${projectName}/spec.md with detailed requirements
2. Fill in project-specific data
3. Proceed with refactoring implementation
4. Follow the workflow
`);
