interface Props { titulo: string; }

export default function ComingSoonPage({ titulo }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: '20px', animation: 'fadeUp 0.4s ease',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '18px',
        background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px',
      }}>🚧</div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {titulo}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '340px', lineHeight: 1.6 }}>
          Este módulo está en desarrollo y estará disponible próximamente.
        </p>
      </div>
      <div style={{
        padding: '10px 22px', borderRadius: '8px',
        background: 'var(--accent-glow)', border: '1px solid var(--accent)',
        fontSize: '12px', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em',
      }}>
        EN DESARROLLO
      </div>
    </div>
  );
}