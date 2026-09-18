import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { callLLM } from '../aiClient';

type Props = {
  onCommand?: (cmd: string, result: string) => void;
};

export default function AICommandPalette({ onCommand }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');

  async function run() {
    const answer = await callLLM(query);
    setResult(answer);
    if (onCommand) {
      onCommand(query, answer);
    }
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className='fixed bottom-6 right-6 glass p-3 shadow-lg'>
          <Search className='w-5 h-5' />
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className='fixed inset-0 bg-black/40 backdrop-blur-sm' />
          <Dialog.Content className='glass fixed top-1/4 left-1/2 -translate-x-1/2 p-6 w-[500px]'>
            <h2 className='text-lg mb-3'>AI Command Palette</h2>
            <input
              className='w-full p-3 bg-black/40 rounded-lg outline-none text-sm'
              placeholder='Ask AI or run a command...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  run();
                }
              }}
            />
            <pre className='mt-3 text-xs whitespace-pre-wrap'>
              {result || 'Results will appear here.'}
            </pre>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
