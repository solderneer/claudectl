import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.tsx"],
  format: ["esm"],
  target: "node18",
  clean: true,
  dts: true,
  sourcemap: true,
  external: ["react", "ink"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
