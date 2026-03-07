import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { api } from '../../services/api.client';

// ─── SVG Icons ───────────────────────────────────────────────
const IconMail = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconLock = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEyeOn = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);
const IconWrench = ({ color, size = 28 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IconBox = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
);
const IconCart = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  </svg>
);

// ─── TOKENS POR TEMA ─────────────────────────────────────────
const DARK = {
  pageBg:        '#0B1221',
  leftBg:        'linear-gradient(170deg, #131F35 0%, #0F1A2E 100%)',
  leftBorder:    'rgba(59,130,246,0.1)',
  logoBg:        'rgba(16,185,129,0.1)',
  logoBorder:    'rgba(16,185,129,0.3)',
  logoColor:     '#10B981',
  title:         '#F0F6FF',
  subtitle:      'rgba(148,163,184,0.5)',
  itemBg:        'rgba(59,130,246,0.05)',
  itemBorder:    'rgba(59,130,246,0.1)',
  itemIconBg:    'rgba(16,185,129,0.08)',
  itemIcon:      '#10B981',
  itemTitle:     '#10B981',
  itemDesc:      'rgba(148,163,184,0.4)',
  footer:        'rgba(148,163,184,0.25)',
  cardBg:        '#162032',
  cardBorder:    'rgba(59,130,246,0.12)',
  accentBar:     'linear-gradient(90deg, #3B82F6, #10B981, #3B82F6)',
  dividerColor:  'rgba(148,163,184,0.2)',
  sectionLabel:  'rgba(148,163,184,0.4)',
  label:         'rgba(148,163,184,0.6)',
  inputBg:       'rgba(10,18,36,0.6)',
  inputBorder:   'rgba(59,130,246,0.12)',
  inputFocus:    'rgba(59,130,246,0.55)',
  inputGlow:     'rgba(59,130,246,0.08)',
  inputColor:    '#EFF6FF',
  iconDefault:   'rgba(148,163,184,0.3)',
  iconFocus:     '#3B82F6',
  eyeColor:      '#3B82F6',
  forgotColor:   'rgba(59,130,246,0.7)',
  btnBg:         'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  btnColor:      '#FFFFFF',
  btnShadow:     '0 4px 18px rgba(16,185,129,0.3)',
  spinnerTrack:  'rgba(255,255,255,0.15)',
  spinnerColor:  '#10B981',
  errorBg:       'rgba(220,38,38,0.08)',
  errorBorder:   'rgba(220,38,38,0.25)',
  errorColor:    '#F87171',
  footerBg:      'rgba(0,0,0,0.15)',
  footerBorder:  'rgba(59,130,246,0.08)',
  footerColor:   'rgba(148,163,184,0.25)',
  toggleBg:      'rgba(22,32,50,0.95)',
  toggleBorder:  'rgba(59,130,246,0.25)',
  toggleColor:   '#94A3B8',
  toggleShadow:  '0 2px 10px rgba(0,0,0,0.3)',
  wrapperShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
  glowA: 'rgba(59,130,246,0.06)', glowB: 'rgba(16,185,129,0.04)',
  ring: 'rgba(59,130,246,',
};

const LIGHT = {
  pageBg:        '#EDE8DF',
  leftBg:        'linear-gradient(170deg, #E8E2D6 0%, #D8CEBC 100%)',
  leftBorder:    'rgba(160,120,50,0.2)',
  logoBg:        '#FFFFFF',
  logoBorder:    'rgba(200,150,60,0.3)',
  logoColor:     '#B87820',
  title:         '#2C1A06',
  subtitle:      'rgba(80,50,15,0.5)',
  itemBg:        'rgba(255,255,255,0.5)',
  itemBorder:    'rgba(180,130,40,0.15)',
  itemIconBg:    'rgba(212,130,10,0.08)',
  itemIcon:      '#B87820',
  itemTitle:     '#3D2209',
  itemDesc:      'rgba(80,50,15,0.45)',
  footer:        'rgba(80,50,15,0.3)',
  cardBg:        '#FDFAF5',
  cardBorder:    'rgba(180,130,50,0.15)',
  accentBar:     'linear-gradient(90deg, #E8A020, #F0C040, #E8A020)',
  dividerColor:  'rgba(160,110,30,0.25)',
  sectionLabel:  'rgba(100,65,15,0.5)',
  label:         '#6B4010',
  inputBg:       '#FFFFFF',
  inputBorder:   'rgba(180,130,50,0.25)',
  inputFocus:    '#D4820A',
  inputGlow:     'rgba(212,130,10,0.1)',
  inputColor:    '#1C1005',
  iconDefault:   'rgba(160,110,40,0.35)',
  iconFocus:     '#D4820A',
  eyeColor:      '#C07010',
  forgotColor:   '#C07010',
  btnBg:         'linear-gradient(135deg, #E8A020 0%, #D4820A 100%)',
  btnColor:      '#FFFFFF',
  btnShadow:     '0 4px 16px rgba(212,130,10,0.35)',
  spinnerTrack:  'rgba(100,65,15,0.15)',
  spinnerColor:  '#D4820A',
  errorBg:       'rgba(200,40,30,0.06)',
  errorBorder:   'rgba(200,40,30,0.25)',
  errorColor:    '#B91C1C',
  footerBg:      'rgba(230,180,60,0.04)',
  footerBorder:  'rgba(180,130,50,0.12)',
  footerColor:   'rgba(100,65,15,0.35)',
  toggleBg:      'rgba(255,255,255,0.85)',
  toggleBorder:  'rgba(180,130,50,0.25)',
  toggleColor:   '#6B4010',
  toggleShadow:  '0 2px 10px rgba(120,80,20,0.12)',
  wrapperShadow: '0 32px 64px rgba(100,70,20,0.18), 0 0 0 1px rgba(180,130,50,0.14)',
  glowA: 'rgba(224,160,32,0.06)', glowB: 'rgba(245,200,66,0.05)',
  ring: 'rgba(180,130,50,',
};

export default function LoginPage() {
  const navigate      = useNavigate();
  const { setAuth }   = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const T             = isDark ? DARK : LIGHT;

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [focused,      setFocused]      = useState<string | null>(null);

  const INFO_ITEMS = [
    { Icon: ({ color }: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>, title: 'Inventario', desc: 'Gestión en tiempo real' },
    { Icon: IconBox,  title: 'Productos', desc: 'Catálogo completo' },
    { Icon: IconCart, title: 'Ventas',    desc: 'Control de pedidos' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Completa todos los campos para continuar.'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.usuario, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: field === 'password' ? '11px 44px 11px 40px' : '11px 14px 11px 40px',
    background: T.inputBg,
    border: `1px solid ${focused === field ? T.inputFocus : T.inputBorder}`,
    borderRadius: '6px',
    color: T.inputColor,
    fontSize: '13.5px',
    fontFamily: "'Georgia', serif",
    outline: 'none',
    boxShadow: focused === field ? `0 0 0 3px ${T.inputGlow}` : 'none',
    transition: 'all 0.18s ease',
  });

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; height: 100%; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
        @keyframes modalIn { from{opacity:0;transform:scale(.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .ff-card { animation: fadeUp 0.42s cubic-bezier(.22,.68,0,1.15) both; }
        .ff-btn  { transition: all 0.18s ease; }
        .ff-btn:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); }
        .ff-btn:active:not(:disabled){ transform: translateY(0); }
        .ff-toggle { transition: all 0.2s ease; }
        .ff-toggle:hover { filter: brightness(1.08); transform: scale(1.02); }
        .ff-forgot { transition: opacity 0.15s; opacity: 0.7; }
        .ff-forgot:hover { opacity: 1; text-decoration: underline; }
      `}</style>

      {/* PAGE */}
      <div style={{
        position: 'fixed', inset: 0,
        background: T.pageBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Georgia','Times New Roman',serif",
        padding: '20px',
        overflow: 'auto',
        transition: 'background 0.35s ease',
      }}>
        {/* Ambient glow */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `radial-gradient(ellipse at 20% 60%, ${T.glowA} 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, ${T.glowB} 0%, transparent 50%)` }} />

        {/* Decorative rings */}
        {[{ size: 280, top: '-60px', right: '-60px', op: 0.1 }, { size: 160, top: '-20px', right: '-20px', op: 0.16 }, { size: 360, bottom: '-80px', left: '-80px', op: 0.07 }].map((r, i) => (
          <div key={i} style={{
            position: 'fixed', top: (r as any).top, right: (r as any).right, bottom: (r as any).bottom, left: (r as any).left,
            width: r.size, height: r.size, borderRadius: '50%',
            border: `1.5px solid ${T.ring}${r.op})`,
            pointerEvents: 'none', zIndex: 0,
          }} />
        ))}

        {/* Theme toggle */}
        <button className="ff-toggle" onClick={toggleTheme} style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', background: T.toggleBg,
          border: `1px solid ${T.toggleBorder}`, borderRadius: '20px',
          color: T.toggleColor, fontSize: '11px', fontWeight: 600,
          fontFamily: "'Georgia',serif", letterSpacing: '0.05em',
          cursor: 'pointer', boxShadow: T.toggleShadow,
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontSize: '13px' }}>{isDark ? '☀️' : '🌙'}</span>
          {isDark ? 'Modo claro' : 'Modo oscuro'}
        </button>

        {/* CARD WRAPPER */}
        <div className="ff-card" style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '820px',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          borderRadius: '12px',
          boxShadow: T.wrapperShadow,
          overflow: 'hidden',
          transition: 'box-shadow 0.35s ease',
        }}>

          {/* LEFT PANEL */}
          <aside style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: T.leftBg,
            borderRight: `1px solid ${T.leftBorder}`,
            padding: '52px 32px', gap: '22px',
            transition: 'background 0.35s ease',
          }}>
            {/* Logo */}
            <div style={{
              width: '72px', height: '72px',
              background: T.logoBg, border: `1px solid ${T.logoBorder}`,
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 20px ${T.logoColor}25`,
            }}>
              <IconWrench color={T.logoColor} size={30} />
            </div>

            {/* Brand name */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: T.title, fontSize: '22px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                Ferred
              </h2>
              <p style={{ marginTop: '5px', color: T.subtitle, fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
                Ferretería &amp; Suministros
              </p>
            </div>

            {/* Divider */}
            <div style={{ width: '36px', height: '1px', background: `linear-gradient(90deg,transparent,${T.dividerColor},transparent)` }} />

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {INFO_ITEMS.map(({ Icon, title, desc }) => (
                <div key={title} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px',
                  background: T.itemBg, border: `1px solid ${T.itemBorder}`,
                  borderRadius: '8px',
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '6px',
                    background: T.itemIconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon color={T.itemIcon} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: T.itemTitle, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {title}
                    </div>
                    <div style={{ fontSize: '10px', color: T.itemDesc, marginTop: '2px', fontStyle: 'italic' }}>
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 'auto', fontSize: '10px', color: T.footer, letterSpacing: '0.1em', textAlign: 'center' }}>
              © 2026 Ferred · v2.4
            </p>
          </aside>

          {/* RIGHT CARD */}
          <main style={{
            background: T.cardBg, display: 'flex', flexDirection: 'column',
            borderRadius: '0 12px 12px 0', overflow: 'hidden',
            transition: 'background 0.35s ease',
          }}>
            {/* Top accent bar */}
            <div style={{ height: '3px', background: T.accentBar, flexShrink: 0 }} />

            <form onSubmit={handleSubmit} style={{ padding: '44px 48px', flex: 1 }}>
              {/* Section label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                <div style={{ flex: 1, height: '1px', background: T.sectionLabel, opacity: 0.35 }} />
                <span style={{ fontSize: '9px', color: T.sectionLabel, letterSpacing: '0.22em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Acceso al sistema
                </span>
                <div style={{ flex: 1, height: '1px', background: T.sectionLabel, opacity: 0.35 }} />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  marginBottom: '20px', padding: '10px 14px',
                  background: T.errorBg, border: `1px solid ${T.errorBorder}`,
                  borderRadius: '6px', color: T.errorColor,
                  fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                  animation: 'shake 0.3s ease',
                }}>
                  <span>⚠</span> {error}
                </div>
              )}

              {/* Email */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.label, fontWeight: 600, marginBottom: '8px' }}>
                  Correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <IconMail color={focused === 'email' ? T.iconFocus : T.iconDefault} />
                  </span>
                  <input
                    type="email" value={email}
                    onChange={e => { setError(null); setEmail(e.target.value); }}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    placeholder="usuario@ferred.com"
                    style={inputStyle('email')}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.label, fontWeight: 600, marginBottom: '8px' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <IconLock color={focused === 'password' ? T.iconFocus : T.iconDefault} />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => { setError(null); setPassword(e.target.value); }}
                    onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                    placeholder="••••••••••"
                    style={inputStyle('password')}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px', opacity: 0.6, display: 'flex', alignItems: 'center',
                  }}>
                    {showPass ? <IconEyeOff color={T.eyeColor} /> : <IconEyeOn color={T.eyeColor} />}
                  </button>
                </div>
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  <a href="#" className="ff-forgot" style={{ fontSize: '11px', color: T.forgotColor, textDecoration: 'none', fontStyle: 'italic' }}>
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" className="ff-btn" disabled={loading} style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(0,0,0,0.1)' : T.btnBg,
                border: '1px solid transparent',
                borderRadius: '6px',
                color: loading ? 'var(--text-subtle)' : T.btnColor,
                fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                fontFamily: "'Georgia',serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : T.btnShadow,
              }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '13px', height: '13px', border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.spinnerColor, borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
                    Verificando...
                  </span>
                ) : 'Iniciar sesión'}
              </button>
            </form>

            {/* Footer */}
            <footer style={{
              padding: '12px 48px', borderTop: `1px solid ${T.footerBorder}`,
              background: T.footerBg, textAlign: 'center',
              fontSize: '9px', letterSpacing: '0.12em', color: T.footerColor,
              fontFamily: "'Georgia',serif", flexShrink: 0,
            }}>
              © 2026 Ferred — Sistema de Gestión v2.4
            </footer>

            {/* Bottom accent bar */}
            <div style={{ height: '2px', background: T.accentBar, flexShrink: 0 }} />
          </main>
        </div>
      </div>
    </>
  );
}