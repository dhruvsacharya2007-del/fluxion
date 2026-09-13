import { Router } from "express";
import bcrypt from "bcryptjs";
import { registerSchema, type RegisterInput } from "@fluxion/shared";
import { validate } from "../middleware/validate";
import { prisma } from "../db";
import { ConflictError } from "../errors";

const BCRYPT_COST = 12;

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), async (req, res) => {
  const { email, password } = req.body as RegisterInput; // sound: validate() ran first
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true }, // passwordHash can't leak — not selected
    });
    res.status(201).json({ user });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError("EMAIL_ALREADY_REGISTERED", "Email is already registered");
    }
    throw err; // unknown → central handler → 500
  }
});

import { loginSchema, type LoginInput } from "@fluxion/shared";
import { UnauthorizedError } from "../errors";
import { signToken } from "../auth/jwt";
import { setAuthCookie, clearAuthCookie } from "../auth/cookie";
import { requireAuth } from "../middleware/requireAuth";


const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

authRouter.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as LoginInput;
  const user = await prisma.user.findUnique({ where: { email } });

  const match = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !match) {
    throw new UnauthorizedError("INVALID_CREDENTIALS", "Invalid email or password");
  }

  const token = await signToken(user.id);
  setAuthCookie(res, token);
  res.status(200).json({ user: { id: user.id, email: user.email } });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! }, 
    select: { id: true, email: true },
  });
  
  if (!user) throw new UnauthorizedError("UNAUTHENTICATED", "Invalid or expired session");
  res.status(200).json({ user });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res); 
  res.status(204).end();
});