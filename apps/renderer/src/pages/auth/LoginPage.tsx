import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { api } from '../../services/api.client';
import styles from './LoginPage.module.css';

const IconMail = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconLock = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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
const IconTag = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>
  </svg>
);

const INFO_ITEMS = [
  { Icon: IconTag,  title: 'Inventario', desc: 'Gestion en tiempo real' },
  { Icon: IconBox,  title: 'Productos',  desc: 'Catalogo completo' },
  { Icon: IconCart,  title: 'Ventas',     desc: 'Control de pedidos' },
];

export default function LoginPage() {
  const navigate    = useNavigate();
  const { setAuth } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [focused,  setFocused]  = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Completa todos los campos para continuar.'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.usuario, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Correo o contrasena incorrectos.');
    } finally { setLoading(false); }
  }

  const themeClass = isDark ? undefined : styles.light;
  const iconColor = (field: string) => focused === field ? 'var(--lp-icon-focus)' : 'var(--lp-icon-default)';

  return (
    <div className={`${styles.page} ${themeClass ?? ''}`}>
      <div className={styles.ambientGlow} />

      <button className={styles.themeToggle} onClick={toggleTheme}>
        <span style={{ fontSize: '13px' }}>{isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}</span>
        <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
      </button>

      <div className={styles.card}>
        {/* LEFT PANEL */}
        <aside className={styles.leftPanel}>
          <div className={styles.logoBox}>
            <IconWrench color="var(--lp-logo-color)" size={30} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 className={styles.brandTitle}>Ferred</h2>
            <p className={styles.brandSubtitle}>Ferreteria &amp; Suministros</p>
          </div>
          <div className={styles.divider} />
          <div className={styles.infoList}>
            {INFO_ITEMS.map(({ Icon, title, desc }) => (
              <div key={title} className={styles.infoItem}>
                <div className={styles.infoItemIcon}>
                  <Icon color="var(--lp-item-icon)" />
                </div>
                <div>
                  <div className={styles.infoItemTitle}>{title}</div>
                  <div className={styles.infoItemDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.leftFooter}>&copy; 2026 Ferred &middot; v2.4</p>
        </aside>

        {/* RIGHT — form */}
        <main className={styles.rightPanel}>
          <div className={styles.accentBar} />

          <form onSubmit={handleSubmit} className={styles.formPad}>
            {/* Mini brand — solo visible en movil */}
            <div className={styles.mobileBrand}>
              <div className={styles.mobileLogo}>
                <IconWrench color="var(--lp-logo-color)" size={22} />
              </div>
              <div>
                <h2 className={styles.mobileBrandTitle}>Ferred</h2>
                <p className={styles.mobileBrandSub}>Ferreteria &amp; Suministros</p>
              </div>
            </div>

            {/* Section label */}
            <div className={styles.sectionLabel}>
              <div className={styles.sectionLine} />
              <span className={styles.sectionText}>Acceso al sistema</span>
              <div className={styles.sectionLine} />
            </div>

            {error && (
              <div className={styles.errorBox}>
                <span>&#9888;</span> {error}
              </div>
            )}

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Correo electronico</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <IconMail color={iconColor('email')} />
                </span>
                <input type="email" value={email}
                  onChange={e => { setError(null); setEmail(e.target.value); }}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  placeholder="usuario@ferred.com"
                  className={styles.input} />
              </div>
            </div>

            {/* Password */}
            <div className={styles.fieldGroupLast}>
              <label className={styles.fieldLabel}>Contrasena</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <IconLock color={iconColor('password')} />
                </span>
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => { setError(null); setPassword(e.target.value); }}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  placeholder="••••••••••"
                  className={styles.inputPassword} />
                <button type="button" onClick={() => setShowPass(s => !s)} className={styles.eyeBtn}>
                  {showPass ? <IconEyeOff color="var(--lp-eye-color)" /> : <IconEyeOn color="var(--lp-eye-color)" />}
                </button>
              </div>
              <div className={styles.forgotRow}>
                <a href="#" className={styles.forgotLink}>
                  Olvidaste tu contrasena?
                </a>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <span className={styles.spinnerWrap}>
                  <span className={styles.spinner} />
                  Verificando...
                </span>
              ) : 'Iniciar sesion'}
            </button>
          </form>

          <footer className={styles.pageFooter}>
            &copy; 2026 Ferred — Sistema de Gestion v1.2.1
          </footer>
          <div className={styles.accentBar} />
        </main>
      </div>
    </div>
  );
}
