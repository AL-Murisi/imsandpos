import admin from "firebase-admin";

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

export function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  if (
    !firebaseConfig.projectId ||
    !firebaseConfig.privateKey ||
    !firebaseConfig.clientEmail
  ) {
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
  } catch (error) {
    console.error("Firebase Admin Initialization Failed:", error);
    return null;
  }
}

export function getFirebaseMessaging() {
  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }

  return admin.messaging(app);
}

export default admin;
