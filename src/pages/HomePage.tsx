import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MODES } from '../types'
import { ThemeToggle } from '../components/ThemeToggle'
import { SiteFooter } from '../components/SiteFooter'

const MODE_ICONS: Record<string, string> = {
  quadratic:     'x²',
  factorization: '( )',
  'linear-eq':   '=',
  integral:      '∫',
  combinatorics: 'C',
  binomial:      'P',
  sequence:      'Σ',
}

const VISIBLE_SLUGS = ['quadratic', 'factorization']

export function HomePage() {
  useEffect(() => {
    document.title = '無料計算ツール'
    document.querySelector('meta[name="description"]')?.setAttribute('content', '途中式つきの無料計算ツール。二次方程式・因数分解・最大公約数・素因数分解などに対応。')
  }, [])

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-logo">
            <span className="title-icon">∑</span>
            <span className="home-logo-text">wosmath</span>
          </div>
          <p className="home-logo-tagline">無料計算ツール</p>
          <ThemeToggle />
        </div>
      </header>

      <section className="home-hero">
        <h2 className="home-hero-title">途中式つきの<br />無料計算ツール</h2>
        <p className="home-hero-sub">現在は二次方程式・因数分解などに対応。</p>
      </section>

      <section className="home-section">
        <h3 className="home-section-title">代数</h3>
        <div className="tool-grid">
          {MODES.filter(m => VISIBLE_SLUGS.includes(m.slug)).map(mode => (
            <Link key={mode.id} to={`/${mode.slug}`} className="tool-card">
              <div className="tool-card-icon">{MODE_ICONS[mode.slug]}</div>
              <div className="tool-card-label">{mode.label}</div>
              <div className="tool-card-desc">{mode.description}</div>
              <div className="tool-card-open">開く →</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h3 className="home-section-title">整数・数論</h3>
        <div className="tool-grid">
          <Link to="/gcd" className="tool-card">
            <div className="tool-card-icon">÷</div>
            <div className="tool-card-label">最大公約数・最小公倍数</div>
            <div className="tool-card-desc">GCD / LCM を素因数分解つきで計算</div>
            <div className="tool-card-open">開く →</div>
          </Link>
          <Link to="/prime" className="tool-card">
            <div className="tool-card-icon">p</div>
            <div className="tool-card-label">素因数分解</div>
            <div className="tool-card-desc">約数の個数・和・一覧も同時に計算</div>
            <div className="tool-card-open">開く →</div>
          </Link>
          <Link to="/base" className="tool-card">
            <div className="tool-card-icon">₂</div>
            <div className="tool-card-label">進数変換</div>
            <div className="tool-card-desc">2〜62進数の相互変換。途中式つき</div>
            <div className="tool-card-open">開く →</div>
          </Link>
        </div>
        <p className="home-section-note">順次コンテンツを追加予定</p>
      </section>

      <section className="home-section">
        <h3 className="home-section-title">エンコード・変換</h3>
        <div className="tool-grid">
          <Link to="/base64" className="tool-card">
            <div className="tool-card-icon">64</div>
            <div className="tool-card-label">Base64</div>
            <div className="tool-card-desc">テキスト・ファイルのエンコード/デコード</div>
            <div className="tool-card-open">開く →</div>
          </Link>
          <Link to="/charcode" className="tool-card">
            <div className="tool-card-icon">文</div>
            <div className="tool-card-label">文字コード</div>
            <div className="tool-card-desc">Unicode・UTF-8・HTMLエンティティを表示</div>
            <div className="tool-card-open">開く →</div>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
