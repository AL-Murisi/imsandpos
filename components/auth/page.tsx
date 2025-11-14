// "use client";

// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter, useSearchParams } from "next/navigation";
// import { toast } from "sonner"; // Optional: if you're using toast for notifications
// import { supabase } from "@/lib/supabase/client";

// export default function Auth() {
//   const searchParams = useSearchParams();
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const router = useRouter();
//   useEffect(() => {
//     const error = searchParams.get("error");

//     if (error === "not_authorized") {
//       toast.error("You are not authorized to access the admin panel.");
//     }
//   }, [searchParams.get("error")]); // ✅ Use the actual value as the dependency

//   async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
//     event.preventDefault();
//     setIsLoading(true);
//     setError(null);

//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) {
//       setError(error.message);
//       toast.error(error.message); // optional toast
//     } else {
//       toast.success("Login successful");

//       router.push("/admin");
//     }

//     setIsLoading(false);
//   }

//   return (
//     <div className="grid min-h-svh lg:grid-cols-2">
//       <div className="flex flex-col gap-4 p-6 md:p-10">
//         <div className="flex flex-1 items-center justify-center">
//           <div className="w-full max-w-xs">
//             <form className={cn("flex flex-col gap-6")} onSubmit={handleLogin}>
//               <div className="flex flex-col items-center gap-2 text-center">
//                 <h1 className="text-2xl font-bold">Login to your account</h1>
//                 <p className="text-muted-foreground text-sm text-balance">
//                   Enter your email below to login to your account
//                 </p>
//               </div>
//               <div className="grid gap-6">
//                 <div className="grid gap-3">
//                   <Label htmlFor="email">Email</Label>
//                   <Input
//                     id="email"
//                     type="email"
//                     name="email"
//                     placeholder="m@example.com"
//                     required
//                     disabled={isLoading}
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                   />
//                 </div>
//                 <div className="grid gap-3">
//                   <div className="flex items-center">
//                     <Label htmlFor="password">Password</Label>
//                     <Link
//                       href="#"
//                       className="ml-auto text-sm underline-offset-4 hover:underline"
//                     >
//                       Forgot your password?
//                     </Link>
//                   </div>
//                   <Input
//                     id="password"
//                     type="password"
//                     name="password"
//                     required
//                     disabled={isLoading}
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                   />
//                 </div>
//                 {error && (
//                   <p className="text-red-500 text-sm text-center">{error}</p>
//                 )}
//                 <Button type="submit" className="w-full" disabled={isLoading}>
//                   {isLoading ? "Logging in..." : "Login"}
//                 </Button>
//                 <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
//                   <span className="bg-background text-muted-foreground relative z-10 px-2">
//                     Or continue with
//                   </span>
//                 </div>
//                 <Button
//                   variant="outline"
//                   className="w-full"
//                   disabled={isLoading}
//                 >
//                   {/* GitHub SVG here */}
//                   Login with GitHub
//                 </Button>
//               </div>
//               <div className="text-center text-sm">
//                 Don&apos;t have an account?{" "}
//                 <Link
//                   href="/auth/signup"
//                   className="underline underline-offset-4"
//                 >
//                   Sign up
//                 </Link>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//       <div className="bg-muted relative hidden lg:block">
//         <img
//           src="/icon.png"
//           alt="Image"
//           className="absolute inset-0 h-full w-full object-cover"
//         />
//       </div>
//     </div>
//   );
// }
