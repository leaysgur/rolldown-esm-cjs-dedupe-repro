import { defineConfig } from "rolldown";

export default defineConfig({
  input: "./src/entry-combined.js",
  output: {
    dir: "dist",
    format: "esm",
  },
  platform: "node",
});
