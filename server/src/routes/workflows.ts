// server/src/routes/workflows.ts

import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { NotFoundError } from "../errors";
import { createWorkflowSchema, type CreateWorkflowInput } from "@fluxion/shared";
import { Router, type Request, type Response } from "express";

export const workflows = Router();
workflows.use(requireAuth);          // every route below is authenticated

// GET /workflows — list, owner-scoped, metadata only
workflows.get("/", async (req, res) => {
  const rows = await prisma.workflow.findMany({
    where: { userId: req.userId! },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ workflows: rows });
});

// POST /workflows — create empty, owned by req.userId
workflows.post("/", validate(createWorkflowSchema), async (req, res) => {
  const { name } = req.body as CreateWorkflowInput;
  const workflow = await prisma.workflow.create({
    data: { name, userId: req.userId! },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  res.status(201).json({ workflow });
});

// GET /workflows/:id — detail with graph. findFirst (not findUnique) so userId scopes it.
workflows.get("/:id", async (req, res) => {
  const workflow = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: {
      id: true, name: true, createdAt: true, updatedAt: true,
      nodes: { select: { id: true, type: true, config: true, positionX: true, positionY: true } },
      edges: { select: { id: true, sourceNodeId: true, targetNodeId: true, branchLabel: true } },
    },
  });
  if (!workflow) throw new NotFoundError();     // not-owned is indistinguishable from not-found
  res.json({ workflow });
});

// PUT /workflows/:id — name/metadata only (graph save is Day 8). updateMany → branch on count.
const updateWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

workflows.put(
  "/:id",
  validate(updateWorkflowSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { name } = req.body as z.infer<typeof updateWorkflowSchema>;
    const { count } = await prisma.workflow.updateMany({
      where: { id: req.params.id, userId: req.userId! },   // now string
      data: { name },
    });
    if (count === 0) throw new NotFoundError();
    const workflow = await prisma.workflow.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    res.json({ workflow });
  },
);

// DELETE /workflows/:id — deleteMany → branch on count. 204 on success.
workflows.delete("/:id", async (req, res) => {
  const { count } = await prisma.workflow.deleteMany({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (count === 0) throw new NotFoundError();
  res.status(204).end();
});