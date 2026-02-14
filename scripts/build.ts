/**
 * Build script — builds all distribution formats from TypeScript source.
 * Uses Vite lib mode for self-contained IIFE builds per entry.
 */
import { build } from 'vite'
import { resolve } from 'path'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, renameSync, rmSync } from 'fs'

const root = resolve(import.meta.dir, '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
const outExt = resolve(root, 'dist/extension')
const outStandalone = resolve(root, 'dist/standalone')
const outUserscript = resolve(root, 'dist/userscript')
const outBookmarklet = resolve(root, 'dist/bookmarklet')

// Clean
rmSync(resolve(root, 'dist'), { recursive: true, force: true })

console.log(`\n🔨 Building ChatGPT Export v${pkg.version}\n`)

// --- Chrome Extension entries ---
const extEntries = [
  { name: 'content', input: 'src/extension/content.ts' },
  { name: 'background', input: 'src/extension/background.ts' },
  { name: 'popup', input: 'src/extension/popup/popup.ts' },
]

for (const entry of extEntries) {
  console.log(`  [ext] Building ${entry.name}...`)
  await build({
    configFile: false,
    root,
    build: {
      outDir: outExt,
      emptyOutDir: entry === extEntries[0],
      target: 'es2022',
      lib: {
        entry: resolve(root, entry.input),
        formats: ['iife'],
        name: `__cge_${entry.name}`,
        fileName: () => `${entry.name}.js`,
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          assetFileNames: '[name].[ext]',
        },
      },
      minify: true,
    },
  })
}

// Fix CSS filename (Vite lib mode uses package name)
const wrongCss = resolve(outExt, `${pkg.name}.css`)
const correctCss = resolve(outExt, 'popup.css')
if (existsSync(wrongCss)) renameSync(wrongCss, correctCss)

// Copy extension static assets
const manifest = JSON.parse(readFileSync(resolve(root, 'src/extension/manifest.json'), 'utf-8'))
manifest.version = pkg.version
writeFileSync(resolve(outExt, 'manifest.json'), JSON.stringify(manifest, null, 2))
writeFileSync(resolve(outExt, 'popup.html'), readFileSync(resolve(root, 'src/extension/popup/popup.html'), 'utf-8'))

mkdirSync(resolve(outExt, 'icons'), { recursive: true })
for (const size of [16, 32, 48, 128]) {
  const name = `icon-${size}.png`
  const src = resolve(root, `src/extension/icons/${name}`)
  if (existsSync(src)) copyFileSync(src, resolve(outExt, 'icons', name))
}

console.log(`  ✅ Extension → dist/extension/`)

// --- Standalone inject script ---
console.log(`  [standalone] Building inject...`)
mkdirSync(outStandalone, { recursive: true })
await build({
  configFile: false,
  root,
  build: {
    outDir: outStandalone,
    emptyOutDir: true,
    target: 'es2022',
    lib: {
      entry: resolve(root, 'src/standalone/inject.ts'),
      formats: ['iife'],
      name: 'ChatGPTExport',
      fileName: () => 'inject.js',
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
    minify: false, // Keep readable for console paste
  },
})
console.log(`  ✅ Standalone → dist/standalone/inject.js`)

// --- Userscript ---
console.log(`  [userscript] Building...`)
mkdirSync(outUserscript, { recursive: true })
await build({
  configFile: false,
  root,
  build: {
    outDir: outUserscript,
    emptyOutDir: true,
    target: 'es2022',
    lib: {
      entry: resolve(root, 'src/userscript/chatgpt-export.user.ts'),
      formats: ['iife'],
      name: 'ChatGPTExportUserscript',
      fileName: () => 'chatgpt-export.user.js',
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
    minify: false,
  },
})

// Prepend userscript header (Vite strips comments)
const userscriptPath = resolve(outUserscript, 'chatgpt-export.user.js')
const headerSrc = readFileSync(resolve(root, 'src/userscript/chatgpt-export.user.ts'), 'utf-8')
const headerMatch = headerSrc.match(/(\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==)/)
if (headerMatch) {
  const header = headerMatch[1].replace('__VERSION__', pkg.version)
  const body = readFileSync(userscriptPath, 'utf-8')
  writeFileSync(userscriptPath, header + '\n\n' + body)
}
console.log(`  ✅ Userscript → dist/userscript/chatgpt-export.user.js`)

// --- Bookmarklet ---
console.log(`  [bookmarklet] Generating...`)
mkdirSync(outBookmarklet, { recursive: true })
const injectCode = readFileSync(resolve(outStandalone, 'inject.js'), 'utf-8')
// Minify for bookmarklet using Bun
const minResult = await Bun.build({
  entrypoints: [resolve(outStandalone, 'inject.js')],
  outdir: '/tmp/bookmarklet-build',
  minify: true,
  target: 'browser',
  format: 'iife',
})
if (minResult.success) {
  const minCode = await minResult.outputs[0].text()
  const bookmarklet = `javascript:${encodeURIComponent(minCode)}`
  writeFileSync(resolve(outBookmarklet, 'bookmarklet.txt'), bookmarklet)
  writeFileSync(resolve(outBookmarklet, 'bookmarklet.html'), `<!DOCTYPE html>
<html><head><title>ChatGPT Export Bookmarklet</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;}
a.bookmarklet{display:inline-block;padding:12px 24px;background:#10b981;color:#fff;
border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;}</style></head>
<body>
<h1>💬 ChatGPT Export — Bookmarklet</h1>
<p>Drag this button to your bookmarks bar:</p>
<p><a class="bookmarklet" href="${bookmarklet}">Export ChatGPT</a></p>
<p>Then click it while on <a href="https://chatgpt.com">chatgpt.com</a>.</p>
</body></html>`)
  rmSync('/tmp/bookmarklet-build', { recursive: true, force: true })
}
console.log(`  ✅ Bookmarklet → dist/bookmarklet/`)

console.log(`\n✨ All builds complete!\n`)
