import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

export default defineConfig({
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

          // Also copy all article JSON files
          const articlesDir = 'generated_articles'
          const files = readdirSync(articlesDir)
          let copiedCount = 0

          files.forEach(file => {
            if (file.endsWith('.json') && file !== 'index.json') {
              const srcPath = join(articlesDir, file)
              const destPath = join('dist/generated_articles', file)
              copyFileSync(srcPath, destPath)
              copiedCount++
            }
          })

          console.log(`✅ Copied ${copiedCount} article files to dist`)
        } catch (err) {
          console.error('⚠️ Failed to copy articles:', err)
        }
      }
    }
  ],
  publicDir: 'public',
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
})
