import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  server: {
    open: "/demo/index.html",
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "mention-input",
    },
    rollupOptions: {
      external: /^lit/,
    },
  },
});
