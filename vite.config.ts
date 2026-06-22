import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: "src/index.ts",
      output: {
        entryFileNames: "index.js",
      },
    },
  },
});
