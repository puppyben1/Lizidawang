import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import astroExpressiveCode from 'astro-expressive-code'
import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import rehypeHeadingLinks from './src/lib/rehype/rehype-heading-links.mjs'
import rehypeThoughtLineBreaks from './src/lib/rehype/rehype-thought-line-breaks.mjs'
import remarkGithubAlerts from './src/lib/remark/github-alert.mjs'
import remarkDemoteH1ToH2 from './src/lib/remark/remark-demote-h1.mjs'
import remarkExternalLinks from './src/lib/remark/remark-external-links.mjs'

function generateSitemap() {
  return {
    name: 'generate-sitemap',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const distDir = fileURLToPath(dir)
        const src = join(distDir, 'sitemap-0.xml')
        const dest = join(distDir, 'sitemap.xml')
        if (!existsSync(src)) {
          console.warn('[@generate-sitemap] sitemap-0.xml not found, skipping.')
          return
        }
        copyFileSync(src, dest)
        console.log(
          '[@generate-sitemap] sitemap.xml generated from sitemap-0.xml',
        )
      },
    },
  }
}

const viteEnvPath = fileURLToPath(
  new URL('./node_modules/vite/dist/client/env.mjs', import.meta.url),
)

function resolveViteEnv() {
  return {
    name: 'resolve-vite-env',
    enforce: 'pre',
    resolveId(id) {
      if (id === '@vite/env') {
        return viteEnvPath
      }
    },
  }
}

export default defineConfig({
  site: 'https://xiaozhubao.top/',
  compressHTML: true,
  devToolbar: {
    enabled: false,
  },

  output: 'static',
  adapter: vercel(),

  build: {
    inlineStylesheets: 'auto',
  },

  integrations: [
    astroExpressiveCode({
      themes: ['one-light', 'one-dark-pro'],
      useDarkModeMediaQuery: false,
      themeCssRoot: 'html',
      themeCssSelector: (theme) =>
        theme.type === 'dark' ? '.dark' : undefined,
      defaultProps: {
        frame: 'none',
      },
      frames: {
        showCopyToClipboardButton: true,
      },
      styleOverrides: {
        borderRadius: '0.375rem',
        borderWidth: '0',
        codeBackground: ({ theme }) =>
          theme.type === 'dark' ? '#1b1b1b' : '#f5f5f5',
        codeFontFamily: 'var(--font-mono)',
        codeFontSize: '0.875rem',
        codeLineHeight: '1.714',
        codePaddingBlock: '1rem',
        codePaddingInline: '1.5rem',
      },
    }),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/offline'),
    }),
    generateSitemap(),
  ],

  markdown: {
    remarkPlugins: [
      remarkGithubAlerts,
      remarkDemoteH1ToH2,
      [remarkExternalLinks, { allowHostnames: ['xiaozhubao.top'] }],
    ],
    rehypePlugins: [rehypeHeadingLinks, rehypeThoughtLineBreaks],
  },

  vite: {
    server: {
      watch: {
        ignored: ['**/.vercel/**', '**/dist/**'],
      },
    },
    resolve: {
      alias: {
        '@vite/env': viteEnvPath,
      },
    },
    plugins: [resolveViteEnv(), tailwindcss()],
  },
})
