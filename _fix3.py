import pathlib
p = pathlib.Path(r"c:\Users\Michael\vs-ide\src\index.css")
p.write_text('''@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-[#050505] text-white overflow-hidden;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.ambient-bg {
  background: radial-gradient(circle at 10% 0%, #1a1a1a, #050505);
  animation: ambientMove 30s infinite alternate ease-in-out;
}

@keyframes ambientMove {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}

.glass {
  @apply bg-white/5 backdrop-blur-sm rounded-xl border border-white/10;
}

.ai-hint-glyph {
  background-color: #4f8cff;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.ai-inline-annotation {
  background-color: rgba(79, 140, 255, 0.12);
  border-bottom: 1px dashed rgba(79, 140, 255, 0.8);
}
''', encoding='utf-8')
print('index.css rewritten', p.stat().st_size)
for name in ['_fix.py', '_fix2.py', 'gen_icon.py', '.icon-source.png']:
    pp = pathlib.Path(r"c:\Users\Michael\vs-ide") / name
    if pp.exists():
        pp.unlink()
        print('removed', name)
