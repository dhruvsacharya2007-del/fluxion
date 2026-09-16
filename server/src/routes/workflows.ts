// server/src/routes/workflows.ts

import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";


import { Router, type Request, type Response } from "express";
import {
  createWorkflowSchema,
  type CreateWorkflowInput,
  saveGraphSchema,
  type SaveGraphRequest,
} from "@fluxion/shared";

import { NotFoundError, ValidationError } from "../errors";

export const workflows = Router();
workflows.use(requireAuth);        


workflows.get("/", async (req, res) => {
  const rows = await prisma.workflow.findMany({
    where: { userId: req.userId! },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ workflows: rows });
});


workflows.post("/", validate(createWorkflowSchema), async (req, res) => {
  const { name } = req.body as CreateWorkflowInput;
  const workflow = await prisma.workflow.create({
    data: { name, userId: req.userId! },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  res.status(201).json({ workflow });
});


workflows.get("/:id", async (req, res) => {
  const workflow = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: {
      id: true, name: true, createdAt: true, updatedAt: true,
      nodes: { select: { id: true, type: true, config: true, positionX: true, positionY: true } },
      edges: { select: { id: true, sourceNodeId: true, targetNodeId: true, branchLabel: true } },
    },
  });
  if (!workflow) throw new NotFoundError();     
  res.json({ workflow });
});

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

workflows.put(
  "/:id/graph",
  validate(saveGraphSchema),                       // Zod: shape
  async (req: Request<{ id: string }>, res: Response) => {   // middleware present → annotate (Day 6 rule)
    const workflowId = req.params.id;
    const userId = req.userId!;
    const { nodes, edges } = req.body as SaveGraphRequest;

    // --- referential check A: every edge endpoint is a node in THIS payload ---
    const incomingNodeIds = new Set(nodes.map((n) => n.id));
    if (incomingNodeIds.size !== nodes.length) {
      throw new ValidationError({} , ["Duplicate node id in graph"] );
    }
    const incomingEdgeIds = new Set(edges.map((e) => e.id));
    if (incomingEdgeIds.size !== edges.length) {
      throw new ValidationError({} ,  ["Duplicate edge id in graph"] );
    }
    for (const e of edges) {
      if (!incomingNodeIds.has(e.sourceNodeId) || !incomingNodeIds.has(e.targetNodeId)) {
        throw new ValidationError({} , ["Edge references a node not in the graph"] );
      }
    }

    // --- ownership: authorize the container BEFORE mutating anything ---
    const owned = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundError();   // not-owned indistinguishable from not-found (Day 6)

    // --- atomic save ---
    const saved = await prisma.$transaction(async (tx) => {
      // load ids that provably belong to THIS workflow (the ownership scope for update)
      const existingNodes = await tx.node.findMany({ where: { workflowId }, select: { id: true } });
      const existingEdges = await tx.edge.findMany({ where: { workflowId }, select: { id: true } });
      const existingNodeIds = new Set(existingNodes.map((n) => n.id));
      const existingEdgeIds = new Set(existingEdges.map((e) => e.id));

      // 1. upsert nodes — update only ids we loaded from this workflow; else create pinned
      for (const n of nodes) {
        const data = {
          type: n.type,
          config: (n.config ?? {}) as object,   // if TS objects: import the Json input type from generated client
          positionX: n.positionX,
          positionY: n.positionY,
        };
        if (existingNodeIds.has(n.id)) {
          await tx.node.update({ where: { id: n.id }, data });         // in-scope by construction
        } else {
          await tx.node.create({ data: { id: n.id, workflowId, ...data } }); // workflowId pinned server-side
        }
      }

      // 2. upsert edges (all endpoints exist now — nodes upserted, check A passed)
      for (const e of edges) {
        const data = {
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          branchLabel: e.branchLabel ?? null,
        };
        if (existingEdgeIds.has(e.id)) {
          await tx.edge.update({ where: { id: e.id }, data });
        } else {
          await tx.edge.create({ data: { id: e.id, workflowId, ...data } });
        }
      }

      // 3. delete missing edges FIRST (beat the Edge→Node cascade)
      const edgeIdsToDelete = [...existingEdgeIds].filter((id) => !incomingEdgeIds.has(id));
      if (edgeIdsToDelete.length) {
        await tx.edge.deleteMany({ where: { id: { in: edgeIdsToDelete }, workflowId } });
      }

      // 4. delete missing nodes LAST (their NodeRuns SetNull → history survives, Day 2 design)
      const nodeIdsToDelete = [...existingNodeIds].filter((id) => !incomingNodeIds.has(id));
      if (nodeIdsToDelete.length) {
        await tx.node.deleteMany({ where: { id: { in: nodeIdsToDelete }, workflowId } });
      }

      // return the persisted graph — same select as GET /:id
      return tx.workflow.findFirst({
        where: { id: workflowId, userId },
        select: {
          id: true, name: true, createdAt: true, updatedAt: true,
          nodes: { select: { id: true, type: true, config: true, positionX: true, positionY: true } },
          edges: { select: { id: true, sourceNodeId: true, targetNodeId: true, branchLabel: true } },
        },
      });
    });

    res.json({ workflow: saved });
  },
);