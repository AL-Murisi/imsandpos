// "use client";

// import { useEffect } from "react";

// export function SocketInitializer() {
//   useEffect(() => {
//     // استدعاء API التهيئة مرة واحدة عند تحميل التطبيق
//     const initSocket = async () => {
//       try {
//         await fetch("/api/socket");
//       } catch (e) {
//         console.error("الفشل في تهيئة السوكيت:", e);
//       }
//     };

//     initSocket();
//   }, []);

//   return null; // هذا المكون لا يرسم شيئاً، هو للتهيئة فقط
// }
