// ---------------------------------------------------------------------------
// Bundle Monaco with the app instead of fetching it from the jsdelivr CDN.
//
// `@monaco-editor/react` defaults to pulling the editor from a CDN on first
// use. That made a packaged desktop app depend on the internet (and on a third
// party) just to render a file, and the CDN copy could drift away from the
// `monaco-editor` version in package.json. Pointing the loader at the local
// module keeps the editor working offline and pins the version.
//
// The language services (TypeScript, JSON, CSS, HTML) run in web workers;
// `MonacoEnvironment.getWorker` is how Monaco finds them. Vite turns the
// `?worker` imports into real worker chunks.
//
// Imported for its side effects from main.tsx, before anything renders.
// ---------------------------------------------------------------------------
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
// NOTE: the workers are referenced by RELATIVE path on purpose. monaco's
// package.json "exports" map does not expose these deep ESM paths, so the
// bare `monaco-editor/...?worker` specifier fails to resolve (Node agrees:
// ERR_MODULE_NOT_FOUND), and a relative path skips the exports map entirely.
import editorWorker from "../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js?worker";
import tsWorker from "../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js?worker";
import jsonWorker from "../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js?worker";
import cssWorker from "../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js?worker";
import htmlWorker from "../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js?worker";
import "../../node_modules/monaco-editor/min/vs/editor/editor.main.css";

(globalThis as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string): Worker {
    switch (label) {
      case "typescript":
      case "javascript":
        return new tsWorker();
      case "json":
        return new jsonWorker();
      case "css":
      case "scss":
      case "less":
        return new cssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new htmlWorker();
      default:
        return new editorWorker();
    }
  },
};

// Hands the bundled instance to the React wrapper.
loader.config({ monaco });

export { monaco };
