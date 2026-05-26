import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  if (mode === "demo") {
    return {
      root: "demo",
      base: "./",
      build: {
        outDir: "../dist-demo",
        emptyOutDir: true,
      },
    };
  }

  return {
    root: ".",
    server: {
      open: "/demo/index.html",
    },
    plugins: [dts({ rollupTypes: true })],
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
  };
});
