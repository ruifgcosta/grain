/**
 * Página /admin — painel de administração.
 * Acesso restrito — só utilizadores com isAdmin=true (verificado no backend).
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import Layout from '@/components/Layout';
import { Shield, Loader2 } from 'lucide-react';

function useAdminStats() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const token = await getToken();
      const base = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api';
      const r = await fetch(`${base}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Sem acesso');
      return r.json() as Promise<{
        articles: number;
        users: number;
        active_topics: number;
        active_sources: number;
        pending_suggestions: number;
      }>;
    },
    enabled: isSignedIn ?? false,
    retry: false,
  });
}

function useAdminFetchLog() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'fetch-log'],
    queryFn: async () => {
      const token = await getToken();
      const base = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api';
      const r = await fetch(`${base}/admin/fetch-log?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Sem acesso');
      return r.json() as Promise<{
        logs: Array<{
          id: string;
          source_id: string;
          source_name: string;
          fetched_at: number;
          articles_new: number;
          articles_dup: number;
          status: string;
          error_msg: string | null;
        }>;
      }>;
    },
    retry: false,
  });
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-card border border-border bg-bg2">
      <span className="text-2xl font-display font-extrabold text-text">{value.toLocaleString()}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function timeStr(ts: number) {
  return new Date(ts * 1000).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Admin() {
  const { isSignedIn } = useAuth();
  const stats = useAdminStats();
  const fetchLog = useAdminFetchLog();

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
          <Shield size={40} className="text-muted" />
          <p className="text-sm text-muted">Acesso restrito.</p>
        </div>
      </Layout>
    );
  }

  if (stats.isError) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
          <Shield size={40} className="text-muted" />
          <p className="text-sm text-muted">Não tens permissões de administração.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-2xl text-text">Admin</h1>
          <p className="text-sm text-muted mt-1">Estatísticas e gestão do grain.</p>
        </div>

        {/* ── Stats ── */}
        {stats.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-muted" />
          </div>
        ) : stats.data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <StatCard label="Artigos" value={stats.data.articles} />
            <StatCard label="Utilizadores" value={stats.data.users} />
            <StatCard label="Temas activos" value={stats.data.active_topics} />
            <StatCard label="Fontes activas" value={stats.data.active_sources} />
            <StatCard label="Sugestões pendentes" value={stats.data.pending_suggestions} />
          </div>
        ) : null}

        {/* ── Fetch log ── */}
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          Histórico de fetches
        </h2>

        {fetchLog.isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 size={16} className="animate-spin text-muted" />
          </div>
        )}

        {fetchLog.data && (
          <div className="flex flex-col gap-2">
            {fetchLog.data.logs.map(log => (
              <div
                key={log.id}
                className={`flex items-center gap-3 p-3 rounded-xl border text-sm
                  ${log.status === 'error'
                    ? 'border-red-900/50 bg-red-950/20'
                    : 'border-border bg-bg2'
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    log.status === 'ok' ? 'bg-green' : 'bg-red-500'
                  }`}
                />
                <span className="font-medium text-text w-24 truncate flex-shrink-0">
                  {log.source_name}
                </span>
                <span className="text-muted text-xs flex-1 truncate">
                  {log.status === 'error'
                    ? log.error_msg ?? 'Erro desconhecido'
                    : `+${log.articles_new} novos, ${log.articles_dup} dup`
                  }
                </span>
                <span className="text-xs text-muted flex-shrink-0">
                  {timeStr(log.fetched_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
