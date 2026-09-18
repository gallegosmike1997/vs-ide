import { useState } from 'react';
import { callLLM } from '../aiClient';

type FileInfo = {
  path: string;
  content: string;
};

type Props = {
  files: FileInfo[];
};

export default function SemanticSearchPanel({ files }: Props) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');

  async function runSearch() {
    const context = files
      .map((f) => 'FILE: ' + f.path + '\n' + f.content)
      .join('\n\n');

    const prompt =
      'You are a semantic search engine over a codebase.\n\n' +
      'User query:\n' +
      query +
      '\n\nCodebase:\n' +
      context +
      '\n\nRespond with the most relevant file paths and a short explanation.\n';

    const answer = await callLLM(prompt);
    setResult(answer);
  }

  return (
    <div className='glass h-full w-full p-3'>
      <h2 className='text-sm font-semibold mb-2'>Semantic File Search</h2>

      <input
        className='w-full p-2 mb-2 bg-black/40 rounded-md text-sm'
        placeholder='Search by meaning (e.g., "API router", "login form")'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <button
        className='px-3 py-1 text-xs rounded-md bg-white/10'
        onClick={runSearch}
      >
        Search
      </button>

      <pre className='mt-3 text-xs whitespace-pre-wrap'>
        {result || 'Results will appear here.'}
      </pre>
    </div>
  );
}
