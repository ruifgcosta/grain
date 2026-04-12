/**
 * Página Landing — apresentação pública do grain.
 * Dark-only, animações com Framer Motion + GSAP marquee.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/react';
import { motion, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import { Sparkles, BookmarkCheck, Rss, ArrowRight, Zap, Shield, Globe } from 'lucide-react';

// ─── Dados estáticos ───────────────────────────────────────────────────────────

const SOURCES = [
  { name: 'BBC News',         color: '#b80000' },
  { name: 'The Guardian',     color: '#005689' },
  { name: 'Público',          color: '#1a1aff' },
  { name: 'Observador',       color: '#e63329' },
  { name: 'Washington Post',  color: '#231f20' },
  { name: 'RTP Notícias',     color: '#009a44' },
  { name: 'Al Jazeera',       color: '#c8a96e' },
  { name: 'Ars Technica',     color: '#ff4e00' },
  { name: 'DW News',          color: '#c41e3a' },
  { name: 'NPR News',         color: '#4a90d9' },
  { name: 'Wired',            color: '#888' },
];

const FEATURES = [
  {
    icon: Rss,
    title: 'Fontes curadas',
    desc: 'Jornalismo de qualidade, seleccionado à mão. Sem clickbait, sem conteúdo viral.',
  },
  {
    icon: Sparkles,
    title: 'Resumos IA',
    desc: 'Gerados em PT Europeu pelo Gemini. On-demand — só quando queres, partilhados entre todos.',
  },
  {
    icon: BookmarkCheck,
    title: 'Seguir temas',
    desc: 'Define temas em linguagem natural. O grain encontra artigos correspondentes por semântica.',
  },
  {
    icon: Shield,
    title: 'Sem algoritmo',
    desc: 'Cronológico. Sem feed personalizado, sem bolha de filtro, sem manipulação de atenção.',
  },
  {
    icon: Globe,
    title: 'PT + EN',
    desc: 'Fontes em inglês traduzidas automaticamente para Português Europeu.',
  },
  {
    icon: Zap,
    title: 'Rápido e limpo',
    desc: 'PWA sem rastreadores, sem anúncios, sem cookies de terceiros.',
  },
];

// Artigos fictícios para o mockup do hero
const MOCK_ARTICLES = [
  { source: 'BBC News',        color: '#b80000', title: 'EU leaders reach historic climate agreement at Brussels summit', time: '2m' },
  { source: 'Público',         color: '#1a1aff', title: 'Portugal regista crescimento de 2,3% no primeiro trimestre', time: '8m' },
  { source: 'The Guardian',    color: '#005689', title: 'Scientists discover new approach to carbon capture technology', time: '15m' },
  { source: 'Observador',      color: '#e63329', title: 'Banco de Portugal alerta para riscos no mercado imobiliário', time: '23m' },
  { source: 'Washington Post', color: '#231f20', title: 'Congress passes bipartisan infrastructure bill after months of debate', time: '31m' },
  { source: 'RTP Notícias',    color: '#009a44', title: 'Seleção nacional apura-se para a fase final do campeonato', time: '45m' },
];

// ─── Componentes ───────────────────────────────────────────────────────────────

/** Marquee horizontal infinito com GSAP */
function Marquee({ items }: { items: typeof SOURCES }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const totalWidth = el.scrollWidth / 2;

    const tween = gsap.to(el, {
      x: -totalWidth,
      duration: 30,
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize(x => parseFloat(x) % totalWidth),
      },
    });

    return () => { tween.kill(); };
  }, []);

  // Duplicar para loop infinito seamless
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden w-full">
      <div ref={trackRef} className="flex gap-3 w-max">
        {doubled.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg2 flex-shrink-0"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-sm text-muted font-medium whitespace-nowrap">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card de artigo mockup para o hero */
function MockCard({
  article,
  delay,
}: {
  article: (typeof MOCK_ARTICLES)[0];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-2 p-3.5 rounded-xl border border-border bg-bg2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: article.color }} />
          <span className="text-xs text-muted font-medium">{article.source}</span>
        </div>
        <span className="text-xs text-muted">{article.time}</span>
      </div>
      <p className="text-sm font-semibold text-text leading-snug line-clamp-2">{article.title}</p>
      <div className="flex gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-bg border border-green-bdr">
          <Sparkles size={10} className="text-green" />
          <span className="text-[10px] text-green">Resumo IA</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gold-dim">
          <span className="text-[10px] text-gold">+ Seguir</span>
        </div>
      </div>
    </motion.div>
  );
}

/** Secção de feature individual */
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-3 p-5 rounded-2xl border border-border bg-bg2 hover:border-border2 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-bg3 border border-border flex items-center justify-center">
        <Icon size={16} className="text-gold" />
      </div>
      <h3 className="font-semibold text-text">{feature.title}</h3>
      <p className="text-sm text-muted leading-relaxed">{feature.desc}</p>
    </motion.div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  function handleCTA() {
    if (isSignedIn) {
      navigate('/feed');
    } else {
      openSignIn();
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text font-body overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display font-extrabold text-xl text-gold tracking-tight">grain</span>
          <div className="flex items-center gap-3">
            {isLoaded && (
              isSignedIn ? (
                <button
                  onClick={() => navigate('/feed')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm bg-gold text-bg font-semibold hover:bg-gold2 transition-colors"
                >
                  Abrir feed
                  <ArrowRight size={14} />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openSignIn()}
                    className="text-sm text-muted hover:text-text transition-colors"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => openSignIn()}
                    className="px-4 py-2 rounded-xl text-sm bg-gold text-bg font-semibold hover:bg-gold2 transition-colors"
                  >
                    Criar conta
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Texto */}
            <div className="flex flex-col gap-6">
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2"
              >
                <span className="flex gap-[3px]">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full bg-gold animate-[dot-pulse_1.4s_ease-in-out_infinite]"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </span>
                <span className="text-xs font-medium text-gold uppercase tracking-widest">
                  Notícias sem ruído
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-display font-extrabold text-5xl sm:text-6xl text-text leading-[1.05] tracking-tight"
              >
                O jornalismo
                <br />
                que importa,
                <br />
                <span className="text-gold">sem o resto.</span>
              </motion.h1>

              {/* Sub */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-base text-muted leading-relaxed max-w-md"
              >
                Agrega fontes de qualidade em PT e EN. Resumos IA on-demand.
                Segue temas por semântica. Sem algoritmos, sem anúncios.
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex flex-wrap items-center gap-3"
              >
                <button
                  onClick={handleCTA}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-gold2 transition-colors text-sm"
                >
                  {isSignedIn ? 'Abrir feed' : 'Começar grátis'}
                  <ArrowRight size={15} />
                </button>
                {!isSignedIn && (
                  <span className="text-xs text-muted">Sem cartão. Sem subscrição.</span>
                )}
              </motion.div>
            </div>

            {/* Mockup do feed */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative hidden lg:block"
            >
              {/* Gradiente de fade na parte inferior */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent z-10 pointer-events-none rounded-b-2xl" />

              <div
                className="rounded-2xl border border-border bg-bg3 overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(200,169,110,0.06)' }}
              >
                {/* Barra de topo mockup */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg2">
                  <div className="flex gap-1.5">
                    {['#ff5f57','#febc2e','#28c840'].map(c => (
                      <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex-1 h-5 bg-bg3 rounded-full mx-2" />
                </div>

                {/* Cards mockup */}
                <div className="p-3 flex flex-col gap-2.5 max-h-[420px] overflow-hidden">
                  {MOCK_ARTICLES.map((a, i) => (
                    <MockCard key={i} article={a} delay={0.4 + i * 0.1} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Marquee de fontes ── */}
      <section className="py-10 border-y border-border">
        <div className="mb-4 text-center">
          <span className="text-xs text-muted uppercase tracking-widest">Fontes incluídas</span>
        </div>
        <Marquee items={SOURCES} />
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
              className="font-display font-extrabold text-3xl sm:text-4xl text-text mb-3"
            >
              Feito para ler, não para vender.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-muted text-base max-w-lg mx-auto"
            >
              O grain não tem feed personalizado. Não sabe o que te mantém mais tempo no ecrã.
              Não quer saber.
            </motion.p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6 p-10 rounded-3xl border border-border bg-bg2"
            style={{ boxShadow: '0 0 80px rgba(200,169,110,0.04)' }}
          >
            <div className="font-display font-extrabold text-4xl text-text leading-tight">
              no noise,
              <br />
              <span className="text-gold">only grain.</span>
            </div>
            <p className="text-muted text-sm">
              Gratuito. Sem dados vendidos. Sem anúncios. Sem algoritmo.
            </p>
            <button
              onClick={handleCTA}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gold text-bg font-semibold hover:bg-gold2 transition-colors text-sm mx-auto"
            >
              {isSignedIn ? 'Ir para o feed' : 'Criar conta gratuita'}
              <ArrowRight size={15} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <span className="font-display font-extrabold text-gold">grain</span>
          <span className="text-xs text-muted">
            Feito com cuidado. Sem rastreadores.
          </span>
        </div>
      </footer>

    </div>
  );
}
