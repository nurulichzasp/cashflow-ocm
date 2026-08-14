/* eslint-disable @typescript-eslint/no-require-imports -- Skrip ini sengaja CommonJS (.cjs). */

/* Generate ikon PWA dari desain monogram OCM (kotak Hijau Sawit + teks putih).
 * Jalankan: NODE_PATH=$PWD/node_modules node scripts/gen-pwa-icons.cjs
 *  - public/icon-192.png, public/icon-512.png : rounded (purpose "any")
 *  - public/icon-maskable.png (512)           : full-bleed + safe zone (purpose "maskable")
 */
const sharp = require('sharp')
const path = require('path')

const OUT = path.join(__dirname, '..', 'public')

const rounded = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="116" fill="#0E7A57"/>
  <text x="256" y="256" font-family="Arial, Helvetica, sans-serif" font-size="176" font-weight="700" letter-spacing="-4" fill="#ffffff" text-anchor="middle" dominant-baseline="central">OCM</text>
</svg>`

// Maskable: full-bleed (tanpa rounded), teks lebih kecil agar masuk safe-zone 80%.
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0E7A57"/>
  <text x="256" y="256" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700" letter-spacing="-4" fill="#ffffff" text-anchor="middle" dominant-baseline="central">OCM</text>
</svg>`

async function run() {
  await sharp(Buffer.from(rounded(192))).resize(192, 192).png().toFile(path.join(OUT, 'icon-192.png'))
  await sharp(Buffer.from(rounded(512))).resize(512, 512).png().toFile(path.join(OUT, 'icon-512.png'))
  await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile(path.join(OUT, 'icon-maskable.png'))
  console.log('OK: icon-192.png, icon-512.png, icon-maskable.png →', OUT)
}
run().catch((e) => { console.error(e); process.exit(1) })
