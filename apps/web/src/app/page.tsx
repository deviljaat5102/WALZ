import Link from 'next/link';

const items = [
  { label: 'One platform', detail: 'Website, admin workspace and Android app.' },
  { label: 'Connected data', detail: 'A shared Supabase backend with secure access policies.' },
  { label: 'Built to grow', detail: 'A modular foundation ready for real product features.' },
];

export default function HomePage() {
  return <main style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 24px' }}>
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 100 }}><strong style={{ letterSpacing: 5, fontSize: 22 }}>WALZ</strong><Link href="/admin" style={{ border: '1px solid #37344f', borderRadius: 999, padding: '10px 18px' }}>Admin workspace ↗</Link></nav>
    <p style={{ color: '#a99fff', letterSpacing: 3, fontSize: 12 }}>ONE PLATFORM · CONNECTED EXPERIENCES</p>
    <h1 style={{ fontSize: 'clamp(48px, 8vw, 88px)', lineHeight: 1.02, maxWidth: 850, margin: '20px 0' }}>Everything connected.<br/><span style={{ color: '#a99fff' }}>Built around you.</span></h1>
    <p style={{ color: '#aab2c0', fontSize: 18, lineHeight: 1.7, maxWidth: 650 }}>WALZ brings the web experience, operations dashboard and Android app together on one secure foundation.</p>
    <div style={{ display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap' }}><Link href="/admin" style={{ background: '#8b7cff', color: '#090b12', padding: '14px 22px', borderRadius: 12, fontWeight: 700 }}>Open workspace</Link><a href="#platform" style={{ border: '1px solid #37344f', padding: '14px 22px', borderRadius: 12 }}>Explore platform</a></div>
    <section id="platform" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginTop: 100 }}>{items.map(item => <article key={item.label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid #28283b', borderRadius: 18, padding: 24 }}><h2 style={{ fontSize: 20 }}>{item.label}</h2><p style={{ color: '#aab2c0', lineHeight: 1.6 }}>{item.detail}</p></article>)}</section>
    <footer style={{ marginTop: 100, color: '#737d8c', fontSize: 13 }}>© {new Date().getFullYear()} WALZ · Initial platform foundation</footer>
  </main>;
}
