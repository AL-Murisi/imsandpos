// "use client";

// import { useEffect, useState } from "react";
// import { Bell } from "lucide-react";
// import {
//   getNotifications,
//   addNotification,
//   markAsRead,
//   LocalNotification,
// } from "@/lib/notififcation";
// import {
//   DropdownMenu,
//   DropdownMenuTrigger,
//   DropdownMenuContent,
//   DropdownMenuLabel,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
// } from "@/components/ui/dropdown-menu"; // adjust import path
// import { ScrollArea } from "@/components/ui/scroll-area"; // adjust import path

// export default function NotificationBell() {
//   const [notifications, setNotifications] = useState<LocalNotification[]>([]);

//   // Count of unread notifications
//   const unreadCount = notifications.filter((n) => !n.read).length;

//   useEffect(() => {
//     // Load saved notifications
//     setNotifications(getNotifications());

//     const es = new EventSource("/api/socket"); // SSE endpoint

//     es.addEventListener("notification", (event) => {
//       const data = JSON.parse((event as MessageEvent).data);
//       const updated = addNotification(
//         data.type,
//         data.message,
//         data.priority,
//         data.data
//       );
//       setNotifications(updated);

//       // Optional: browser push notification
//       if (Notification.permission === "granted") {
//         new Notification(data.type, { body: data.message });
//       }
//     });

//     es.addEventListener("connection_established", () => {
//       console.log("SSE connected");
//     });

//     es.addEventListener("error", (event) => {
//       console.error("SSE error:", event);
//     });

//     return () => {
//       es.close();
//     };
//   }, []);

//   function handleRead(id: string) {
//     const updated = markAsRead(id);
//     setNotifications(updated);
//   }

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <div className="relative cursor-pointer">
//           <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
//           {unreadCount > 0 && (
//             <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1/2 -translate-y-1/2">
//               {unreadCount}
//             </span>
//           )}
//         </div>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent className="w-80" align="end">
//         <DropdownMenuLabel>Notifications ({unreadCount})</DropdownMenuLabel>
//         <DropdownMenuSeparator />
//         <ScrollArea className="h-[200px] w-full">
//           {notifications.length > 0 ? (
//             notifications.map((notification) => (
//               <DropdownMenuItem
//                 key={notification.id}
//                 onClick={() => handleRead(notification.id)}
//                 className={`flex-col items-start space-y-1 p-2 ${
//                   !notification.read ? "bg-gray-100 dark:bg-gray-800" : ""
//                 }`}
//               >
//                 <div className="text-sm font-medium leading-none">
//                   {notification.message}
//                 </div>
//                 <div className="text-xs text-gray-500">
//                   {notification.timestamp}
//                 </div>
//               </DropdownMenuItem>
//             ))
//           ) : (
//             <p className="p-4 text-center text-sm text-gray-500">
//               You're all caught up!
//             </p>
//           )}
//         </ScrollArea>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getNotifications,
  LocalNotification,
  markAsRead,
} from "@/lib/notififcation";
import { Bell, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  useEffect(() => {
    async function loadNotifications() {
      const local = getNotifications();

      try {
        const res = await fetch("/api/fetch", {
          cache: "no-store", // <-- always fetch fresh data
        });

        const apiNotifications: LocalNotification[] = await res.json();

        // Merge API + local, keeping "read" status
        const merged = apiNotifications.map((api) => {
          const localMatch = local.find((l) => l.id === api.id);
          return localMatch ? { ...api, read: localMatch.read } : api;
        });

        const withExtras = [
          ...merged,
          ...local.filter((l) => !apiNotifications.find((a) => a.id === l.id)),
        ].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setNotifications(withExtras);
        localStorage.setItem("notifications", JSON.stringify(withExtras));
      } catch {
        setNotifications(local);
      }
    }

    loadNotifications();
  }, []);

  // Load notifications from localStorage and API
  // useEffect(() => {
  //   async function loadNotifications() {
  //     const local = getNotifications();

  //     try {
  //       const res = await fetch("/api/fetch");
  //       const apiNotifications: LocalNotification[] = await res.json();

  //       // Merge API + local (avoid duplicates)
  //       const merged = [
  //         ...apiNotifications,
  //         ...local.filter((l) => !apiNotifications.find((a) => a.id === l.id)),
  //       ].sort(
  //         (a, b) =>
  //           new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  //       );

  //       setNotifications(merged);

  //       // save back to localStorage
  //       localStorage.setItem("notifications", JSON.stringify(merged));
  //     } catch {
  //       setNotifications(local);
  //     }
  //   }

  //   loadNotifications();
  // }, []);

  // // SSE listener
  // useEffect(() => {
  //   const es = new EventSource("/api/socket");

  //   es.addEventListener("notification", async (event) => {
  //     const data = JSON.parse((event as MessageEvent).data);

  //     // Add to localStorage
  //     const updated = addNotification(
  //       data.type,
  //       data.message,
  //       data.priority,
  //       data.data
  //     );

  //     setNotifications(updated);

  //     // Optional: send new notification to API for server persistence
  //     try {
  //       await fetch("/api/fetch", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify(updated[0]), // only newest
  //       });
  //     } catch (err) {
  //       console.error("Failed to sync notification to API", err);
  //     }

  //     // Browser push
  //     if (Notification.permission === "granted") {
  //       new Notification(data.type, { body: data.message });
  //     }
  //   });

  //   es.addEventListener("connection_established", () => {
  //     console.log("SSE connected");
  //   });

  //   es.addEventListener("error", (event) => {
  //     console.error("SSE error:", event);
  //   });

  //   return () => es.close();
  // }, []);

  function handleRead(id: string) {
    const updated = markAsRead(id);
    setNotifications(updated);
  }

  return (
    <div className="">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative cursor-pointer">
            <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1/2 -translate-y-1/2">
                {unreadCount}
              </span>
            )}
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-90 " align="start">
          <DropdownMenuLabel>Notifications ({unreadCount})</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[200px] w-full">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleRead(notification.id)}
                  className={`flex-col items-center space-y-1 p-2 ${
                    !notification.read ? "bg-gray-100 dark:bg-gray-800" : ""
                  }`}
                >
                  <div className=" flex  justify-between text-sm font-medium leading-none gap-2">
                    <div className="flex items-start w-60 ">
                      {notification.message}
                    </div>
                    <div className=" flex items-end">
                      <Trash2 color="red" />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {notification.timestamp}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-gray-500">
                You're all caught up!
              </p>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
