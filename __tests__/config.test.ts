/**
 * Tests for MCP Server Configuration
 *
 * Tests environment detection and configuration resolution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Store original env
const originalEnv = process.env;

describe("config", () => {
  beforeEach(() => {
    // Reset modules to re-evaluate config with new env vars
    vi.resetModules();
    // Clone the original env
    process.env = { ...originalEnv };
    // Clear any AgeKey env vars
    delete process.env["AGEKEY_ENV"];
    delete process.env["AGEKEY_PORTAL_URL"];
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe("default configuration", () => {
    it("should default to production when no env vars set", async () => {
      const { ENVIRONMENT, PORTAL_URL, API_URL } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("production");
      expect(PORTAL_URL).toBe("https://portal.agekey.org");
      expect(API_URL).toBe("https://portal.agekey.org/api");
    });
  });

  describe("environment detection via AGEKEY_ENV", () => {
    it("should detect local environment", async () => {
      process.env["AGEKEY_ENV"] = "local";
      const { ENVIRONMENT, PORTAL_URL } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("local");
      expect(PORTAL_URL).toBe("http://localhost:3005");
    });

    it("should handle localhost alias", async () => {
      process.env["AGEKEY_ENV"] = "localhost";
      const { ENVIRONMENT } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("local");
    });

    it("should detect dev environment", async () => {
      process.env["AGEKEY_ENV"] = "dev";
      const { ENVIRONMENT, PORTAL_URL } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("dev");
      expect(PORTAL_URL).toBe("https://portal.dev.agekey.org");
    });

    it("should handle development alias", async () => {
      process.env["AGEKEY_ENV"] = "development";
      const { ENVIRONMENT } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("dev");
    });

    it("should detect staging environment", async () => {
      process.env["AGEKEY_ENV"] = "staging";
      const { ENVIRONMENT, PORTAL_URL } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("staging");
      expect(PORTAL_URL).toBe("https://portal.staging.agekey.org");
    });

    it("should handle stage alias", async () => {
      process.env["AGEKEY_ENV"] = "stage";
      const { ENVIRONMENT } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("staging");
    });

    it("should detect production environment", async () => {
      process.env["AGEKEY_ENV"] = "production";
      const { ENVIRONMENT, PORTAL_URL } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("production");
      expect(PORTAL_URL).toBe("https://portal.agekey.org");
    });

    it("should handle prod alias", async () => {
      process.env["AGEKEY_ENV"] = "prod";
      const { ENVIRONMENT } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("production");
    });

    it("should be case insensitive", async () => {
      process.env["AGEKEY_ENV"] = "STAGING";
      const { ENVIRONMENT } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("staging");
    });
  });

  describe("custom portal URL", () => {
    it("should use custom URL when AGEKEY_PORTAL_URL is set", async () => {
      process.env["AGEKEY_PORTAL_URL"] = "https://custom.agekey.test";
      const { ENVIRONMENT, PORTAL_URL, API_URL } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("custom");
      expect(PORTAL_URL).toBe("https://custom.agekey.test");
      expect(API_URL).toBe("https://custom.agekey.test/api");
    });

    it("should allow overriding preset URL with custom URL", async () => {
      process.env["AGEKEY_ENV"] = "staging";
      process.env["AGEKEY_PORTAL_URL"] = "https://override.agekey.test";
      const { ENVIRONMENT, PORTAL_URL } = await import("../src/config.js");

      expect(ENVIRONMENT).toBe("staging");
      expect(PORTAL_URL).toBe("https://override.agekey.test");
    });
  });

  describe("auth endpoints", () => {
    it("should have correct auth endpoint paths", async () => {
      const { AUTH_ENDPOINTS, PORTAL_URL } = await import("../src/config.js");

      expect(AUTH_ENDPOINTS.deviceCode).toBe(`${PORTAL_URL}/api/mcp/auth/device-code`);
      expect(AUTH_ENDPOINTS.token).toBe(`${PORTAL_URL}/api/mcp/auth/token`);
      expect(AUTH_ENDPOINTS.verify).toBe(`${PORTAL_URL}/api/mcp/auth/verify`);
    });
  });

  describe("MCP client ID", () => {
    it("should have the correct MCP client ID", async () => {
      const { MCP_CLIENT_ID } = await import("../src/config.js");

      expect(MCP_CLIENT_ID).toBe("agekey-mcp-server");
    });
  });
});
