import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'copy-articles',
      closeBundle() {
        // Copy generated_articles to dist after build
        try {
          mkdirSync('dist/generated_articles', { recursive: true })
          copyFileSync(
            'generated_articles/index.json',
            'dist/generated_articles/index.json'
          )

          // Copy only articles present in the public manifest.
          const articles = JSON.parse(readFileSync('generated_articles/index.json', 'utf8'))
          let copiedCount = 0

          articles.forEach(article => {
            if (!article?.slug) return
            const file = `${article.slug}.json`
            const source = article.source || join('generated_articles', file)
            copyFileSync(source, join('dist/generated_articles', file))
            copiedCount++
          })

          console.log(`✅ Copied ${copiedCount} article files to dist`)
        } catch (err) {
          console.error('⚠️ Failed to copy articles:', err)
        }
      }
    }
  ],
  publicDir: 'public',
  esbuild: mode === 'production'
    ? { drop: ['console', 'debugger'] }
    : undefined,
  server: {
    fs: {
      // Allow serving files from the generated_articles directory
      allow: ['.', 'generated_articles']
    }
  },
  build: {
    manifest: true,
    outDir: 'dist',
    emptyOutDir: true
  }
}))
