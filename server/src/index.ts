import "dotenv/config";
import "./config";

import express from "express";
import cookieParser from "cookie-parser";
import type { HealthResponse } from "@fluxion/shared";
import { authRouter } from "./routes/auth";
import { errorHandler } from "./middleware/errorHandler";
import { workflows } from "./routes/workflows";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  const body: HealthResponse = { status: "ok" };
  res.json(body);
});

app.use("/auth", authRouter);

app.use("/workflows", workflows);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});