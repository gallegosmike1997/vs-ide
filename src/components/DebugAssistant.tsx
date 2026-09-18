import { useState } from 'react';
import { callLLM } from '../aiClient';

type Props = {
  code: string;
  logs: string;
};

export default function DebugAssistant({ code, logs }: Props) {
  const [analysis, setAnalysis] = useState('');

  async function runDebug() {
    const prompt =
      'You are a debugging assistant.\n\n' +
      'Here is the code:\n' +
      code +
      '\n\nHere are the logs or errors:\n' +
      logs +
      '\n\nIdentify likely root causes, explain what is happening, and propose fixes.\n';

    const answer = await callLLM(prompt);
    setAnalysis(answer);
  }

  return (
    <div className='glass h-full w-full p-3'>
      <h2 className='text-sm font-semibold mb-2'>Debugging Assistant</h2>

      <button
        className='px-3 py-1 text-xs rounded-md bg-white/10 mb-2'
        onClick={runDebug}
      >
        Analyze
      </button>

      <pre className='text-xs whitespace-pre-wrap'>
        {analysis || 'Click Analyze to get AI debugging help.'}
      </pre>
    </div>
  );
}
