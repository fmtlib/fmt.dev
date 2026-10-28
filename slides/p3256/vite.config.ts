import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [
    viteSingleFile(),
    {
      name: 'single-file-slidev',
      enforce: 'post',
      configResolved(config) {
        const output = config.build.rollupOptions.output
        for (const item of Array.isArray(output) ? output : [output])
          if (item) delete item.manualChunks
      },
      transformIndexHtml(html) {
        return html
          .replace(/<link[^>]+fonts\.googleapis\.com[^>]*>\s*/g, '')
          .replace(/<link[^>]+rel="icon"[^>]*>\s*/g, '')
      },
    },
  ],
})
