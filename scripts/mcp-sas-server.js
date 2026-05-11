import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

/**
 * NBSC SAS System MCP Server
 * Exposes tools for debugging, auditing, and health checks.
 */

const server = new McpServer({
  name: "SAS System Server",
  version: "1.0.0",
});

// Tool: Check system health
server.tool(
  "system_health",
  "Check the status of the SAS system and connectivity to GAS backend",
  {},
  async () => {
    // In a real scenario, this would ping the GAS URL.
    // For now, we check the presence of env.js and configuration.
    const envPath = path.resolve(process.cwd(), "env.js");
    const hasEnv = fs.existsSync(envPath);
    
    return {
      content: [{ 
        type: "text", 
        text: `SAS System Health:
- Local Environment Config (env.js): ${hasEnv ? "✅ FOUND" : "❌ MISSING"}
- Project Root: ${process.cwd()}
- Readiness: ${hasEnv ? "Operational" : "Requires Configuration"}` 
      }],
    };
  }
);

// Tool: Security Audit
server.tool(
  "security_audit",
  "Identify potential security loopholes in Backend.gs",
  {},
  async () => {
    const backendPath = path.resolve(process.cwd(), "Backend.gs");
    if (!fs.existsSync(backendPath)) {
      return { content: [{ type: "text", text: "Error: Backend.gs not found." }] };
    }

    const content = fs.readFileSync(backendPath, "utf8");
    const unauthenticatedHandlers = [
      "handleGetAvailableEvents",
      "handleGetWindowStatus",
      "handleCheckTicket"
    ];

    const findings = [];
    unauthenticatedHandlers.forEach(handler => {
      const regex = new RegExp(`function ${handler}\\(payload\\) {[^}]*(verifyAuthorized|verifyAdminOnly|verifyScanner)`, "s");
      if (!regex.test(content)) {
        findings.push(`- ⚠️ ${handler}: Missing authorization check (verifyAuthorized, verifyAdminOnly, or verifyScanner).`);
      }
    });

    return {
      content: [{ 
        type: "text", 
        text: findings.length > 0 
          ? "Security Audit Findings:\n" + findings.join("\n") 
          : "Security Audit: No obvious unauthenticated handlers found."
      }],
    };
  }
);

// Tool: Deployment Check
server.tool(
  "deployment_check",
  "Validate local build artifacts before deployment",
  {},
  async () => {
    const distPath = path.resolve(process.cwd(), "dist");
    if (!fs.existsSync(distPath)) {
      return { content: [{ type: "text", text: "Error: dist folder not found. Run 'npm run build' first." }] };
    }

    const requiredFiles = [
      "env.js",
      "index.html",
      "src/utils/app-bridge.js"
    ];

    const results = requiredFiles.map(file => {
      const exists = fs.existsSync(path.join(distPath, file));
      return `${exists ? "✅" : "❌"} ${file}`;
    });

    return {
      content: [{ 
        type: "text", 
        text: "Deployment Readiness:\n" + results.join("\n")
      }],
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
server.connect(transport).catch(error => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
