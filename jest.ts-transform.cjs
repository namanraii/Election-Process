/**
 * Minimal Jest transformer: strips TypeScript types from src/js/*.ts using the
 * project's own `typescript` package, so the existing Jest suites can import
 * the TS sources without adding ts-jest or Babel.
 *
 * Vite injects `import.meta.env` at build time; under Jest it is undefined, so
 * modules that read it get an empty object (unset VITE_* vars stay undefined,
 * matching Vite's behaviour).
 */
const crypto = require("crypto");
const fs = require("fs");
const ts = require("typescript");

const SELF = fs.readFileSync(__filename, "utf8");

module.exports = {
  // Include this file in the cache key so edits here invalidate cached output.
  getCacheKey(sourceText, sourcePath) {
    return crypto
      .createHash("sha1")
      .update(SELF)
      .update(ts.version)
      .update(sourcePath)
      .update(sourceText)
      .digest("hex");
  },
  process(sourceText, sourcePath) {
    const envShim = sourceText.includes("import.meta.env")
      ? "if (!import.meta.env) import.meta.env = {};\n"
      : "";
    const { outputText, sourceMapText } = ts.transpileModule(
      envShim + sourceText,
      {
        fileName: sourcePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          sourceMap: true,
          inlineSources: true,
        },
      },
    );
    return { code: outputText, map: sourceMapText };
  },
};
