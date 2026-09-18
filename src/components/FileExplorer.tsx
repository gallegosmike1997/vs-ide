import { useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';

type FileNode = {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
};

const mockTree: FileNode[] = [
  { name: 'src', path: 'src', isDir: true, children: [
    { name: 'App.tsx', path: 'src/App.tsx', isDir: false },
    { name: 'main.tsx', path: 'src/main.tsx', isDir: false },
  ]},
  { name: 'package.json', path: 'package.json', isDir: false },
];

function Node({ node, onOpen }: { node: FileNode; onOpen: (path: string) => void }) {
  const [open, setOpen] = useState(true);

  if (node.isDir) {
    return (
      <div className='mb-1'>
        <div
          className='cursor-pointer text-sm font-semibold'
          onClick={() => setOpen(!open)}
        >
          {open ? '📂' : '📁'} {node.name}
        </div>
        {open && node.children && (
          <div className='ml-4 mt-1'>
            {node.children.map((child) => (
              <Node key={child.path} node={child} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className='cursor-pointer text-sm ml-4'
      onClick={() => onOpen(node.path)}
    >
      📄 {node.name}
    </div>
  );
}

export default function FileExplorer({ onOpen }: { onOpen: (path: string) => void }) {
  return (
    <div className='glass h-full w-full p-2'>
      <h2 className='text-sm font-semibold mb-2'>Explorer</h2>
      <ScrollArea.Root className='h-[calc(100%-1rem)]'>
        <ScrollArea.Viewport className='h-full'>
          {mockTree.map((node) => (
            <Node key={node.path} node={node} onOpen={onOpen} />
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
}
