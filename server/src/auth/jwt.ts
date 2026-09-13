import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET_KEY } from "../config";

const ALG = "HS256";
const EXPIRY = "7d"; 

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)  // → `sub` claim
    .setIssuedAt()       // → `iat`
    .setExpirationTime(EXPIRY) // → `exp`
    .sign(JWT_SECRET_KEY);
}

export async function verifyToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, JWT_SECRET_KEY, { algorithms: [ALG] });
  if (!payload.sub) throw new Error("token missing sub");
  return payload.sub;
}