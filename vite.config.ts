import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,

  server: {
    port: 1421,        // ← THIS IS WHERE IT GOES
    strictPort: true,  // ← AND THIS
    host: false,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 1421
    },
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  }
});
