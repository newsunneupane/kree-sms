import { createRequire } from "module";
import fs from "fs";
import path from "path";

// Temporary diagnostic: reports whether the pg driver is actually present
// inside the Vercel lambda. Zero app dependencies on purpose.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const require = createRequire(import.meta.url);
  const report = {
    node: process.version,
    cwd: process.cwd(),
  };

  try {
    report.pgResolved = require.resolve("pg");
  } catch (e) {
    report.pgResolveError = `${e.code || "?"}: ${e.message}`;
  }

  try {
    require("pg");
    report.pgLoad = "ok";
  } catch (e) {
    report.pgLoadError = e.message?.slice(0, 300);
  }

  try {
    report.sequelizeResolved = require.resolve("sequelize");
  } catch (e) {
    report.sequelizeResolveError = `${e.code || "?"}: ${e.message}`;
  }

  for (const p of ["node_modules/pg/package.json", "node_modules/sequelize/package.json"]) {
    try {
      report[p] = fs.existsSync(path.join(process.cwd(), p)) ? "exists" : "missing";
    } catch (e) {
      report[p] = `check-failed: ${e.message}`;
    }
  }

  return Response.json(report);
}
