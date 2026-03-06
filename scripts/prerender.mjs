// ビルド後に各ルートの index.html を生成するスクリプト
// タイトル・meta description を正しく埋め込んでSEOを改善する

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const template = readFileSync('dist/index.html', 'utf-8')

const routes = [
  {
    path: '/',
    title: '無料計算ツール',
    description: '途中式つきの無料計算ツール。二次方程式・因数分解・最大公約数・素因数分解などに対応。',
  },
  {
    path: '/prime',
    title: '素因数分解 | 無料計算ツール',
    description: '最大24桁の整数を素因数分解。9桁以下は約数の個数・和・一覧も計算します。',
  },
  {
    path: '/gcd',
    title: '最大公約数・最小公倍数 | 無料計算ツール',
    description: '2つ以上の整数の最大公約数（GCD）と最小公倍数（LCM）を計算。素因数分解・ユークリッドの互除法による途中式つき。',
  },
  {
    path: '/base',
    title: '進数変換 | 無料計算ツール',
    description: '16進数・2進数・8進数など、2から62進数まで任意の基数で相互変換。変換の途中式も表示します。',
  },
  {
    path: '/quadratic',
    title: '二次方程式 | 無料計算ツール',
    description: '二次方程式 ax²+bx+c=0 を解いて途中式を表示。判別式・解の公式・グラフまで対応。',
  },
  {
    path: '/factorization',
    title: '因数分解 | 無料計算ツール',
    description: '多項式の因数分解を途中式つきで計算。因数定理・完全平方式・差の平方などに対応。',
  },
  {
    path: '/base64',
    title: 'Base64 エンコード・デコード | 無料計算ツール',
    description: 'テキストや画像などのファイルをBase64に変換・復元します。HTMLへの画像埋め込み（data URL）やAPI通信でのバイナリ送信に。ブラウザ内で完結するため、データは外部に送信されません。',
  },
]

for (const route of routes) {
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/,  `$1${route.description}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/,  `$1${route.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${route.description}$2`)

  if (route.path === '/') {
    writeFileSync('dist/index.html', html)
  } else {
    const dir = join('dist', route.path)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), html)
  }

  console.log(`✓ ${route.path}`)
}

console.log(`\nprerendered ${routes.length} routes`)
