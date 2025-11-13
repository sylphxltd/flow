import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Sylphx Flow',
  description: 'AI-powered development workflow automation',
  base: '/',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Features', link: '/features/loop-mode' },
      { text: 'API Reference', link: '/api/cli-commands' },
      { text: 'GitHub', link: 'https://github.com/sylphxltd/flow' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'MEP Architecture', link: '/guide/mep-architecture' },
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Project Structure', link: '/guide/project-structure' }
          ]
        }
      ],

      '/features/': [
        {
          text: 'Features',
          items: [
            { text: 'Loop Mode', link: '/features/loop-mode' },
            { text: 'File Input', link: '/features/file-input' },
            { text: 'Smart Configuration', link: '/features/smart-config' },
            { text: 'OpenCode Integration', link: '/features/opencode' }
          ]
        }
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'CLI Commands', link: '/api/cli-commands' },
            { text: 'Configuration File', link: '/api/configuration' },
            { text: 'Agents', link: '/api/agents' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sylphxltd/flow' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Sylphx Ltd'
    },

    search: {
      provider: 'local'
    }
  }
})
