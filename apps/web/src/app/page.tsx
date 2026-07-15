import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-between px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <p className="text-sm tracking-[0.2em] text-emerald-300/80 uppercase">
            IESData
          </p>
          <nav className="flex items-center gap-8 text-sm text-stone-300">
            <Link href="/login" className="hover:text-white">
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-emerald-400 px-4 py-2 font-medium text-emerald-950 transition hover:bg-emerald-300"
            >
              Criar conta
            </Link>
          </nav>
        </header>

        <section className="max-w-2xl py-16">
          <h1 className="font-[family-name:var(--font-poppins)] text-5xl leading-tight font-semibold tracking-tight sm:text-6xl">
            IESData
          </h1>
          <p className="mt-6 max-w-xl text-lg text-stone-300">
            Consulte instituições de ensino superior e cursos do Censo INEP/MEC
            com API Key, rate limit e documentação Swagger.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="rounded-md bg-emerald-400 px-5 py-3 text-sm font-medium text-emerald-950 transition hover:bg-emerald-300"
            >
              Gerar API Key
            </Link>
            <Link
              href="/dashboard/playground"
              className="rounded-md border border-stone-600 px-5 py-3 text-sm text-stone-100 transition hover:border-stone-400"
            >
              Abrir playground
            </Link>
            <Link
              href="/docs"
              className="rounded-md border border-stone-600 px-5 py-3 text-sm text-stone-100 transition hover:border-stone-400"
            >
              Documentação
            </Link>
            <a
              href="https://github.com/Owl0-1/IESData"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm text-stone-300 transition hover:text-white"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              GitHub
            </a>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-6 text-sm text-stone-400">
          Fonte dos dados: microdados do Censo da Educação Superior (INEP/MEC).
          Desenvolvido por{' '}
          <a
            href="https://github.com/Owl0-1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-300 underline decoration-emerald-400/70 underline-offset-4 transition hover:text-white hover:decoration-emerald-300"
          >
            Owl0-1
          </a>
          .
        </footer>
      </div>
    </main>
  );
}
