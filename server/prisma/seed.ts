import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // deleting the user cascades through everything downstream
  await prisma.user.deleteMany()

  const user = await prisma.user.create({
    data: { email: 'demo@fluxion.dev', passwordHash: 'REPLACED_ON_DAY_3' },
  })

  const workflow = await prisma.workflow.create({
    data: { userId: user.id, name: 'Demo: fetch + delay' },
  })

  const trigger = await prisma.node.create({
    data: { workflowId: workflow.id, type: 'trigger', config: {}, positionX: 0, positionY: 0 },
  })
  const http = await prisma.node.create({
    data: {
      workflowId: workflow.id, type: 'http',
      config: { url: 'https://httpbin.org/get', method: 'GET' },
      positionX: 240, positionY: 0,
    },
  })
  const delay = await prisma.node.create({
    data: { workflowId: workflow.id, type: 'delay', config: { ms: 1000 }, positionX: 480, positionY: 0 },
  })

  await prisma.edge.createMany({
    data: [
      { workflowId: workflow.id, sourceNodeId: trigger.id, targetNodeId: http.id },
      { workflowId: workflow.id, sourceNodeId: http.id, targetNodeId: delay.id },
    ],
  })

  // a completed run whose HTTP node failed once then succeeded — the per-attempt story in data
  const run = await prisma.run.create({
    data: { workflowId: workflow.id, status: 'success', finishedAt: new Date() },
  })

  await prisma.nodeRun.createMany({
    data: [
      { runId: run.id, nodeId: trigger.id, type: 'trigger', config: {}, attempt: 1, status: 'success', finishedAt: new Date() },
      { runId: run.id, nodeId: http.id, type: 'http', config: { url: 'https://httpbin.org/get', method: 'GET' }, attempt: 1, status: 'failed', error: 'ETIMEDOUT', finishedAt: new Date() },
      { runId: run.id, nodeId: http.id, type: 'http', config: { url: 'https://httpbin.org/get', method: 'GET' }, attempt: 2, status: 'success', output: { statusCode: 200 }, finishedAt: new Date() },
      { runId: run.id, nodeId: delay.id, type: 'delay', config: { ms: 1000 }, attempt: 1, status: 'success', finishedAt: new Date() },
    ],
  })

  console.log(`Seeded ${user.email} · workflow "${workflow.name}" · 1 run · 4 node-runs`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })