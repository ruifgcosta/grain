/**
 * Layout principal da aplicação grain.
 * Navbar no topo — hamburger menu (desktop + mobile) / bottom nav (mobile).
 */

import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/react';
import { Rss, BookmarkCheck, Settings, LogOut, LogIn, Shield, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function Layout({ children }: LayoutProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn, signOut } = useClerk();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { to: '/feed',    label: 'Feed',    icon: Rss },
    { to: '/follow',  label: 'Seguir',  icon: BookmarkCheck },
    { to: '/sources', label: 'Fontes',  icon: Settings },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center gap-2.5 focus:outline-none"
          >
            <img
              src={`${BASE}/logo.svg`}
              alt="grain"
              style={{ width: 32, height: 32, borderRadius: 7, display: 'block', flexShrink: 0 }}
            />
            <span className="font-display font-extrabold text-xl text-gold tracking-tight">grain</span>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Entrar button — only when signed out */}
            {isLoaded && !isSignedIn && (
              <button
                onClick={() => openSignIn()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gold border border-gold/30 hover:bg-gold-dim transition-colors"
              >
                <LogIn size={14} />
                Entrar
              </button>
            )}

            {/* Hamburger */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="p-2 rounded-lg text-muted hover:text-text hover:bg-bg3 transition-colors"
                aria-label="Menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-bg2 border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                  {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          isActive
                            ? 'text-gold bg-gold-dim'
                            : 'text-text hover:bg-bg3'
                        }`
                      }
                    >
                      <Icon size={15} className="flex-shrink-0" />
                      {label}
                    </NavLink>
                  ))}

                  {isLoaded && isSignedIn && (
                    <>
                      <div className="border-t border-border mx-3 my-1" />
                      <NavLink
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                            isActive ? 'text-gold bg-gold-dim' : 'text-muted hover:text-text hover:bg-bg3'
                          }`
                        }
                      >
                        <Shield size={15} className="flex-shrink-0" />
                        Admin
                      </NavLink>
                      <button
                        onClick={() => { setMenuOpen(false); signOut(() => navigate('/')); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted hover:text-text hover:bg-bg3 transition-colors"
                      >
                        <LogOut size={15} className="flex-shrink-0" />
                        Sair
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
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
