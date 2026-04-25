import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error no controlado en la aplicacion:', error, errorInfo);
  }

  private readonly handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'var(--bg-base, #f6f7fb)',
            color: 'var(--text-primary, #111827)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '16px',
              border: '1px solid rgba(239,68,68,0.18)',
              background: 'var(--bg-surface, #ffffff)',
              boxShadow: '0 18px 44px rgba(15,23,42,0.10)',
              padding: '28px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(239,68,68,0.12)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              !
            </div>
            <h1 style={{ margin: '18px 0 8px', fontSize: '22px', fontWeight: 800 }}>
              Ocurrio un error inesperado
            </h1>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-muted, #6b7280)' }}>
              La aplicacion encontro un problema y no pudo seguir renderizando esta vista. Puedes recargar para
              intentar continuar.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                marginTop: '22px',
                height: '42px',
                minWidth: '148px',
                border: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent, #2563eb), var(--accent-hover, #1d4ed8))',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Recargar aplicacion
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
