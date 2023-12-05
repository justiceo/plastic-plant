const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: [
      "script.ts",
    ],
    bundle: true,
    minify: false,
    sourcemap: true,   
    outdir: "out",
    target: ["chrome116"], // https://en.wikipedia.org/wiki/Google_Chrome_version_history
  })
  .catch((err) => {
    console.error(err);
  });
