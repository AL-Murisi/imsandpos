// workers/returnWorker.ts
import { Worker } from "bullmq";
import IORedis from "ioredis";
import prisma from "@/lib/prisma";
import { processReturn } from "@/lib/actions/cashier";

const connection = new IORedis(process.env.REDIS_URL!);

const worker = new Worker(
  "jobQueue",
  async (job) => {
    try {
      switch (job.name) {
        case "processReturn":
          // job.data should include { payload, companyId, userId }
          return await processReturn(job.data.payload, job.data.companyId);
        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }
    } catch (err) {
      console.error("Worker error:", err);
      throw err;
    }
  },
  { connection },
);

// optional: monitor
worker.on("completed", (job) => {
  console.log(`Job ${job.id} ${job.name} completed`);
});
worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} ${job?.name} failed`, err);
});
