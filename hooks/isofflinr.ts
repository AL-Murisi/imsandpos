// import { useEffect } from 'react';
// import { db } from '@/lib/indexedDB';

// export function useSyncOfflineOperations() {
//   useEffect(() => {
//     async function syncOps() {
//       if (!navigator.onLine) return;

//       const pendingOps = await db.offlineOperations.where('status').equals('pending').toArray();
//       for (const op of pendingOps) {
//         try {
//           await fetch('/api/sync-offline', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(op),
//           });

//           await db.offlineOperations.update(op.id!, {
//             status: 'synced',
//             syncedAt: new Date(),
//           });
//         } catch (error) {
//           console.error('Sync failed', error);
//         }
//       }
//     }

//     syncOps();

//     window.addEventListener('online', syncOps);
//     return () => window.removeEventListener('online', syncOps);
//   }, []);
// }
