import "express"; // makes this a module → `declare global` AUGMENTS instead of replacing

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}