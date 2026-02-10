/**
 * Utility Tools
 *
 * MCP tools for JWT decoding, error explanation, and code samples.
 * These tools don't require authentication.
 *
 * @values DAD - Helpful utilities for developers
 */

import { z } from "zod";
import type {
  ToolResult,
  DecodedJWT,
  ErrorDiagnosis,
  CodeSample,
  CodeLanguage,
  FlowType,
  FlowStep,
} from "../types.js";

// =============================================================================
// JWT Decode
// =============================================================================

export interface DecodeJwtInput {
  token: string;
}

export interface DecodeJwtResult {
  header: DecodedJWT["header"];
  payload: DecodedJWT["payload"];
  isExpired: boolean;
  expiresIn?: string;
  explanation: string;
}

export async function decodeJwt(
  input: DecodeJwtInput
): Promise<ToolResult<DecodeJwtResult>> {
  try {
    const parts = input.token.split(".");
    if (parts.length !== 3) {
      return {
        success: false,
        error: "Invalid JWT format. Expected 3 parts separated by dots.",
      };
    }

    const header = JSON.parse(atob(parts[0]!));
    const payload = JSON.parse(atob(parts[1]!));

    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : false;

    let expiresIn: string | undefined;
    if (payload.exp) {
      const diffSeconds = payload.exp - now;
      if (diffSeconds > 0) {
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        expiresIn = `${hours}h ${minutes}m`;
      } else {
        expiresIn = `Expired ${Math.abs(Math.floor(diffSeconds / 60))} minutes ago`;
      }
    }

    // Build explanation
    let explanation = "";
    if (payload.age_thresholds) {
      const thresholds = Object.entries(payload.age_thresholds as Record<string, boolean>)
        .map(([age, passed]) => `${age}+: ${passed ? "✓ Yes" : "✗ No"}`)
        .join(", ");
      explanation = `Age verification result: ${thresholds}`;
    } else if (payload.sub) {
      explanation = `Token for subject: ${payload.sub}`;
    }

    if (isExpired) {
      explanation = `⚠️ EXPIRED! ${explanation}`;
    }

    return {
      success: true,
      data: {
        header,
        payload,
        isExpired,
        expiresIn,
        explanation,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to decode JWT: ${error instanceof Error ? error.message : "Invalid token"}`,
    };
  }
}

// =============================================================================
// Error Explanation
// =============================================================================

export interface ExplainErrorInput {
  errorCode: string;
  errorDescription?: string;
}

const ERROR_DIAGNOSES: Record<string, Omit<ErrorDiagnosis, "code">> = {
  state_mismatch: {
    title: "State Mismatch",
    description: "The state parameter in the callback doesn't match the authorization request.",
    causes: [
      "User's session expired before completing the flow",
      "Browser back button was used",
      "Multiple tabs with different sessions",
    ],
    solutions: [
      "Increase session timeout (15+ minutes recommended)",
      "Store state in localStorage/sessionStorage",
      "Generate fresh state for each request",
    ],
    docsUrl: "https://docs.agekey.org/troubleshooting#state-mismatch",
  },
  access_denied: {
    title: "Access Denied",
    description: "The user declined the verification request.",
    causes: [
      "User clicked 'Cancel' or 'Deny'",
      "User closed the verification window",
      "User doesn't have an AgeKey (for Use AgeKey flow)",
    ],
    solutions: [
      "This is expected behavior when users decline",
      "Show a friendly message explaining why verification is needed",
      "Offer to try again or alternative verification methods",
    ],
    docsUrl: "https://docs.agekey.org/guides/handling-denials",
  },
  invalid_request: {
    title: "Invalid Request",
    description: "The authorization request was malformed or missing required parameters.",
    causes: [
      "Missing required parameter (client_id, redirect_uri, etc.)",
      "Invalid redirect_uri (not registered)",
      "Malformed claims parameter",
    ],
    solutions: [
      "Check redirect URI is registered in Developer Portal",
      "Verify all required OIDC parameters are included",
      "Use age thresholds as numbers: [13, 18, 21]",
    ],
    docsUrl: "https://docs.agekey.org/api-reference/use-agekey",
  },
  invalid_client: {
    title: "Invalid Client",
    description: "The client_id is not recognized or credentials are invalid.",
    causes: [
      "Wrong client_id (test vs live environment)",
      "Application deleted or disabled",
      "Credentials have been rotated",
    ],
    solutions: [
      "Verify correct client_id for your environment",
      "Check Developer Portal to confirm app is active",
      "Use test credentials (ak_test_*) for sandbox",
    ],
    docsUrl: "https://docs.agekey.org/troubleshooting#invalid-client",
  },
  expired_token: {
    title: "Token Expired",
    description: "The JWT has expired and is no longer valid.",
    causes: [
      "Too much time between receiving and validating the token",
      "System clock out of sync",
      "Token stored and reused later",
    ],
    solutions: [
      "Validate tokens immediately upon receipt",
      "Ensure server clock is synchronized (NTP)",
      "Don't store or cache tokens",
    ],
    docsUrl: "https://docs.agekey.org/guides/jwt-validation#expiration",
  },
};

export async function explainError(
  input: ExplainErrorInput
): Promise<ToolResult<ErrorDiagnosis>> {
  const normalizedCode = input.errorCode.toLowerCase().replace(/\s+/g, "_");
  const diagnosis = ERROR_DIAGNOSES[normalizedCode];

  if (diagnosis) {
    return {
      success: true,
      data: {
        code: normalizedCode,
        ...diagnosis,
      },
    };
  }

  return {
    success: true,
    data: {
      code: input.errorCode,
      title: "Unknown Error",
      description: input.errorDescription || `An error occurred: ${input.errorCode}`,
      causes: ["This error code is not in our database"],
      solutions: [
        "Check the browser console for more details",
        "Review the AgeKey documentation",
        "Contact support if the issue persists",
      ],
      docsUrl: "https://docs.agekey.org/support",
    },
  };
}

// =============================================================================
// Code Samples
// =============================================================================

export interface GetCodeSampleInput {
  appId?: string;
  flow: FlowType;
  step: FlowStep;
  language: CodeLanguage;
}

// Code templates (simplified versions)
const CODE_TEMPLATES: Record<CodeLanguage, Record<FlowType, Record<FlowStep, string>>> = {
  typescript: {
    use: {
      redirect: `import { AgeKey } from '@agekey/sdk';

const agekey = new AgeKey({
  clientId: '{{clientId}}',
  redirectUri: '{{redirectUri}}',
});

const { url, state, nonce } = agekey.useAgeKey.getAuthorizationUrl({
  ageThresholds: [18, 21],
});

// Store state/nonce in session, then redirect
window.location.href = url;`,
      callback: `import { AgeKey } from '@agekey/sdk';

const agekey = new AgeKey({
  clientId: '{{clientId}}',
  redirectUri: '{{redirectUri}}',
});

const result = agekey.useAgeKey.handleCallback(
  window.location.href,
  { state, nonce }
);

if (result.ageThresholds['18']) {
  // User is 18+
}`,
    },
    create: {
      redirect: `// Server-side only
import { AgeKey } from '@agekey/sdk';

const agekey = new AgeKey({
  clientId: '{{clientId}}',
  clientSecret: '{{clientSecret}}',
  redirectUri: '{{redirectUri}}',
});

const { authUrl } = await agekey.createAgeKey.initiate({
  method: 'id_doc_scan',
  age: { date_of_birth: '2000-01-15' },
  verifiedAt: new Date(),
});

// Redirect user to authUrl`,
      callback: `const result = agekey.createAgeKey.handleCallback(callbackUrl);

if (result.success) {
  // AgeKey created successfully
}`,
    },
  },
  python: {
    use: {
      redirect: `import secrets
from urllib.parse import urlencode

state = secrets.token_urlsafe(32)
nonce = secrets.token_urlsafe(32)

# Store in session
session['agekey_state'] = state
session['agekey_nonce'] = nonce

params = {
    "client_id": "{{clientId}}",
    "redirect_uri": "{{redirectUri}}",
    "response_type": "id_token",
    "scope": "openid",
    "state": state,
    "nonce": nonce,
    "claims": '{"age_thresholds":[18,21]}'
}

auth_url = "https://api-test.agekey.org/v1/oidc/use?" + urlencode(params)`,
      callback: `import jwt

# Verify state matches
if params['state'] != session['agekey_state']:
    raise Exception("State mismatch")

# Decode JWT
claims = jwt.decode(params['id_token'], options={"verify_signature": False})

if claims['age_thresholds'].get('18'):
    # User is 18+
    pass`,
    },
    create: {
      redirect: `import requests

response = requests.post(
    "https://api-test.agekey.org/v1/oidc/create/par",
    data={
        "client_id": "{{clientId}}",
        "client_secret": "{{clientSecret}}",
        "redirect_uri": "{{redirectUri}}",
        "response_type": "none",
        "authorization_details": '{"method":"id_doc_scan",...}'
    }
)

request_uri = response.json()["request_uri"]
auth_url = f"https://api-test.agekey.org/v1/oidc/create?client_id={{clientId}}&request_uri={request_uri}"`,
      callback: `if "error" in params:
    if params["error"] == "access_denied":
        # User declined
        pass
else:
    # AgeKey created successfully
    pass`,
    },
  },
  go: {
    use: {
      redirect: `state := generateToken()
nonce := generateToken()

// Store in session
session.Set("agekey_state", state)

params := url.Values{
    "client_id":     {"{{clientId}}"},
    "redirect_uri":  {"{{redirectUri}}"},
    "response_type": {"id_token"},
    "scope":         {"openid"},
    "state":         {state},
    "nonce":         {nonce},
    "claims":        {string(claimsJSON)},
}

authURL := "https://api-test.agekey.org/v1/oidc/use?" + params.Encode()`,
      callback: `// Verify state
if params.Get("state") != session.Get("agekey_state") {
    return errors.New("state mismatch")
}

// Decode JWT
token, _ := jwt.Parse(params.Get("id_token"), nil)
claims := token.Claims.(jwt.MapClaims)

if claims["age_thresholds"].(map[string]interface{})["18"] == true {
    // User is 18+
}`,
    },
    create: {
      redirect: `resp, _ := http.PostForm(parEndpoint, url.Values{
    "client_id":             {"{{clientId}}"},
    "client_secret":         {"{{clientSecret}}"},
    "redirect_uri":          {"{{redirectUri}}"},
    "response_type":         {"none"},
    "authorization_details": {string(authDetails)},
})

var result struct{ RequestURI string \`json:"request_uri"\` }
json.NewDecoder(resp.Body).Decode(&result)

authURL := authEndpoint + "?client_id={{clientId}}&request_uri=" + url.QueryEscape(result.RequestURI)`,
      callback: `if err := r.URL.Query().Get("error"); err != "" {
    if err == "access_denied" {
        // User declined
    }
} else {
    // Success
}`,
    },
  },
  java: {
    use: {
      redirect: `String state = generateToken();
String nonce = generateToken();

// Store in session
session.setAttribute("agekey_state", state);

String claims = "{\\"age_thresholds\\":[18,21]}";
String authUrl = AUTHORITY + "?" + String.join("&",
    "client_id={{clientId}}",
    "redirect_uri=" + URLEncoder.encode("{{redirectUri}}", "UTF-8"),
    "response_type=id_token",
    "scope=openid",
    "state=" + state,
    "nonce=" + nonce,
    "claims=" + URLEncoder.encode(claims, "UTF-8")
);`,
      callback: `// Verify state
if (!params.get("state").equals(session.getAttribute("agekey_state"))) {
    throw new SecurityException("State mismatch");
}

// Decode JWT
DecodedJWT jwt = JWT.decode(params.get("id_token"));
Map<String, Boolean> thresholds = jwt.getClaim("age_thresholds").asMap();

if (thresholds.get("18")) {
    // User is 18+
}`,
    },
    create: {
      redirect: `HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create(PAR_ENDPOINT))
    .POST(HttpRequest.BodyPublishers.ofString(String.join("&",
        "client_id={{clientId}}",
        "client_secret={{clientSecret}}",
        "redirect_uri=" + URLEncoder.encode("{{redirectUri}}", "UTF-8"),
        "response_type=none",
        "authorization_details=" + URLEncoder.encode(authDetails, "UTF-8")
    )))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
String requestUri = parseJson(response.body()).get("request_uri");`,
      callback: `if (params.containsKey("error")) {
    if ("access_denied".equals(params.get("error"))) {
        // User declined
    }
} else {
    // Success
}`,
    },
  },
  rust: {
    use: {
      redirect: `use rand::Rng;
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde_json::json;

const CLIENT_ID: &str = "{{clientId}}";
const REDIRECT_URI: &str = "{{redirectUri}}";
const AUTHORITY: &str = "https://api-test.agekey.org/v1/oidc/use";

fn generate_token() -> String {
    let bytes: [u8; 32] = rand::thread_rng().gen();
    URL_SAFE_NO_PAD.encode(bytes)
}

fn build_auth_url(session: &mut Session) -> String {
    let state = generate_token();
    let nonce = generate_token();
    
    // Store in session
    session.set("agekey_state", &state);
    session.set("agekey_nonce", &nonce);
    
    let claims = json!({"age_thresholds": [18, 21]}).to_string();
    
    format!(
        "{}?client_id={}&redirect_uri={}&response_type=id_token&scope=openid&state={}&nonce={}&claims={}",
        AUTHORITY, CLIENT_ID,
        urlencoding::encode(REDIRECT_URI),
        state, nonce,
        urlencoding::encode(&claims)
    )
}`,
      callback: `use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
struct Claims {
    age_thresholds: HashMap<String, bool>,
    sub: String,
}

fn handle_callback(callback_url: &str, session: &Session) -> Result<Claims, String> {
    // Parse fragment
    let fragment = callback_url.split('#').nth(1).ok_or("No fragment")?;
    let params: HashMap<_, _> = url::form_urlencoded::parse(fragment.as_bytes()).collect();
    
    // Verify state
    let state = params.get("state").ok_or("Missing state")?;
    if state != session.get("agekey_state").unwrap_or_default() {
        return Err("State mismatch".into());
    }
    
    // Decode JWT (add signature verification in production!)
    let token = params.get("id_token").ok_or("Missing id_token")?;
    let mut validation = Validation::new(Algorithm::RS256);
    validation.insecure_disable_signature_validation();
    
    let decoded = decode::<Claims>(token, &DecodingKey::from_secret(&[]), &validation)
        .map_err(|e| e.to_string())?;
    
    if *decoded.claims.age_thresholds.get("18").unwrap_or(&false) {
        // User is 18+
    }
    
    Ok(decoded.claims)
}`,
    },
    create: {
      redirect: `use reqwest::Client;
use serde_json::json;
use chrono::Utc;

const CLIENT_ID: &str = "{{clientId}}";
const CLIENT_SECRET: &str = "{{clientSecret}}";
const REDIRECT_URI: &str = "{{redirectUri}}";
const PAR_ENDPOINT: &str = "https://api-test.agekey.org/v1/oidc/create/par";
const AUTH_ENDPOINT: &str = "https://api-test.agekey.org/v1/oidc/create";

async fn initiate_create_agekey(dob: &str) -> Result<String, reqwest::Error> {
    let auth_details = json!({
        "method": "id_doc_scan",
        "age": {"date_of_birth": dob},
        "verified_at": Utc::now().to_rfc3339()
    });
    
    let client = Client::new();
    let response: serde_json::Value = client.post(PAR_ENDPOINT)
        .form(&[
            ("client_id", CLIENT_ID),
            ("client_secret", CLIENT_SECRET),
            ("redirect_uri", REDIRECT_URI),
            ("response_type", "none"),
            ("authorization_details", &auth_details.to_string()),
        ])
        .send().await?
        .json().await?;
    
    let request_uri = response["request_uri"].as_str().unwrap();
    
    Ok(format!(
        "{}?client_id={}&request_uri={}",
        AUTH_ENDPOINT, CLIENT_ID, urlencoding::encode(request_uri)
    ))
}`,
      callback: `fn handle_create_callback(callback_url: &str) -> Result<(), String> {
    let url = url::Url::parse(callback_url).map_err(|e| e.to_string())?;
    let params: HashMap<_, _> = url.query_pairs().collect();
    
    if let Some(error) = params.get("error") {
        if error == "access_denied" {
            return Err("User declined to create AgeKey".into());
        }
        return Err(format!("Error: {}", error));
    }
    
    // Success - AgeKey was created
    Ok(())
}`,
    },
  },
};

const INSTALL_COMMANDS: Record<CodeLanguage, string> = {
  typescript: "npm install @agekey/sdk",
  python: "pip install pyjwt requests",
  go: "go get github.com/golang-jwt/jwt/v5",
  java: "// Maven: com.auth0:java-jwt:4.4.0",
  rust: "cargo add jsonwebtoken reqwest serde serde_json",
};

export async function getCodeSample(
  input: GetCodeSampleInput
): Promise<ToolResult<CodeSample>> {
  const template = CODE_TEMPLATES[input.language]?.[input.flow]?.[input.step];

  if (!template) {
    return {
      success: false,
      error: `No code sample available for ${input.language}/${input.flow}/${input.step}`,
    };
  }

  // Replace placeholders with actual values or defaults
  const code = template
    .replace(/\{\{clientId\}\}/g, input.appId || "ak_test_your_app_id")
    .replace(/\{\{clientSecret\}\}/g, "sk_test_your_secret")
    .replace(/\{\{redirectUri\}\}/g, "http://localhost:3000/callback");

  return {
    success: true,
    data: {
      language: input.language,
      code,
      installCommand: INSTALL_COMMANDS[input.language],
      docsUrl: `https://docs.agekey.org/guides/${input.flow}-agekey`,
    },
  };
}

// =============================================================================
// Tool Definitions for MCP
// =============================================================================

export const utilityTools = {
  decode_jwt: {
    name: "decode_jwt",
    description: "Decode and explain an AgeKey JWT token. Shows header, payload, expiration status, and human-readable explanation of age verification results.",
    inputSchema: z.object({
      token: z.string().describe("The JWT token to decode"),
    }),
    handler: decodeJwt,
  },

  explain_error: {
    name: "explain_error",
    description: "Get a detailed explanation of an AgeKey/OIDC error code including common causes, solutions, and documentation links.",
    inputSchema: z.object({
      errorCode: z.string().describe("The error code (e.g., 'state_mismatch', 'access_denied', 'invalid_request')"),
      errorDescription: z.string().optional().describe("Optional error description from the callback"),
    }),
    handler: explainError,
  },

  get_code_sample: {
    name: "get_code_sample",
    description: "Get integration code samples for AgeKey in various languages. Optionally pre-fill with your app credentials.",
    inputSchema: z.object({
      appId: z.string().optional().describe("Optional application ID to pre-fill in the code sample"),
      flow: z.enum(["use", "create"]).describe("'use' for age verification, 'create' for storing verification"),
      step: z.enum(["redirect", "callback"]).describe("'redirect' for initiating the flow, 'callback' for handling the response"),
      language: z.enum(["typescript", "python", "go", "java", "rust"]).describe("Programming language for the code sample"),
    }),
    handler: getCodeSample,
  },
};
