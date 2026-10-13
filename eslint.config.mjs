import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Màn Trang chủ dựng trên khung cố định 1440×900 rồi scale bằng transform, nên `next/image`
    // (srcset theo viewport) không phù hợp. Ảnh trong /public/home đã được resize sẵn về @2x.
    files: ["src/components/home/**/*.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  {
    // Engine game port từ repo Edtech-game: ghi ref trong lúc render và setState trong effect là cố ý
    // (đồng bộ với vòng lặp canvas). Giữ nguyên code gốc, tắt các rule của React Compiler ở đây.
    files: ["src/components/game/**/*.{ts,tsx}", "src/app/\\(game\\)/**/*.{ts,tsx}", "src/lib/game/**/*.ts"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Output của `netlify dev` / `netlify build`.
    ".netlify/**",
  ]),
]);

export default eslintConfig;
