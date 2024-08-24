import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

function updateManifest() {
  return {
    name: 'update-manifest',
    writeBundle(options, bundle) {
      // Read the existing manifest file
      const manifestPath = path.resolve(__dirname, 'public', 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

      // Update the manifest with hashed file names
      Object.keys(bundle).forEach((fileName) => {
        if (fileName.startsWith('assets/background/background')) {
          manifest.background.service_worker = fileName
        }
        if (fileName.startsWith('assets/content/content')) {
          manifest.content_scripts[0].js = [fileName]
        }
      })

      // Write the updated manifest to the dist folder
      writeFileSync(
        path.resolve(__dirname, 'dist', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      )
    },
  }
}

export default defineConfig({
  plugins: [solid(), updateManifest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'background/background': path.resolve(__dirname, 'src/background/background.ts'),
        'content/content': path.resolve(__dirname, 'src/content/content.ts'),
      },
    },
  },
})
