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
    ['meta', { name: 'twitter:site', content: '@SylphxAI' }],
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
      { text: 'GitHub', link: 'https://github.com/sylphxltd/flow' },
      { text: 'npm', link: 'https://www.npmjs.com/package/@sylphx/flow' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/getting-started' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Rules System', link: '/guide/rules' },
            { text: 'MCP Integration', link: '/guide/mcp' }
          ]
        }
      ],

      '/features/': [
        {
          text: 'Core Features',
          items: [
            { text: 'Loop Mode', link: '/features/loop-mode' },
            { text: 'AI Agents', link: '/features/agents' },
            { text: 'Semantic Search', link: '/features/semantic-search' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sylphxltd/flow' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@sylphx/flow' },
      { icon: 'twitter', link: 'https://x.com/SylphxAI' }
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
