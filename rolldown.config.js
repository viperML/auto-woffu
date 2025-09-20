import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts",
  external: (id) => !id.startsWith('.') && !id.startsWith('/'),
  output: {
    dir: "dist",
    format: "esm",
    preserveModules: true,
    preserveModulesRoot: "src",
  },
});
