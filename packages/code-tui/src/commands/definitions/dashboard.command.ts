/**
 * Dashboard Command
 * Open the full-screen control panel
 */

import type { Command } from '../types.js';

export const dashboardCommand: Command = {
  id: 'dashboard',
  label: '/dashboard',
  description: 'Open control panel - central hub for all features',
  execute: async (context) => {
    context.navigateTo('dashboard');
    return 'Opening control panel...';
  },
};
