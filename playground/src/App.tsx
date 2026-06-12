import React, { useEffect, useState } from "react";

/**
 * File-per-page routing: every src/pages/<slug>.tsx default export is the
 * page at /<slug>. The glob is HMR-aware — new files written by the speed
 * model or by fleet agents appear without a reload.
 */
const pages = import.meta.glob<{ default: React.ComponentType }>(
  "./pages/*.tsx",
  { eager: true },
);

function pageFor(pathname: string): React.ComponentType | null {
  const slug = pathname.replace(/^\/+|\/+$/g, "") || "home";
  return pages[`./pages/${slug}.tsx`]?.default ?? null;
}

export function pageSlugs(): string[] {
  return Object.keys(pages)
    .map((k) => k.replace("./pages/", "").replace(".tsx", ""))
    .sort();
}

class PageBoundary extends React.Component<
  { pageKey: string; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { pageKey: string }) {
    if (prev.pageKey !== this.props.pageKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
          <div className="max-w-xl rounded-2xl border border-red-900 bg-red-950/40 p-8">
            <div className="text-sm uppercase tracking-widest text-red-400">
              page crashed — the fleet will fix it
            </div>
            <pre className="mt-4 overflow-auto text-sm text-red-200">
              {String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl font-black text-zinc-800">/{slug}</div>
        <p className="mt-4 text-zinc-400">
          Nothing here yet. Say it out loud and it will exist.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const Page = pageFor(path);
  const slug = path.replace(/^\/+|\/+$/g, "") || "home";
  return (
    <PageBoundary pageKey={slug}>
      {Page ? <Page /> : <NotFound slug={slug} />}
    </PageBoundary>
  );
}
