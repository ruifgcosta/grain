/**
 * Landing page do grain — versão 2.
 * Logo, demo animado (substituição de vídeo), "Como funciona",
 * inverted border-radius, CTA → /feed sem forçar login.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import { Sparkles, BookmarkCheck, Rss, ArrowRight, Zap, Shield, Globe, Plus, ExternalLink } from 'lucide-react';

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
  { icon: Rss,           title: 'Fontes curadas',  desc: 'Jornalismo de qualidade, seleccionado à mão. Sem clickbait, sem conteúdo viral.' },
  { icon: Sparkles,      title: 'Resumos IA',       desc: 'Gerados em PT Europeu pelo Gemini. On-demand — só quando queres.' },
  { icon: BookmarkCheck, title: 'Seguir temas',     desc: 'Define temas em linguagem natural. O grain encontra artigos por semântica.' },
  { icon: Shield,        title: 'Sem algoritmo',    desc: 'Cronológico. Sem feed personalizado, sem bolha de filtro.' },
  { icon: Globe,         title: 'PT + EN',          desc: 'Fontes em inglês traduzidas automaticamente para Português Europeu.' },
  { icon: Zap,           title: 'Rápido e limpo',   desc: 'PWA sem rastreadores, sem anúncios, sem cookies de terceiros.' },
];

// Artigos fictícios para o demo animado
const DEMO_ARTICLES = [
  { source: 'BBC News',     color: '#b80000', title: 'EU leaders reach historic climate agreement at Brussels summit', time: '2m' },
  { source: 'Público',      color: '#1a1aff', title: 'Portugal regista crescimento de 2,3% no primeiro trimestre', time: '8m' },
  { source: 'The Guardian', color: '#005689', title: 'Scientists discover new approach to carbon capture technology', time: '15m' },
];

const DEMO_SUMMARY = 'Líderes europeus chegaram a acordo sobre metas climáticas para 2035. O pacto prevê redução de 65% nas emissões e investimento de €400 mil milhões em energias renováveis.';

// ─── Marquee ──────────────────────────────────────────────────────────────────

function Marquee({ items }: { items: typeof SOURCES }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const totalWidth = el.scrollWidth / 2;
    const tween = gsap.to(el, {
      x: -totalWidth, duration: 30, ease: 'none', repeat: -1,
      modifiers: { x: gsap.utils.unitize(x => parseFloat(x) % totalWidth) },
    });
    return () => { tween.kill(); };
  }, []);

  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden w-full">
      <div ref={trackRef} className="flex gap-3 w-max">
        {doubled.map((s, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg2 flex-shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-sm text-muted font-medium whitespace-nowrap">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Demo animado (substitui vídeo) ───────────────────────────────────────────

/** Vista: Feed com cards a aparecer */
function DemoFeed({ visibleCards }: { visibleCards: number }) {
  return (
    <div className="flex flex-col gap-2.5 p-3">
      {DEMO_ARTICLES.slice(0, visibleCards).map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-bg2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="text-[10px] text-muted font-medium">{a.source}</span>
            </div>
            <span className="text-[10px] text-muted">{a.time}</span>
          </div>
          <p className="text-xs font-semibold text-text leading-snug line-clamp-2">{a.title}</p>
          <div className="flex gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-bg border border-green-bdr">
              <Sparkles size={8} className="text-green" />
              <span className="text-[9px] text-green">Resumo IA</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-border">
              <Plus size={8} className="text-muted" />
              <span className="text-[9px] text-muted">Seguir</span>
            </div>
            <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md border border-border">
              <ExternalLink size={8} className="text-muted" />
              <span className="text-[9px] text-muted">Abrir</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/** Vista: AI Summary expandido */
function DemoSummary() {
  const [chars, setChars] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setChars(i);
      if (i >= DEMO_SUMMARY.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-2.5 p-3">
      {/* Card com summary aberto */}
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-green-bdr bg-bg2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b80000]" />
            <span className="text-[10px] text-muted font-medium">BBC News</span>
          </div>
          <span className="text-[10px] text-muted">2m</span>
        </div>
        <p className="text-xs font-semibold text-text leading-snug line-clamp-2">
          {DEMO_ARTICLES[0].title}
        </p>
        {/* Summary box */}
        <div className="p-2.5 rounded-lg bg-green-bg border border-green-bdr">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={9} className="text-green flex-shrink-0" />
            <span className="text-[9px] text-green font-medium">Resumo IA</span>
          </div>
          <p className="text-[10px] text-text leading-relaxed">
            {DEMO_SUMMARY.slice(0, chars)}
            {chars < DEMO_SUMMARY.length && (
              <span className="inline-block w-0.5 h-3 bg-green ml-0.5 animate-pulse" />
            )}
          </p>
        </div>
        <div className="flex gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-bg border border-green-bdr">
            <Sparkles size={8} className="text-green" />
            <span className="text-[9px] text-green">Resumo IA</span>
          </div>
          <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md border border-border">
            <ExternalLink size={8} className="text-muted" />
            <span className="text-[9px] text-muted">Abrir</span>
          </div>
        </div>
      </div>

      {/* Cards restantes */}
      {DEMO_ARTICLES.slice(1).map((a, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-bg2 opacity-50">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="text-[10px] text-muted font-medium">{a.source}</span>
          </div>
          <p className="text-xs font-semibold text-text leading-snug line-clamp-1">{a.title}</p>
        </div>
      ))}
    </div>
  );
}

/** Vista: Topic follow */
function DemoFollow() {
  const [typed, setTyped] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const QUERY = 'alterações climáticas Europa';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 2;
      setTyped(i);
      if (i >= QUERY.length) {
        clearInterval(interval);
        setTimeout(() => setShowResult(true), 600);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Input box */}
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-bg2">
        <p className="text-[9px] text-muted font-medium uppercase tracking-wide">Seguir tema</p>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-bg3 border border-border">
          <span className="text-sm">🌍</span>
          <span className="text-xs text-text">
            {QUERY.slice(0, typed)}
            {typed < QUERY.length && (
              <span className="inline-block w-0.5 h-3 bg-gold ml-0.5 animate-pulse" />
            )}
          </span>
        </div>
        {typed >= QUERY.length && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full py-1.5 rounded-lg bg-gold text-bg text-xs font-semibold"
          >
            Seguir
          </motion.button>
        )}
      </div>

      {/* Resultado */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-gold/30 bg-gold-dim"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🌍</span>
              <span className="text-xs text-gold font-medium">alterações climáticas Europa</span>
            </div>
            <p className="text-[9px] text-muted">3 artigos correspondentes encontrados</p>
            <div className="w-12 h-1 rounded-full bg-gold/40 mt-0.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Demo automático que cicla entre os 3 estados */
function AutoDemo() {
  const [step, setStep] = useState(0);
  const [visibleCards, setVisibleCards] = useState(0);
  const DURATIONS = [3500, 4000, 3500];

  useEffect(() => {
    // Animar cards no step 0
    if (step === 0) {
      setVisibleCards(0);
      const t1 = setTimeout(() => setVisibleCards(1), 300);
      const t2 = setTimeout(() => setVisibleCards(2), 700);
      const t3 = setTimeout(() => setVisibleCards(3), 1100);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [step]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStep(s => (s + 1) % 3);
    }, DURATIONS[step]);
    return () => clearTimeout(timer);
  }, [step]);

  const stepLabels = ['Feed', 'Resumo IA', 'Seguir temas'];

  return (
    <div className="rounded-2xl border border-border bg-bg3 overflow-hidden" style={{ boxShadow: '0 0 60px rgba(200,169,110,0.06)' }}>
      {/* Chrome do browser */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg2">
        <div className="flex gap-1.5">
          {['#ff5f57', '#febc2e', '#28c840'].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2 bg-bg3 rounded-full px-3 py-1 mx-2">
          <img src="/favicon.svg" className="w-3 h-3 opacity-60" alt="" />
          <span className="text-[10px] text-muted">grain.app/feed</span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex border-b border-border">
        {stepLabels.map((label, i) => (
          <button
            key={label}
            className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
              step === i ? 'text-gold border-b-2 border-gold bg-gold-dim/30' : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo animado */}
      <div className="min-h-[280px]">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <DemoFeed visibleCards={visibleCards} />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <DemoSummary />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="follow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <DemoFollow />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Como funciona ─────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    num: '01',
    icon: Rss,
    title: 'Abre o feed',
    desc: 'Fontes de jornalismo de qualidade, em PT e EN. Cronológico, sem algoritmo que decida o que vês.',
  },
  {
    num: '02',
    icon: Sparkles,
    title: 'Resume com IA',
    desc: 'Clica "Resumo IA" em qualquer artigo. O Gemini resume em Português Europeu em segundos.',
  },
  {
    num: '03',
    icon: BookmarkCheck,
    title: 'Segue o que importa',
    desc: 'Descreve um tema em linguagem natural. O grain encontra artigos correspondentes automaticamente.',
  },
];

function StepCard({ step, index }: { step: typeof HOW_STEPS[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-4 p-6 rounded-2xl border border-border bg-bg hover:border-border2 transition-colors"
    >
      {/* Número com inverted border-radius */}
      <div className="relative w-fit">
        <div
          className="w-11 h-11 flex items-center justify-center font-display font-extrabold text-sm text-bg"
          style={{
            backgroundColor: 'var(--color-gold)',
            borderRadius: '0 12px 12px 12px', // canto TL sharp
          }}
        >
          {step.num}
        </div>
        {/* Concave TL corner — círculo da cor do pai cobre o canto sharp */}
        <div
          className="absolute top-0 left-0 w-3 h-3"
          style={{ backgroundColor: 'var(--color-bg2)', borderRadius: '0 0 100% 0' }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Icon size={16} className="text-gold flex-shrink-0" />
        <h3 className="font-semibold text-text">{step.title}</h3>
      </div>
      <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
    </motion.div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
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

  // CTA principal → sempre vai para o feed (sem forçar login)
  function handleCTA() {
    navigate('/feed');
  }

  return (
    <div className="min-h-screen bg-bg text-text font-body overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="grain" className="w-6 h-6" />
            <span className="font-display font-extrabold text-xl text-gold tracking-tight">grain</span>
          </div>

          <div className="flex items-center gap-3">
            {isLoaded && (
              isSignedIn ? (
                <button
                  onClick={() => navigate('/feed')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm bg-gold text-bg font-semibold hover:bg-gold2 transition-colors"
                >
                  Abrir feed <ArrowRight size={14} />
                </button>
              ) : (
                <>
                  <button onClick={() => openSignIn()} className="text-sm text-muted hover:text-text transition-colors">
                    Entrar
                  </button>
                  <button
                    onClick={handleCTA}
                    className="px-4 py-2 rounded-xl text-sm bg-gold text-bg font-semibold hover:bg-gold2 transition-colors"
                  >
                    Ver feed
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
                <span className="text-xs font-medium text-gold uppercase tracking-widest">Notícias sem ruído</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-display font-extrabold text-5xl sm:text-6xl text-text leading-[1.05] tracking-tight"
              >
                O jornalismo
                <br />que importa,
                <br /><span className="text-gold">sem o resto.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-base text-muted leading-relaxed max-w-md"
              >
                Agrega fontes de qualidade em PT e EN. Resumos IA on-demand.
                Segue temas por semântica. Sem algoritmos, sem anúncios.
              </motion.p>

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
                  Começar grátis <ArrowRight size={15} />
                </button>
                <span className="text-xs text-muted">Sem cartão. Sem subscrição.</span>
              </motion.div>
            </div>

            {/* Demo animado */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative hidden lg:block"
            >
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg to-transparent z-10 pointer-events-none rounded-b-2xl" />
              <AutoDemo />
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

      {/* ── Como funciona — secção com inverted corners no topo ── */}
      <section className="relative bg-bg2">
        {/* Inverted border-radius — cantos côncavos no topo */}
        <div className="absolute top-0 left-0 w-10 h-10 bg-bg" style={{ borderRadius: '0 0 100% 0' }} />
        <div className="absolute top-0 right-0 w-10 h-10 bg-bg" style={{ borderRadius: '0 0 0 100%' }} />

        <div className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5 }}
                className="font-display font-extrabold text-3xl sm:text-4xl text-text mb-3"
              >
                Três passos. Nada mais.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-muted text-base max-w-md mx-auto"
              >
                Não há curva de aprendizagem. Abre, lê, segue.
              </motion.p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {HOW_STEPS.map((step, i) => (
                <StepCard key={step.num} step={step} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Inverted border-radius — cantos côncavos no fundo */}
        <div className="absolute bottom-0 left-0 w-10 h-10 bg-bg" style={{ borderRadius: '0 100% 0 0' }} />
        <div className="absolute bottom-0 right-0 w-10 h-10 bg-bg" style={{ borderRadius: '100% 0 0 0' }} />
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

      {/* ── CTA final com inverted border-radius ── */}
      <section className="py-20 px-6 bg-bg">
        <div className="max-w-2xl mx-auto">
          {/* Container com cantos côncavos no topo */}
          <div className="relative">
            {/* Inverted corners no topo do card */}
            <div className="absolute -top-0 left-0 w-8 h-8" style={{ backgroundColor: 'var(--color-bg)', borderRadius: '0 0 100% 0', zIndex: 1 }} />
            <div className="absolute -top-0 right-0 w-8 h-8" style={{ backgroundColor: 'var(--color-bg)', borderRadius: '0 0 0 100%', zIndex: 1 }} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6 }}
              className="flex flex-col gap-6 p-10 text-center"
              style={{
                backgroundColor: 'var(--color-bg2)',
                border: '0.5px solid var(--color-border)',
                borderRadius: '0 0 32px 32px',
                boxShadow: '0 0 80px rgba(200,169,110,0.04)',
              }}
            >
              <div className="font-display font-extrabold text-4xl text-text leading-tight">
                no noise,
                <br /><span className="text-gold">only grain.</span>
              </div>
              <p className="text-muted text-sm">
                Gratuito. Sem dados vendidos. Sem anúncios. Sem algoritmo.
              </p>
              <button
                onClick={handleCTA}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gold text-bg font-semibold hover:bg-gold2 transition-colors text-sm mx-auto"
              >
                {isSignedIn ? 'Ir para o feed' : 'Começar grátis'}
                <ArrowRight size={15} />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="grain" className="w-5 h-5" />
            <span className="font-display font-extrabold text-gold">grain</span>
          </div>
          <span className="text-xs text-muted">Feito com cuidado. Sem rastreadores.</span>
        </div>
      </footer>

    </div>
  );
}
