/**
 * Página Landing — apresentação pública do grain.
 * Implementada em detalhe no Passo 4.1.
 *
 * Por agora: componente de teste de autenticação Clerk.
 * Mostra o botão de login e, após autenticação, testa o /api/me.
 */

import { useAuth, useUser, SignInButton, SignOutButton } from '@clerk/react';
import { useEffect, useState } from 'react';

export default function Landing() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [apiResult, setApiResult] = useState<string>('—');

  // Quando o utilizador autentica, testa o endpoint /api/me
  useEffect(() => {
    if (!isSignedIn) return;

    const testAuth = async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setApiResult(JSON.stringify(data, null, 2));
      } catch (err) {
        setApiResult(`Erro: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    testAuth();
  }, [isSignedIn, getToken]);

  if (!isLoaded) {
    return (
      <div style={{ padding: '40px', color: '#555', fontFamily: 'DM Sans, sans-serif' }}>
        A carregar...
      </div>
    );
  }

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'DM Sans, sans-serif',
      color: '#f0ece4',
      background: '#0a0a0a',
      minHeight: '100vh',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '32px',
          color: '#f5f0e8',
          letterSpacing: '-1px',
          marginBottom: '4px',
        }}>
          grain
        </h1>
        <p style={{ color: '#c8a96e', fontSize: '12px', fontStyle: 'italic' }}>
          no noise, only grain
        </p>
      </div>

      {/* Estado de autenticação */}
      <div style={{
        background: '#111',
        border: '0.5px solid #1e1e1e',
        borderRadius: '14px',
        padding: '20px',
        maxWidth: '480px',
      }}>
        <p style={{ color: '#555', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
          Passo 1.4 — Teste de autenticação Clerk
        </p>

        {isSignedIn ? (
          <>
            <p style={{ color: '#7ab832', fontSize: '13px', marginBottom: '8px' }}>
              ✓ Autenticado como {user?.primaryEmailAddress?.emailAddress}
            </p>
            <p style={{ color: '#555', fontSize: '11px', marginBottom: '16px' }}>
              ID: {user?.id}
            </p>

            <p style={{ color: '#555', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
              Resposta do /api/me:
            </p>
            <pre style={{
              background: '#0e1a09',
              border: '0.5px solid #2a4a18',
              borderRadius: '8px',
              padding: '12px',
              color: '#7ab832',
              fontSize: '12px',
              marginBottom: '16px',
              whiteSpace: 'pre-wrap',
            }}>
              {apiResult}
            </pre>

            <SignOutButton>
              <button style={{
                background: 'transparent',
                border: '0.5px solid #2a2a2a',
                borderRadius: '100px',
                color: '#555',
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Sair
              </button>
            </SignOutButton>
          </>
        ) : (
          <>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '16px' }}>
              Não estás autenticado.
            </p>
            <SignInButton mode="modal">
              <button style={{
                background: '#c8a96e',
                border: 'none',
                borderRadius: '100px',
                color: '#0a0a0a',
                padding: '10px 20px',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
              }}>
                Entrar
              </button>
            </SignInButton>
          </>
        )}
      </div>
    </div>
  );
}
