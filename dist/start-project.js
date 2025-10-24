#!/usr/bin/env bun
import { projectStartupTool } from '../src/tools/project-startup-tool.js';

const args = {
  project_type: 'refactor',
  project_name: 'effect-ecosystem-migration',
  mode: 'implementer',
  create_branch: true,
};

const result = projectStartupTool(args);
console.log(JSON.stringify(result, null, 2));
