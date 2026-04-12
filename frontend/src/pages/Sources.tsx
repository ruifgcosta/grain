/**
 * Página /sources — activar/desactivar fontes e sugerir novas.
 */

import { useState } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import Layout from '@/components/Layout';
import { useSources, useToggleSource, useSuggestSource } from '@/hooks/useSources';
import { Loader2, ExternalLink, Check, Plus } from 'lucide-react';

function SourceToggle({
  source,
}: {
  source: { id: string; name: string; color: string | null; language: string; website_url: string; is_default: number; user_active: number };
}) {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const toggle = useToggleSource();
  const isActive = source.user_active === 1;

  function handleToggle() {
    if (!isSignedIn) { openSignIn(); return; }
    toggle.mutate({ sourceId: source.id, active: !isActive });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-card border border-border bg-bg2 hover:border-border2 transition-colors">
      {/* Ponto colorido */}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: source.color ?? '#555' }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-text truncate">{source.name}</p>
          <span className="text-[10px] text-muted border border-border px-1.5 rounded-full uppercase">
            {source.language}
          </span>
          {source.is_default === 1 && (
            <span className="text-[10px] text-gold border border-gold/30 px-1.5 rounded-full">
              default
            </span>
          )}
        </div>
      </div>

      {/* Link */}
      <a
        href={source.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-muted hover:text-text transition-colors"
        onClick={e => e.stopPropagation()}
      >
        <ExternalLink size={12} />
      </a>

      {/* Toggle */}
      <button
        onClick={handleToggle}
        disabled={toggle.isPending}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
          isActive ? 'bg-gold' : 'bg-border2'
        }`}
        title={isActive ? 'Desactivar' : 'Activar'}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg transition-all ${
            isActive ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function SuggestForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const suggest = useSuggestSource();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignedIn) { openSignIn(); return; }
    suggest.mutate(
      { name: name.trim(), url: url.trim(), rss_url: rssUrl.trim() || undefined },
      { onSuccess: onClose }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-card border border-border bg-bg2">
      <p className="text-sm font-medium text-text">Sugerir nova fonte</p>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome da publicação"
        className="px-3 py-2 rounded-lg bg-bg3 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
        required
      />
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="URL do site (ex: https://publico.pt)"
        className="px-3 py-2 rounded-lg bg-bg3 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
        type="url"
        required
      />
      <input
        value={rssUrl}
        onChange={e => setRssUrl(e.target.value)}
        placeholder="URL do RSS (opcional)"
        className="px-3 py-2 rounded-lg bg-bg3 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
        type="url"
      />
      {suggest.isError && (
        <p className="text-xs text-red-400">{suggest.error?.message}</p>
      )}
      {suggest.isSuccess && (
        <p className="text-xs text-green flex items-center gap-1">
          <Check size={12} /> Sugestão enviada, obrigado!
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-muted hover:text-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={suggest.isPending || suggest.isSuccess}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gold text-bg font-medium hover:bg-gold2 disabled:opacity-50"
        >
          {suggest.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Sugerir
        </button>
      </div>
    </form>
  );
}

export default function Sources() {
  const { data, isLoading } = useSources();
  const sources = data?.sources ?? [];
  const [showSuggest, setShowSuggest] = useState(false);

  const defaultSources = sources.filter(s => s.is_default === 1);
  const optionalSources = sources.filter(s => s.is_default === 0);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* ── Cabeçalho ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-text">Fontes</h1>
            <p className="text-sm text-muted mt-1">Escolhe de onde queres ler.</p>
          </div>
          <button
            onClick={() => setShowSuggest(!showSuggest)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-border text-muted hover:text-text hover:border-border2 transition-colors"
          >
            <Plus size={14} />
            Sugerir
          </button>
        </div>

        {/* ── Formulário sugestão ── */}
        {showSuggest && (
          <div className="mb-6">
            <SuggestForm onClose={() => setShowSuggest(false)} />
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted" />
          </div>
        )}

        {/* ── Fontes default ── */}
        {!isLoading && defaultSources.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Incluídas por omissão
            </h2>
            <div className="flex flex-col gap-2">
              {defaultSources.map(s => <SourceToggle key={s.id} source={s} />)}
            </div>
          </section>
        )}

        {/* ── Fontes opcionais ── */}
        {!isLoading && optionalSources.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Fontes adicionais
            </h2>
            <div className="flex flex-col gap-2">
              {optionalSources.map(s => <SourceToggle key={s.id} source={s} />)}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
