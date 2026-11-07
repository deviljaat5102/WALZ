import Link from 'next/link';

const stats = [{ label: 'Total users', value: '—' }, { label: 'Active sessions', value: '—' }, { label: 'Platform status', value: 'Setup' }];

export default function AdminPage() {
  return <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
    <Link href="/" style={{ color: '#a99fff' }}>← WALZ home</Link>
    <header style={{ margin: '48px 0 32px' }}><p style={{ color: '#a99fff', letterSpacing: 3, fontSize: 12 }}>WALZ CONTROL CENTER</p><h1 style={{ fontSize: 48, margin: '12px 0' }}>Admin workspace</h1><p style={{ color: '#aab2c0' }}>Your operations dashboard foundation. Authentication and role-based permissions are the next setup step.</p></header>
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>{stats.map(s => <article key={s.label} style={{ border: '1px solid #28283b', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 24 }}><p style={{ color: '#aab2c0' }}>{s.label}</p><strong style={{ fontSize: 32 }}>{s.value}</strong></article>)}</section>
    <section style={{ marginTop: 24, border: '1px solid #28283b', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 24 }}><h2>Next modules</h2><ul style={{ color: '#aab2c0', lineHeight: 2 }}><li>User and role management</li><li>Activity and audit logs</li><li>Platform settings</li><li>Reports and analytics</li></ul></section>
  </main>;
}
