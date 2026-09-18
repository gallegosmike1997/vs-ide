type Props = {
  code: string;
};

export default function AIRefactorPanel({ code }: Props) {
  const suggestions = [
    'Extract helper functions for repeated logic.',
    'Add explicit types to function parameters.',
    'Consider splitting this file into smaller modules.',
  ];

  return (
    <div className='glass h-full w-full p-3'>
      <h2 className='text-sm font-semibold mb-2'>AI Refactor Suggestions</h2>
      <p className='text-xs opacity-70 mb-2'>
        (Mocked for now — wire to your local LLM later.)
      </p>
      <ul className='text-sm space-y-1'>
        {suggestions.map((s, i) => (
          <li key={i} className='flex gap-2'>
            <span>•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
