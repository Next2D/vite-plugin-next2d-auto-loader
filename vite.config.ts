/// <reference types="vite/client" />

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import polyfillNode from "rollup-plugin-polyfill-node";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    "build": {
        "lib": {
            "entry": resolve(__dirname, "src/index.ts"),
            "name": "vite-auto-loader-plugin",
            "fileName": "index"
        },
        "outDir": "dist",
        "target": "esnext",
        "rollupOptions": {
            "external": ["fs"],
            "output": {
                "globals": {
                    "fs": "fs"
                }
            },
            "plugins": [polyfillNode()]
        }
    }
});