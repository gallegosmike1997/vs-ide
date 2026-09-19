import pathlib
p = pathlib.Path(r"c:\Users\Michael\vs-ide\src\index.css")
p.write_text('''/* Base styles (plain CSS - no Tailwind preflight installed) */
* { box-sizing: border-box; }

html, body, #root {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  background-color: #050505;
  color: #ffffff;
  overflow: hidden;
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
  background-color: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Utility fallbacks for classes used across components */
.h-screen { height: 100vh; }
.w-screen { width: 100vw; }
.h-full { height: 100%; }
.w-full { width: 100%; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1 1 0%; }
.shrink-0 { flex-shrink: 0; }
.min-w-0 { min-width: 0; }
.min-h-0 { min-height: 0; }
.min-h-64 { min-height: 16rem; }
.h-64 { height: 16rem; }
.h-48 { height: 12rem; }
.w-72 { width: 18rem; }
.w-80 { width: 20rem; }
.w-96 { width: 24rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-6 { padding: 1.5rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.ml-4 { margin-left: 1rem; }
.space-y-1 > * + * { margin-top: 0.25rem; }
.space-x-1 > * + * { margin-left: 0.25rem; }
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }
.font-semibold { font-weight: 600; }
.overflow-hidden { overflow: hidden; }
.overflow-auto { overflow: auto; }
.overflow-y-auto { overflow-y: auto; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.bg-black\\/40 { background-color: rgba(0, 0, 0, 0.4); }
.bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1); }
.border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }
.opacity-70 { opacity: 0.7; }
.opacity-60 { opacity: 0.6; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cursor-pointer { cursor: pointer; }
.fixed { position: fixed; }
.absolute { position: absolute; }
.top-10 { top: 2.5rem; }
.right-10 { right: 2.5rem; }
.bottom-10 { bottom: 2.5rem; }
.bottom-6 { bottom: 1.5rem; }
.right-6 { right: 1.5rem; }
.top-1\\/4 { top: 25%; }
.left-1\\/2 { left: 50%; }
.-translate-x-1\\/2 { transform: translateX(-50%); }
.h-\\[60vh\\] { height: 60vh; }
.h-\\[40vh\\] { height: 40vh; }
.h-\\[calc\\(100\\%-1rem\\)\\] { height: calc(100% - 1rem); }
.h-\\[calc\\(100\\%-1\\.5rem\\)\\] { height: calc(100% - 1.5rem); }
.w-\\[300px\\] { width: 300px; }
.w-\\[500px\\] { width: 500px; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.p-4 { padding: 1rem; }
.shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }
.outline-none { outline: none; }
.backdrop-blur-sm { backdrop-filter: blur(4px); }
.bg-black\\/40 { background-color: rgba(0,0,0,0.4); }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.w-5 { width: 1.25rem; }
.h-5 { height: 1.25rem; }

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
print('index.css plain-css rewrite done', p.stat().st_size)
