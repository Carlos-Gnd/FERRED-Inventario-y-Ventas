import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../store/authStore";

interface LoginForm {
  email: string;
  password: string;
}

// ─────────────────────────────────────────────
//  TOKENS DE DISEÑO
// ─────────────────────────────────────────────
const LIGHT = {
  pageBg:           "#EDE8DF",
  wrapperShadow:    "0 32px 64px rgba(100,70,20,0.18), 0 0 0 1px rgba(180,130,50,0.14)",
  wrapperRadius:    "12px",

  leftBg:           "linear-gradient(170deg, #E8E2D6 0%, #D8CEBC 100%)",
  leftBorder:       "rgba(160,120,50,0.2)",
  leftLogoBg:       "#FFFFFF",
  leftLogoBorder:   "rgba(200,150,60,0.3)",
  leftLogoShadow:   "0 4px 16px rgba(180,120,30,0.12)",
  leftLogoColor:    "#B87820",
  leftTitle:        "#2C1A06",
  leftSubtitle:     "rgba(80,50,15,0.5)",
  leftSep:          "rgba(160,110,30,0.25)",
  leftItemBg:       "rgba(255,255,255,0.5)",
  leftItemBorder:   "rgba(180,130,40,0.15)",
  leftItemIconBg:   "rgba(212,130,10,0.08)",
  leftItemIcon:     "#B87820",
  leftItemTitle:    "#3D2209",
  leftItemDesc:     "rgba(80,50,15,0.45)",
  leftFooter:       "rgba(80,50,15,0.3)",

  cardBg:           "#FDFAF5",
  cardBorder:       "rgba(180,130,50,0.15)",
  accentBar:        "linear-gradient(90deg, #E8A020, #F0C040, #E8A020)",

  sectionLabel:     "rgba(100,65,15,0.5)",
  label:            "#6B4010",

  iconDefault:      "rgba(160,110,40,0.35)",
  iconFocus:        "#D4820A",

  inputBg:          "#FFFFFF",
  inputBorder:      "rgba(180,130,50,0.25)",
  inputBorderFocus: "#D4820A",
  inputRing:        "rgba(212,130,10,0.1)",
  inputColor:       "#1C1005",

  eyeColor:         "#C07010",
  forgotColor:      "#C07010",

  btnBg:            "linear-gradient(135deg, #E8A020 0%, #D4820A 100%)",
  btnColor:         "#FFFFFF",
  btnShadow:        "0 4px 16px rgba(212,130,10,0.35)",
  btnHoverShadow:   "0 6px 24px rgba(212,130,10,0.45)",
  btnRadius:        "6px",
  btnLoadingBg:     "rgba(212,130,10,0.1)",
  btnLoadingColor:  "rgba(100,65,15,0.4)",
  btnLoadingBorder: "rgba(212,130,10,0.2)",
  spinnerColor:     "#D4820A",
  spinnerTrack:     "rgba(100,65,15,0.1)",

  errorBg:          "rgba(200,40,30,0.06)",
  errorBorder:      "rgba(200,40,30,0.25)",
  errorColor:       "#B91C1C",

  footerBg:         "rgba(230,180,60,0.04)",
  footerBorder:     "rgba(180,130,50,0.12)",
  footerColor:      "rgba(100,65,15,0.35)",

  toggleBg:         "rgba(255,255,255,0.85)",
  toggleBorder:     "rgba(180,130,50,0.25)",
  toggleColor:      "#6B4010",
  toggleShadow:     "0 2px 10px rgba(120,80,20,0.12)",

  ring:             "rgba(180,130,50,",
  glowA:            "rgba(224,160,32,0.06)",
  glowB:            "rgba(245,200,66,0.05)",
};

const DARK = {
  pageBg:           "#0B1221",
  wrapperShadow:    "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)",
  wrapperRadius:    "12px",

  leftBg:           "linear-gradient(170deg, #131F35 0%, #0F1A2E 100%)",
  leftBorder:       "rgba(59,130,246,0.1)",
  leftLogoBg:       "rgba(16,185,129,0.1)",
  leftLogoBorder:   "rgba(16,185,129,0.3)",
  leftLogoShadow:   "0 4px 20px rgba(16,185,129,0.15)",
  leftLogoColor:    "#10B981",
  leftTitle:        "#F0F6FF",
  leftSubtitle:     "rgba(148,163,184,0.45)",
  leftSep:          "rgba(59,130,246,0.2)",
  leftItemBg:       "rgba(59,130,246,0.05)",
  leftItemBorder:   "rgba(59,130,246,0.08)",
  leftItemIconBg:   "rgba(16,185,129,0.08)",
  leftItemIcon:     "#10B981",
  leftItemTitle:    "#10B981",
  leftItemDesc:     "rgba(148,163,184,0.38)",
  leftFooter:       "rgba(148,163,184,0.22)",

  cardBg:           "#162032",
  cardBorder:       "rgba(59,130,246,0.12)",
  accentBar:        "linear-gradient(90deg, #3B82F6, #10B981, #3B82F6)",

  sectionLabel:     "rgba(148,163,184,0.4)",
  label:            "rgba(148,163,184,0.55)",

  iconDefault:      "rgba(148,163,184,0.3)",
  iconFocus:        "#3B82F6",

  inputBg:          "rgba(10,18,36,0.6)",
  inputBorder:      "rgba(59,130,246,0.1)",
  inputBorderFocus: "rgba(59,130,246,0.55)",
  inputRing:        "rgba(59,130,246,0.08)",
  inputColor:       "#EFF6FF",

  eyeColor:         "#3B82F6",
  forgotColor:      "rgba(59,130,246,0.65)",

  btnBg:            "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  btnColor:         "#FFFFFF",
  btnShadow:        "0 4px 18px rgba(16,185,129,0.3)",
  btnHoverShadow:   "0 6px 26px rgba(16,185,129,0.4)",
  btnRadius:        "6px",
  btnLoadingBg:     "rgba(16,185,129,0.12)",
  btnLoadingColor:  "rgba(16,185,129,0.4)",
  btnLoadingBorder: "rgba(16,185,129,0.15)",
  spinnerColor:     "#10B981",
  spinnerTrack:     "rgba(255,255,255,0.1)",

  errorBg:          "rgba(220,38,38,0.08)",
  errorBorder:      "rgba(220,38,38,0.25)",
  errorColor:       "#F87171",

  footerBg:         "rgba(0,0,0,0.15)",
  footerBorder:     "rgba(59,130,246,0.07)",
  footerColor:      "rgba(148,163,184,0.25)",

  toggleBg:         "rgba(22,32,50,0.95)",
  toggleBorder:     "rgba(59,130,246,0.25)",
  toggleColor:      "#94A3B8",
  toggleShadow:     "0 2px 10px rgba(0,0,0,0.3)",

  ring:             "rgba(59,130,246,",
  glowA:            "rgba(59,130,246,0.06)",
  glowB:            "rgba(16,185,129,0.04)",
};

// ─────────────────────────────────────────────
//  ÍCONOS SVG (sin dependencias externas)
// ─────────────────────────────────────────────
const IconMail = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const IconLock = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEyeOn = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEyeOff = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

const IconWrench = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconBox = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
);

const IconCart = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  </svg>
);

const FerredLogo = ({ color, size = 28 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

// ─────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function LoginFerreteria() {
  const [form, setForm]               = useState<LoginForm>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [focused, setFocused]         = useState<string | null>(null);
  const [isMobile, setIsMobile]       = useState(false);
  const [isDesktop, setIsDesktop]     = useState(false);
  const [isDark, setIsDark]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const navigate = useNavigate();
  const T = isDark ? DARK : LIGHT;

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 500);
      setIsDesktop(window.innerWidth >= 860);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleChange = (field: keyof LoginForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setForm(f => ({ ...f, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Completá todos los campos para continuar.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post("http://localhost:3001/api/auth/login", {
        email: form.email,
        password: form.password,
      });
      useAuthStore.getState().setToken(data.token);
      useAuthStore.getState().setUser(data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  const px = isMobile ? "24px" : "48px";
  const py = isMobile ? "32px" : "44px";

  const INFO_ITEMS = [
    { Icon: IconWrench, title: "Inventario", desc: "Gestión en tiempo real" },
    { Icon: IconBox,    title: "Productos",  desc: "Catálogo completo"     },
    { Icon: IconCart,   title: "Ventas",     desc: "Control de pedidos"    },
  ];

  // ── Estilos compartidos de input ──────────────
  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    padding: field === "password" ? "12px 44px 12px 40px" : "12px 14px 12px 40px",
    background: T.inputBg,
    border: `1px solid ${focused === field ? T.inputBorderFocus : T.inputBorder}`,
    borderRadius: "6px",
    color: T.inputColor,
    fontSize: isMobile ? "16px" : "13.5px",
    fontFamily: "'Georgia', serif",
    outline: "none",
    boxShadow: focused === field ? `0 0 0 3px ${T.inputRing}` : "none",
    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
  });

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; height: 100%; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-5px); }
          40%     { transform: translateX(5px); }
          60%     { transform: translateX(-3px); }
          80%     { transform: translateX(3px); }
        }

        .ff-card        { animation: fadeUp 0.42s cubic-bezier(.22,.68,0,1.15) both; }
        .ff-error       { animation: shake 0.3s ease; }
        .ff-toggle      { transition: all 0.2s ease; }
        .ff-toggle:hover{ filter: brightness(1.08); transform: scale(1.03); }
        .ff-submit      { transition: all 0.18s ease; }
        .ff-submit:hover:not(:disabled) {
          filter: brightness(1.06);
          transform: translateY(-1px);
        }
        .ff-submit:active:not(:disabled) { transform: translateY(0); }
        .ff-forgot { transition: opacity 0.15s ease; opacity: 0.72; }
        .ff-forgot:hover { opacity: 1; text-decoration: underline; }
        .ff-item { transition: background 0.18s ease; cursor: default; }
      `}</style>

      {/* ── PÁGINA ──────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0,
        background: T.pageBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        padding: isMobile ? "16px" : "24px",
        overflow: "auto",
        transition: "background 0.35s ease",
      }}>

        {/* Ambient glows */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: `
            radial-gradient(ellipse at 20% 60%, ${T.glowA} 0%, transparent 55%),
            radial-gradient(ellipse at 80% 20%, ${T.glowB} 0%, transparent 50%)
          `,
          transition: "background 0.35s ease",
        }} />

        {/* Rings decorativos */}
        {[
          { size: 280, top: "-60px",  right: "-60px",  op: 0.1  },
          { size: 160, top: "-20px",  right: "-20px",  op: 0.16 },
          { size: 360, bottom: "-80px", left: "-80px", op: 0.07 },
        ].map((r, i) => (
          <div key={i} style={{
            position: "fixed",
            top: (r as any).top, right: (r as any).right,
            bottom: (r as any).bottom, left: (r as any).left,
            width: r.size, height: r.size, borderRadius: "50%",
            border: `1.5px solid ${T.ring}${r.op})`,
            pointerEvents: "none", zIndex: 0,
            transition: "border-color 0.35s ease",
          }} />
        ))}

        {/* ── TOGGLE CLARO / OSCURO ──────────────────── */}
        <button
          className="ff-toggle"
          onClick={() => setIsDark(d => !d)}
          style={{
            position: "fixed", top: "16px", right: "16px", zIndex: 100,
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 14px",
            background: T.toggleBg,
            border: `1px solid ${T.toggleBorder}`,
            borderRadius: "20px",
            color: T.toggleColor,
            fontSize: "11px",
            fontFamily: "'Georgia', serif",
            fontWeight: 600,
            letterSpacing: "0.05em",
            cursor: "pointer",
            boxShadow: T.toggleShadow,
            backdropFilter: "blur(12px)",
          }}
        >
          <span style={{ fontSize: "13px" }}>{isDark ? "☀️" : "🌙"}</span>
          {isDark ? "Modo claro" : "Modo oscuro"}
        </button>

        {/* ── WRAPPER PRINCIPAL ──────────────────────── */}
        <div
          className="ff-card"
          style={{
            position: "relative", zIndex: 1,
            width: "100%",
            maxWidth: isDesktop ? "820px" : "420px",
            display: isDesktop ? "grid" : "flex",
            gridTemplateColumns: isDesktop ? "1fr 1fr" : undefined,
            flexDirection: "column",
            borderRadius: T.wrapperRadius,
            boxShadow: T.wrapperShadow,
            overflow: "hidden",
            transition: "box-shadow 0.35s ease",
          }}
        >

          {/* ── PANEL IZQUIERDO ────────────────────── */}
          {isDesktop && (
            <aside style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: T.leftBg,
              borderRight: `1px solid ${T.leftBorder}`,
              padding: "52px 32px",
              gap: "22px",
              transition: "background 0.35s ease",
            }}>
              {/* Logo */}
              <div style={{
                width: "70px", height: "70px",
                background: T.leftLogoBg,
                border: `1px solid ${T.leftLogoBorder}`,
                borderRadius: "14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: T.leftLogoShadow,
                flexShrink: 0,
                transition: "all 0.35s ease",
              }}>
                <FerredLogo color={T.leftLogoColor} size={30} />
              </div>

              {/* Nombre */}
              <div style={{ textAlign: "center" }}>
                <h2 style={{
                  color: T.leftTitle, fontSize: "22px", fontWeight: 700,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  transition: "color 0.35s ease",
                }}>
                  Ferred
                </h2>
                <p style={{
                  marginTop: "5px", color: T.leftSubtitle,
                  fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase",
                  transition: "color 0.35s ease",
                }}>
                  Ferretería & Suministros
                </p>
              </div>

              {/* Separador */}
              <div style={{
                width: "36px", height: "1px",
                background: `linear-gradient(90deg, transparent, ${T.leftSep}, transparent)`,
              }} />

              {/* Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                {INFO_ITEMS.map(({ Icon, title, desc }) => (
                  <div key={title} className="ff-item" style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 14px",
                    background: T.leftItemBg,
                    border: `1px solid ${T.leftItemBorder}`,
                    borderRadius: "8px",
                  }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "6px",
                      background: T.leftItemIconBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Icon color={T.leftItemIcon} />
                    </div>
                    <div>
                      <div style={{
                        fontSize: "11px", color: T.leftItemTitle,
                        fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                        transition: "color 0.35s ease",
                      }}>{title}</div>
                      <div style={{
                        fontSize: "10px", color: T.leftItemDesc,
                        marginTop: "2px", fontStyle: "italic",
                        transition: "color 0.35s ease",
                      }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{
                marginTop: "auto", fontSize: "10px",
                color: T.leftFooter, letterSpacing: "0.1em", textAlign: "center",
                transition: "color 0.35s ease",
              }}>
                © 2026 Ferred · v2.4
              </p>
            </aside>
          )}

          {/* ── CARD DERECHA ───────────────────────── */}
          <main style={{
            background: T.cardBg,
            borderLeft: isDesktop ? "none" : undefined,
            borderRadius: isDesktop
              ? `0 ${T.wrapperRadius} ${T.wrapperRadius} 0`
              : T.wrapperRadius,
            overflow: "hidden",
            display: "flex", flexDirection: "column",
            transition: "background 0.35s ease",
          }}>
            {/* Barra superior */}
            <div style={{ height: "3px", background: T.accentBar, flexShrink: 0 }} />

            <div style={{ padding: `${py} ${px}`, flex: 1 }}>

              {/* Logo mobile */}
              {!isDesktop && (
                <div style={{ textAlign: "center", marginBottom: isMobile ? "28px" : "36px" }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "60px", height: "60px",
                    background: T.leftLogoBg,
                    border: `1px solid ${T.leftLogoBorder}`,
                    borderRadius: "12px",
                    marginBottom: "14px",
                    boxShadow: T.leftLogoShadow,
                  }}>
                    <FerredLogo color={T.leftLogoColor} size={26} />
                  </div>
                  <h1 style={{
                    fontSize: "20px", fontWeight: 700, letterSpacing: "0.16em",
                    color: T.leftTitle, textTransform: "uppercase",
                    transition: "color 0.35s ease",
                  }}>Ferred</h1>
                  <p style={{
                    marginTop: "4px", fontSize: "9px", letterSpacing: "0.24em",
                    color: T.leftSubtitle, textTransform: "uppercase",
                    transition: "color 0.35s ease",
                  }}>Ferretería & Suministros</p>
                </div>
              )}

              {/* Sección "Acceso al sistema" */}
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                marginBottom: isMobile ? "24px" : "32px",
              }}>
                <div style={{ flex: 1, height: "1px", background: T.sectionLabel, opacity: 0.35 }} />
                <span style={{
                  fontSize: "9px", color: T.sectionLabel,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  whiteSpace: "nowrap", transition: "color 0.35s ease",
                }}>
                  Acceso al sistema
                </span>
                <div style={{ flex: 1, height: "1px", background: T.sectionLabel, opacity: 0.35 }} />
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="ff-error" style={{
                  marginBottom: "20px",
                  padding: "10px 14px",
                  background: T.errorBg,
                  border: `1px solid ${T.errorBorder}`,
                  borderRadius: "6px",
                  color: T.errorColor,
                  fontSize: "12px",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <span>⚠</span> {error}
                </div>
              )}

              {/* Campo email */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{
                  display: "block", fontSize: "9px", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: T.label,
                  fontWeight: 600, marginBottom: "8px",
                  transition: "color 0.35s ease",
                }}>
                  Correo electrónico
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: "13px", top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                    transition: "color 0.18s ease",
                  }}>
                    <IconMail color={focused === "email" ? T.iconFocus : T.iconDefault} />
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    placeholder="usuario@ferred.com"
                    style={inputStyle("email")}
                  />
                </div>
              </div>

              {/* Campo contraseña */}
              <div style={{ marginBottom: isMobile ? "28px" : "32px" }}>
                <label style={{
                  display: "block", fontSize: "9px", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: T.label,
                  fontWeight: 600, marginBottom: "8px",
                  transition: "color 0.35s ease",
                }}>
                  Contraseña
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: "13px", top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                    transition: "color 0.18s ease",
                  }}>
                    <IconLock color={focused === "password" ? T.iconFocus : T.iconDefault} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange("password")}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                    placeholder="••••••••••"
                    style={inputStyle("password")}
                  />
                  <button
                    onClick={() => setShowPassword(s => !s)}
                    style={{
                      position: "absolute", right: "11px", top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      padding: "4px", opacity: 0.55,
                      display: "flex", alignItems: "center",
                    }}
                  >
                    {showPassword
                      ? <IconEyeOff color={T.eyeColor} />
                      : <IconEyeOn  color={T.eyeColor} />}
                  </button>
                </div>
                <div style={{ textAlign: "right", marginTop: "8px" }}>
                  <a href="#" className="ff-forgot" style={{
                    fontSize: "11px", color: T.forgotColor,
                    textDecoration: "none", fontStyle: "italic",
                  }}>
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>

              {/* Botón */}
              <button
                className="ff-submit"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: loading ? T.btnLoadingBg : T.btnBg,
                  border: `1px solid ${loading ? T.btnLoadingBorder : "transparent"}`,
                  borderRadius: T.btnRadius,
                  color: loading ? T.btnLoadingColor : T.btnColor,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontFamily: "'Georgia', serif",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : T.btnShadow,
                }}
              >
                {loading ? (
                  <span style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: "8px",
                  }}>
                    <span style={{
                      display: "inline-block", width: "13px", height: "13px",
                      border: `2px solid ${T.spinnerTrack}`,
                      borderTopColor: T.spinnerColor,
                      borderRadius: "50%",
                      animation: "spin 0.75s linear infinite",
                    }} />
                    Verificando...
                  </span>
                ) : "Iniciar sesión"}
              </button>
            </div>

            {/* Footer */}
            <footer style={{
              padding: `12px ${px}`,
              borderTop: `1px solid ${T.footerBorder}`,
              background: T.footerBg,
              textAlign: "center",
              fontSize: "9px",
              letterSpacing: "0.12em",
              color: T.footerColor,
              fontFamily: "'Georgia', serif",
              flexShrink: 0,
              transition: "all 0.35s ease",
            }}>
              © 2026 Ferred — Sistema de Gestión v2.4
            </footer>

            {/* Barra inferior */}
            <div style={{ height: "2px", background: T.accentBar, flexShrink: 0 }} />
          </main>
        </div>
      </div>
    </>
  );
}