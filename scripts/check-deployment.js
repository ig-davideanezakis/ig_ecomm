/**
 * Monitor Vercel deployment status.
 *
 * Usage:
 *   node scripts/check-deployment.js <deployment-url-or-id>
 *
 * Or to check the latest deployment:
 *   VERCEL_TOKEN="..." node scripts/check-deployment.js latest
 *
 * Requires VERCEL_TOKEN environment variable.
 * The token can be created at: https://vercel.com/account/tokens
 */

const https = require("https");

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "";

if (!TOKEN) {
  console.error("Error: VERCEL_TOKEN environment variable is not set.");
  console.error("Create a token at https://vercel.com/account/tokens");
  process.exit(1);
}

const target = process.argv[2];

if (!target) {
  console.error("Usage: node scripts/check-deployment.js <deployment-id | latest>");
  process.exit(1);
}

async function api(path) {
  const teamParam = TEAM_ID ? `&teamId=${TEAM_ID}` : "";
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://api.vercel.com${path}${teamParam}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  let deploymentId = target;

  if (target === "latest") {
    // Get latest deployment
    const list = await api(`/v11/deployments?limit=1&projectId=${PROJECT_ID}`);
    if (!list.deployments || list.deployments.length === 0) {
      console.error("No deployments found.");
      process.exit(1);
    }
    deploymentId = list.deployments[0].uid || list.deployments[0].url;
    console.log(`Latest deployment: ${list.deployments[0].url}`);
    console.log(`State: ${list.deployments[0].state}`);
  }

  // Get deployment details
  const deployment = await api(`/v11/deployments/${deploymentId}`);

  console.log(`\nDeployment: ${deployment.url}`);
  console.log(`State: ${deployment.state}`);
  console.log(`Created: ${deployment.createdAt}`);
  console.log(`Builder: ${deployment.builder?.version || "N/A"}`);

  if (deployment.state === "READY") {
    console.log(`\n✓ Deployment ready!`);
    console.log(`  https://${deployment.url}`);
    process.exit(0);
  } else if (deployment.state === "ERROR") {
    console.log(`\n✗ Deployment failed!`);
    if (deployment.error) {
      console.log(`  Error: ${deployment.error.code || "Unknown"}`);
      console.log(`  ${deployment.error.message || ""}`);
    }
    process.exit(1);
  } else {
    console.log(`\n⏳ Deployment in progress (${deployment.state})...`);
  }
}

main().catch((err) => {
  console.error("Script error:", err.message);
  process.exit(1);
});
