import { build } from "esbuild";
import fs from "fs";

async function buildLambda() {
    // Ensure dist exists
    if (!fs.existsSync("dist")) {
        fs.mkdirSync("dist");
    }

    console.log("Building Lambda function...");

    await build({
        entryPoints: ["server/lambda.ts"],
        bundle: true,
        outfile: "dist/lambda.js",
        platform: "node",
        target: "node20",
        format: "cjs",
        sourcemap: true,
        // AWS SDK v3 is available in Node.js 18/20 runtime, but for stability we might want to bundle specific versions.
        // However, excluding it reduces size significantly.
        // If we use features not in the runtime version, we should bundle.
        // For now, exclude it as per standard practice for lean lambdas.
        external: ["@aws-sdk/*"],
        logLevel: "info",
        minify: true,
        treeShaking: true,
    });

    console.log("Lambda build complete: dist/lambda.js");
}

buildLambda().catch((err) => {
    console.error(err);
    process.exit(1);
});
