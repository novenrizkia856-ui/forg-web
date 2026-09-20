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
  ],
});
