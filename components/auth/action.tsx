// // app/login/actions.ts
// "use server";

// import { createClient } from "@/lib/supabase/server";
// // import { useState } from "react"; // <-- Remove this line: useState is for client components

// // Define the shape of the data that the server action will return
// interface AuthResult {
//   success: boolean;
//   message?: string; // Optional: for error messages
//   redirectPath?: string; // Optional: for successful redirects
// }

// export async function authenticate(formData: FormData): Promise<AuthResult> {
//   const email = formData.get("email") as string;
//   const password = formData.get("password") as string;

//   const supabase = await createClient();

//   const { error } = await supabase.auth.signInWithPassword({
//     email,
//     password,
//   });

//   if (error) {
//     // Log the error on the server for debugging purposes
//     console.error("Authentication error on server:", error.message);
//     // Return a structured error object to the client
//     return { success: false, message: error.message };
//   }

//   // If no error, authentication was successful
//   // Return a success object with the path to redirect to
//   return { success: true, redirectPath: "/admin" };
// }
