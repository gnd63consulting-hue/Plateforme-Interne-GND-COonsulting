import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { loadContentFile } from '@/lib/modules-registry';

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};

export default function RessourcesPage() {
  const loaded = loadContentFile('ressources.mdx');

  if (!loaded) {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold text-gnd-primary">Ressources</h1>
        <p className="mt-3 text-gnd-muted">
          Fichier <code>ressources.mdx</code> introuvable.
        </p>
      </div>
    );
  }

  return (
    <article className="card">
      <div className="prose-module">
        <MDXRemote source={loaded.body} options={mdxOptions} />
      </div>
    </article>
  );
}
