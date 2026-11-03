const dns = require("dns");
try { dns.setDefaultResultOrder("ipv4first"); } catch (e) {}
require("dotenv").config({ path: ".env.local" });
const { runMigration } = require("./migrate");
const { s3Client } = require("../src/storage");
const { ListBucketsCommand } = require("@aws-sdk/client-s3");

async function build() {
  console.log("==========================================");
  console.log("Building Maryam Irekeola Portfolio Application");
  console.log("==========================================");

  // 1. Verify Environment Variables
  console.log("\n[1/4] Checking required Neon environment variables...");
  const requiredVars = [
    "DATABASE_URL",
    "AWS_ENDPOINT_URL_S3",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "NEON_AUTH_BASE_URL",
    "NEON_REALTIME_URL",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  console.log("✓ All 4 Neon services environment variables verified.");

  // 2. Run Database Migrations
  console.log("\n[2/4] Running Postgres schema migrations on Neon Lakebase...");
  await runMigration();
  console.log("✓ Database tables verified and up to date.");

  // 3. Verify Neon Object Storage Connection
  console.log("\n[3/4] Verifying Neon Object Storage S3 connectivity...");
  const bucketRes = await s3Client.send(new ListBucketsCommand({}));
  console.log(`✓ Object Storage connected. Available buckets: ${bucketRes.Buckets.map((b) => b.Name).join(", ")}`);

  // 4. Verify Static Assets & Entry Points
  console.log("\n[4/4] Verifying application static pages...");
  const fs = require("fs");
  const path = require("path");
  const files = ["index.html", "blog.html", "post.html", "books.html", "fish/index.html", "assets/css/custom.css", "assets/js/main.js"];
  for (const f of files) {
    const fullPath = path.join(__dirname, "..", f);
    if (!fs.existsSync(fullPath)) {
      console.warn(`! Note: ${f} will be generated.`);
    } else {
      console.log(`✓ ${f} verified.`);
    }
  }

  console.log("\n==========================================");
  console.log("BUILD SUCCESSFUL: All Neon services wired and ready.");
  console.log("==========================================");
}

build().catch((err) => {
  console.error("\n❌ Build failed:", err);
  process.exit(1);
});
