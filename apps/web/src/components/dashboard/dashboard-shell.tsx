'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const navItems = [
  { href: '/dashboard/api-keys', label: 'API Key' },
  { href: '/dashboard/analytics', label: 'Análise' },
  { href: '/dashboard/playground', label: 'Playground' },
  { href: '/docs', label: 'API Documentation', externalIcon: true },
  { href: '/dashboard/account', label: 'Detalhes da conta' },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  return (
    <div className="flex min-h-screen flex-col text-stone-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm tracking-[0.2em] text-emerald-300/80 uppercase"
          >
            IESData
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
            <Link
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-stone-300 transition hover:bg-white/5 hover:text-white"
            >
              Docs
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-emerald-400 px-3 py-1.5 font-medium text-emerald-950 transition hover:bg-emerald-300"
            >
              Dashboard
            </Link>
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-stone-400 transition hover:bg-white/5 hover:text-white"
              onClick={() => {
                clearSession();
                router.push('/login');
              }}
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="pb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Olá, {user?.name ?? 'desenvolvedor'}!
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-400">
            Acompanhe o uso da sua conta, gerencie API Keys e teste a API no
            playground. Precisa de ajuda? Veja a{' '}
            <Link
              href="/docs"
              className="text-emerald-300/90 underline-offset-4 hover:text-emerald-200 hover:underline"
            >
              documentação
            </Link>
            .
          </p>
        </div>

        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col gap-8 md:flex-row md:gap-10">
            <aside className="md:w-56 md:shrink-0 md:border-r md:border-white/10 md:pr-6">
              <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
                {navItems.map((item) => {
                  const active =
                    item.href !== '/docs' && isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      {...('externalIcon' in item && item.externalIcon
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className={[
                        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition',
                        active
                          ? 'border border-white/15 bg-white/5 text-stone-100'
                          : 'text-emerald-300/90 hover:bg-white/5 hover:text-emerald-200',
                      ].join(' ')}
                    >
                      {item.label}
                      {'externalIcon' in item && item.externalIcon ? (
                        <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <section className="min-w-0 flex-1">{children}</section>
          </div>
        </div>
      </div>

      <footer className="mt-auto border-t border-white/10 bg-[#050807]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="tracking-[0.15em] text-stone-200 uppercase">IESData</p>
          <div className="sm:text-right">
            <p>Dados do Censo da Educação Superior (INEP/MEC).</p>
            <p>
              Precisa de ajuda?{' '}
              <Link
                href="/docs"
                className="text-emerald-300/90 underline-offset-4 hover:underline"
              >
                documentação
              </Link>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
