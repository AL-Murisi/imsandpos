// // lib/queue.ts
// import  prisma  from '@/lib/prisma'; // Your Prisma instance

// export interface EnqueueJobOptions {
//   maxAttempts?: number;
//   scheduledAt?: Date;
// }

// /**
//  * Enqueue a job using Prisma
//  */
// export async function enqueueJob(
//   companyId: string,
//   jobType: string,
//   payload: any,
//   options: EnqueueJobOptions = {}
// ) {
//   try {
//     const job = await prisma.jobQueue.create({
//       data: {
//         companyId,
//         jobType,
//         payload,
//         maxAttempts: options.maxAttempts || 3,
//         scheduledAt: options.scheduledAt || new Date(),
//         status: 'pending',
//         attempts: 0
//       }
//     });

//     console.log(`📬 Job enqueued: ${jobType} (ID: ${job.id}) for company: ${companyId}`);
//     return job.id;
//   } catch (error) {
//     console.error('Error enqueuing job:', error);
//     throw error;
//   }
// }

// /**
//  * Enqueue sale journal entry creation
//  */
// export async function enqueueSaleJournalEntries(data: {
//   companyId: string;
//   sale: any;
//   customerId: string;
//   saleItems: any[];
//   cashierId: string;
// }) {
//   return enqueueJob(
//     data.companyId,
//     'create_sale_journal_entries',
//     data,
//     {
//       maxAttempts: 5 // Journal entries are critical, retry more
//     }
//   );
// }

// /**
//  * Get pending jobs (for processing)
//  */
// export async function getPendingJobs(limit = 10) {
//   return prisma.jobQueue.findMany({
//     where: {
//       status: { in: ['pending', 'failed'] },
//       scheduledAt: { lte: new Date() },
//       attempts: { lt: prisma.jobQueue.fields.maxAttempts }
//     },
//     orderBy: { scheduledAt: 'asc' },
//     take: limit
//   });
// }

// /**
//  * Mark job as processing
//  */
// export async function markJobProcessing(jobId: string) {
//   try {
//     await prisma.jobQueue.update({
//       where: { id: jobId },
//       data: {
//         status: 'processing',
//         attempts: { increment: 1 },
//         updatedAt: new Date()
//       }
//     });
//     return true;
//   } catch (error) {
//     console.error('Failed to mark job as processing:', error);
//     return false;
//   }
// }

// /**
//  * Mark job as completed
//  */
// export async function markJobCompleted(jobId: string) {
//   await prisma.jobQueue.update({
//     where: { id: jobId },
//     data: {
//       status: 'completed',
//       processedAt: new Date(),
//       updatedAt: new Date()
//     }
//   });
// }

// /**
//  * Mark job as failed with exponential backoff
//  */
// export async function markJobFailed(jobId: string, errorMessage: string) {
//   const job = await prisma.jobQueue.findUnique({
//     where: { id: jobId },
//     select: { attempts: true, maxAttempts: true }
//   });

//   if (!job) return;

//   const willRetry = job.attempts < job.maxAttempts;

//   // Exponential backoff: 2^attempts minutes
//   const retryDelay = willRetry
//     ? Math.pow(2, job.attempts) * 60 * 1000
//     : 0;

//   await prisma.jobQueue.update({
//     where: { id: jobId },
//     data: {
//       status: 'failed',
//       errorMessage,
//       updatedAt: new Date(),
//       scheduledAt: willRetry
//         ? new Date(Date.now() + retryDelay)
//         : undefined
//     }
//   });
// }

// /**
//  * Get job status
//  */
// export async function getJobStatus(jobId: string) {
//   return prisma.jobQueue.findUnique({
//     where: { id: jobId }
//   });
// }

// /**
//  * Get failed jobs for monitoring
//  */
// export async function getFailedJobs(companyId?: string, limit = 50) {
//   return prisma.jobQueue.findMany({
//     where: {
//       status: 'failed',
//       attempts: { gte: prisma.jobQueue.fields.maxAttempts },
//       ...(companyId && { companyId })
//     },
//     orderBy: { createdAt: 'desc' },
//     take: limit,
//     include: {
//       company: {
//         select: { name: true }
//       }
//     }
//   });
// }

// /**
//  * Retry a failed job manually
//  */
// export async function retryJob(jobId: string) {
//   await prisma.jobQueue.update({
//     where: { id: jobId },
//     data: {
//       status: 'pending',
//       attempts: 0,
//       errorMessage: null,
//       scheduledAt: new Date(),
//       updatedAt: new Date()
//     }
//   });

//   console.log(`🔄 Job ${jobId} queued for retry`);
// }

// /**
//  * Get queue stats for last 24 hours
//  */
// export async function getQueueStats(companyId?: string) {
//   const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

//   const jobs = await prisma.jobQueue.findMany({
//     where: {
//       createdAt: { gte: twentyFourHoursAgo },
//       ...(companyId && { companyId })
//     },
//     select: { status: true }
//   });

//   const stats = {
//     pending: 0,
//     processing: 0,
//     completed: 0,
//     failed: 0
//   };

//   jobs.forEach(job => {
//     stats[job.status as keyof typeof stats]++;
//   });

//   return stats;
// }

// /**
//  * Cleanup old completed jobs (run periodically)
//  */
// export async function cleanupCompletedJobs(daysOld = 30) {
//   const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

//   const result = await prisma.jobQueue.deleteMany({
//     where: {
//       status: 'completed',
//       processedAt: { lt: cutoffDate }
//     }
//   });

//   console.log(`🧹 Cleaned up ${result.count} old completed jobs`);
//   return result.count;
// }
