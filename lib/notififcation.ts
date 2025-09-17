export type LocalNotification = {
  id: string;
  type: string;
  message: string;
  priority: string;
  data?: any;
  read: boolean;
  timestamp: string;
};

const STORAGE_KEY = "notifications";

export function getNotifications(): LocalNotification[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveNotifications(notifications: LocalNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function addNotification(
  type: string,
  message: string,
  priority: string,
  data?: any
): LocalNotification[] {
  const notifications = getNotifications();

  const newNotification: LocalNotification = {
    id: crypto.randomUUID(), // unique id
    type,
    message,
    priority,
    data,
    read: false,
    timestamp: new Date().toISOString(),
  };

  const updated = [newNotification, ...notifications];
  saveNotifications(updated);

  return updated;
}
export function removeNotification(id: string): LocalNotification[] {
  const notifications = getNotifications();
  const updated = notifications.filter((n) => n.id !== id);
  saveNotifications(updated);
  return updated;
}

// ✅ Mark only ONE notification as read
export function markAsRead(id: string): LocalNotification[] {
  const notifications = getNotifications();
  const updated = notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(updated);
  return updated;
}
