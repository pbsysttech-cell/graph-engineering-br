import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Site estático com duas páginas: a pública (index.html) e o painel de leads (admin.html).
// Arquivos em public/ (fotos, CSS, JS, robots.txt) são copiados como estão para dist/.
export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        admin: resolve(root, "admin.html")
      }
    }
  }
});
