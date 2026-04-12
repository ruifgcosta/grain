/**
 * Layout principal da aplicação grain.
 * Navbar no topo (desktop) / bottom (mobile).
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/react';
import { Rss, BookmarkCheck, Settings, LogOut, LogIn, Shield } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn, signOut } = useClerk();
  const navigate = useNavigate();

  const navItems = [
    { to: '/feed',    label: 'Feed',    icon: Rss },
    { to: '/follow',  label: 'Follow',  icon: BookmarkCheck },
    { to: '/sources', label: 'Fontes',  icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center gap-2 font-display font-extrabold text-xl text-gold tracking-tight"
          >
            <img src="/favicon.svg" alt="grain" className="w-6 h-6" />
            grain
          </button>

          {/* Links de navegação — desktop */}
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'text-gold bg-gold-dim'
                      : 'text-muted hover:text-text hover:bg-bg3'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {isLoaded && isSignedIn && (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `p-2 rounded-lg text-muted transition-colors hover:text-text hover:bg-bg3 ${
                      isActive ? 'text-gold' : ''
                    }`
                  }
                  title="Admin"
                >
                  <Shield size={16} />
                </NavLink>
                <button
                  onClick={() => signOut(() => navigate('/'))}
                  className="p-2 rounded-lg text-muted hover:text-text hover:bg-bg3 transition-colors"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
            {isLoaded && !isSignedIn && (
              <button
                onClick={() => openSignIn()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gold border border-gold/30 hover:bg-gold-dim transition-colors"
              >
                <LogIn size={14} />
                Entrar
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Conteúdo ── */}
      <main className="pt-14 pb-20 sm:pb-0">
        {children}
      </main>

      {/* ── Bottom nav — mobile only ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg/95 backdrop-blur-sm">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                  isActive ? 'text-gold' : 'text-muted'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
