/**
 * Tests for MCP Utility Tools
 *
 * Tests JWT decoding, error explanation, and code sample generation.
 */

import { describe, it, expect } from "vitest";
import { decodeJwt, explainError, getCodeSample } from "../src/tools/utilities.js";

describe("utility tools", () => {
  describe("decodeJwt", () => {
    // Helper to create a valid JWT structure
    function createJwt(
      header: object,
      payload: object,
      signature: string = "fake_signature"
    ): string {
      const h = btoa(JSON.stringify(header));
      const p = btoa(JSON.stringify(payload));
      return `${h}.${p}.${signature}`;
    }

    it("should decode a valid JWT", async () => {
      const header = { alg: "RS256", typ: "JWT" };
      const payload = {
        sub: "user123",
        iss: "agekey",
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      const token = createJwt(header, payload);

      const result = await decodeJwt({ token });

      expect(result.success).toBe(true);
      expect(result.data?.header.alg).toBe("RS256");
      expect(result.data?.payload.sub).toBe("user123");
      expect(result.data?.isExpired).toBe(false);
    });

    it("should detect expired tokens", async () => {
      const header = { alg: "RS256", typ: "JWT" };
      const payload = {
        sub: "user123",
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      const token = createJwt(header, payload);

      const result = await decodeJwt({ token });

      expect(result.success).toBe(true);
      expect(result.data?.isExpired).toBe(true);
      expect(result.data?.explanation).toContain("EXPIRED");
    });

    it("should calculate expiresIn for valid tokens", async () => {
      const header = { alg: "RS256", typ: "JWT" };
      const payload = {
        sub: "user123",
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
      };
      const token = createJwt(header, payload);

      const result = await decodeJwt({ token });

      expect(result.success).toBe(true);
      expect(result.data?.expiresIn).toMatch(/\d+h \d+m/);
    });

    it("should explain age verification results", async () => {
      const header = { alg: "RS256", typ: "JWT" };
      const payload = {
        sub: "user123",
        exp: Math.floor(Date.now() / 1000) + 3600,
        age_thresholds: {
          "13": true,
          "18": true,
          "21": false,
        },
      };
      const token = createJwt(header, payload);

      const result = await decodeJwt({ token });

      expect(result.success).toBe(true);
      expect(result.data?.explanation).toContain("Age verification result");
      expect(result.data?.explanation).toContain("18+:");
    });

    it("should fail on invalid JWT format - too few parts", async () => {
      const result = await decodeJwt({ token: "not.a.valid.jwt.with.too.many.parts" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid JWT format");
    });

    it("should fail on invalid JWT format - too few parts", async () => {
      const result = await decodeJwt({ token: "onlytwoparts.here" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid JWT format");
    });

    it("should fail on invalid base64 encoding", async () => {
      const result = await decodeJwt({ token: "!!!.!!!.!!!" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to decode JWT");
    });
  });

  describe("explainError", () => {
    it("should explain state_mismatch error", async () => {
      const result = await explainError({ errorCode: "state_mismatch" });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("State Mismatch");
      expect(result.data?.causes).toContain("User's session expired before completing the flow");
      expect(result.data?.solutions.length).toBeGreaterThan(0);
      expect(result.data?.docsUrl).toBeDefined();
    });

    it("should explain access_denied error", async () => {
      const result = await explainError({ errorCode: "access_denied" });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("Access Denied");
      expect(result.data?.causes).toContain("User clicked 'Cancel' or 'Deny'");
    });

    it("should explain invalid_request error", async () => {
      const result = await explainError({ errorCode: "invalid_request" });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("Invalid Request");
    });

    it("should explain invalid_client error", async () => {
      const result = await explainError({ errorCode: "invalid_client" });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("Invalid Client");
    });

    it("should explain expired_token error", async () => {
      const result = await explainError({ errorCode: "expired_token" });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("Token Expired");
    });

    it("should normalize error code with spaces to underscores", async () => {
      const result = await explainError({ errorCode: "state mismatch" });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("State Mismatch");
    });

    it("should be case insensitive", async () => {
      const result = await explainError({ errorCode: "STATE_MISMATCH" });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("State Mismatch");
    });

    it("should handle unknown error codes gracefully", async () => {
      const result = await explainError({
        errorCode: "unknown_error_code",
        errorDescription: "Something went wrong",
      });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("Unknown Error");
      expect(result.data?.description).toContain("Something went wrong");
    });

    it("should include doc URL for unknown errors", async () => {
      const result = await explainError({ errorCode: "unknown_error" });

      expect(result.success).toBe(true);
      expect(result.data?.docsUrl).toContain("support");
    });
  });

  describe("getCodeSample", () => {
    describe("TypeScript samples", () => {
      it("should return TypeScript Use AgeKey redirect sample", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "redirect",
          language: "typescript",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("import { AgeKey }");
        expect(result.data?.code).toContain("useAgeKey.getAuthorizationUrl");
        expect(result.data?.language).toBe("typescript");
      });

      it("should return TypeScript Use AgeKey callback sample", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "callback",
          language: "typescript",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("handleCallback");
      });

      it("should return TypeScript Create AgeKey redirect sample", async () => {
        const result = await getCodeSample({
          flow: "create",
          step: "redirect",
          language: "typescript",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("createAgeKey.initiate");
      });
    });

    describe("Python samples", () => {
      it("should return Python Use AgeKey redirect sample", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "redirect",
          language: "python",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("import secrets");
        expect(result.data?.code).toContain("session[");
        expect(result.data?.installCommand).toContain("pip install");
      });

      it("should return Python callback sample", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "callback",
          language: "python",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("jwt.decode");
      });
    });

    describe("Go samples", () => {
      it("should return Go Use AgeKey sample", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "redirect",
          language: "go",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("url.Values");
        expect(result.data?.installCommand).toContain("go get");
      });
    });

    describe("Java samples", () => {
      it("should return Java Use AgeKey sample", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "redirect",
          language: "java",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("String state");
        expect(result.data?.installCommand).toContain("Maven");
      });
    });

    describe("Rust samples", () => {
      it("should return Rust Use AgeKey redirect sample", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "redirect",
          language: "rust",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("fn generate_token");
        expect(result.data?.code).toContain("fn build_auth_url");
        expect(result.data?.installCommand).toContain("cargo add");
      });

      it("should return Rust Use AgeKey callback sample", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "callback",
          language: "rust",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("fn handle_callback");
        expect(result.data?.code).toContain("jsonwebtoken");
      });

      it("should return Rust Create AgeKey sample", async () => {
        const result = await getCodeSample({
          flow: "create",
          step: "redirect",
          language: "rust",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("async fn initiate_create_agekey");
        expect(result.data?.code).toContain("reqwest");
      });
    });

    describe("sample customization", () => {
      it("should replace placeholders with provided app ID", async () => {
        const result = await getCodeSample({
          appId: "ak_test_my_custom_app",
          flow: "use",
          step: "redirect",
          language: "typescript",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("ak_test_my_custom_app");
        expect(result.data?.code).not.toContain("{{clientId}}");
      });

      it("should use default values when app ID not provided", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "redirect",
          language: "typescript",
        });

        expect(result.success).toBe(true);
        expect(result.data?.code).toContain("ak_test_your_app_id");
      });

      it("should include docs URL", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "redirect",
          language: "typescript",
        });

        expect(result.success).toBe(true);
        expect(result.data?.docsUrl).toContain("docs.agekey.org");
      });
    });

    describe("error handling", () => {
      it("should fail for invalid language/flow/step combination", async () => {
        const result = await getCodeSample({
          flow: "use",
          step: "invalid_step" as "redirect",
          language: "typescript",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("No code sample available");
      });
    });
  });
});
