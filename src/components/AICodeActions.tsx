import { useState } from 'react';
import { callLLM } from '../aiClient';

type Props = {
  code: string;
};

export default function AICodeActions({ code }: Props) {
  const [output, setOutput] = useState('');

  async function runAction(kind: string) {
    const prompt =
      'You are an expert code assistant.\n\n' +
      'Action: ' +
      kind +
      '\n\nCode:\n' +
      code +
      '\n\nPerform the action and respond with the transformed code or explanation.\n';

    const answer = await callLLM(prompt);
    setOutput(answer);
  }

  return (
    <div className='glass h-full w-full p-3'>
      <h2 className='text-sm font-semibold mb-2'>AI Code Actions</h2>

      <div className='flex gap-2 mb-2'>
        <button
          className='px-3 py-1 text-xs rounded-md bg-white/10'
          onClick={() => runAction('Refactor for readability')}
        >
          Refactor
        </button>

        <button
          className='px-3 py-1 text-xs rounded-md bg-white/10'
          onClick={() => runAction('Add comments explaining the code')}
        >
          Comment
        </button>

        <button
          className='px-3 py-1 text-xs rounded-md bg-white/10'
          onClick={() => runAction('Optimize performance')}
        >
          Optimize
        </button>
      </div>

      <pre className='mt-2 text-xs whitespace-pre-wrap'>
        {output || 'Run an action to see AI output.'}
      </pre>
    </div>
  );
}
