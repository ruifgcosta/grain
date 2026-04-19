/**
 * UpdateBanner — aparece quando há uma nova versão da PWA disponível.
 * Usa o hook useRegisterSW do Vite PWA para detectar updates.
 *
 * Fluxo:
 * 1. Service worker detecta nova versão e fica em waiting
 * 2. needRefresh = true → banner aparece no fundo
 * 3. Utilizador clica "Atualizar" → updateSW() → SW activa → página recarrega
 * 4. Ou ignora → banner fecha, update fica pendente até próximo arranque
 */

import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // Verificar actualizações a cada hora (para apps que ficam abertas muito tempo)
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,           // acima do bottom nav mobile (64px) com margem
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 14,
        background: '#1a1a1a',
        border: '1px solid #2e2e2e',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100vw - 32px)',
      }}
      role="alert"
    >
      <RefreshCw size={14} style={{ color: '#c8a96e', flexShrink: 0 }} />

      <span style={{ fontSize: 13, color: '#f0ece4' }}>
        Nova versão disponível
      </span>

      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#0a0a0a',
          background: '#c8a96e',
          border: 'none',
          borderRadius: 8,
          padding: '4px 10px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Atualizar
      </button>

      <button
        onClick={() => setNeedRefresh(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          padding: 2,
          flexShrink: 0,
        }}
        aria-label="Ignorar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
