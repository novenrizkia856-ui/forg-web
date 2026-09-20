import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      /**
       * config/contracts.js stays outside the bundle on purpose: the deployed
       * site can be pointed at a contract by editing dist/config/contracts.js,
       * with no rebuild.
       */
      name: "forg-contract-config",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "config/contracts.js",
          source: readFileSync("config/contracts.js", "utf8"),
        });
      },
    },
    {
      /**
       * The dev server does not resolve a directory to its index.html the way
       * a static host does, so /docs/ would fall through to the landing page
       * and quietly show the wrong document. This makes dev match the deploy.
       *
       * Only the dev server needs it: `vite build` copies public/docs into
       * dist, and Vercel serves the directory index itself.
       */
      name: "forg-docs-dev-index",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const [path] = (request.url || "").split("?");
          if (path === "/docs") {
            response.statusCode = 301;
            response.setHeader("location", "/docs/");
            return response.end();
          }
          if (path === "/docs/") request.url = "/docs/index.html";
          next();
        });
      },
    },
  ],
});
