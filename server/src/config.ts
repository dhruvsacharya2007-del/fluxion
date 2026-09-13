const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
  throw new Error(
    "JWT_SECRET must be set and at least 32 bytes (e.g. `openssl rand -base64 32`)",
  );
}

export const JWT_SECRET_KEY = new TextEncoder().encode(secret); // jose wants a Uint8Array
export const IS_PROD = process.env.NODE_ENV === "production";
export const COOKIE_NAME = "token";