import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Sylphx Flow',
  description: 'AI-powered development workflow automation with autonomous loop mode and smart configuration',
  base: '/',
  ignoreDeadLinks: true,

  head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],

    // Open Graph / Facebook
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Sylphx Flow - AI-Powered Development Automation' }],
    ['meta', { property: 'og:description', content: 'Stop writing prompts. Start building software. Autonomous AI agents with Loop Mode, File Input, and Smart Configuration.' }],
    ['meta', { property: 'og:image', content: 'https://flow.sylphx.com/og-image.svg' }],
    ['meta', { property: 'og:url', content: 'https://flow.sylphx.com' }],

    // Twitter
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Sylphx Flow - AI-Powered Development Automation' }],
    ['meta', { name: 'twitter:description', content: 'Stop writing prompts. Start building software. Autonomous AI agents with Loop Mode, File Input, and Smart Configuration.' }],
    ['meta', { name: 'twitter:image', content: 'https://flow.sylphx.com/og-image.svg' }],

    // Additional meta
    ['meta', { name: 'theme-color', content: '#6B46C1' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }],
  ],

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
