import * as Tabs from '@radix-ui/react-tabs';

type TabDef = {
  id: string;
  label: string;
};

type Props = {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
};

export default function EditorTabs({ tabs, active, onChange }: Props) {
  return (
    <Tabs.Root value={active} onValueChange={onChange}>
      <Tabs.List className='flex gap-2 mb-2'>
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            className={
              'px-3 py-1 text-xs rounded-md border border-white/10 ' +
              (active === tab.id ? 'bg-white/10' : 'bg-black/40')
            }
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
