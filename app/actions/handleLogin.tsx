// import LoginForm from "../(auth)/login/loging";

// export default function LoginPage() {
//   async function handleLogin(data: { email: string; password: string }) {
//     try {
//       const res = await fetch("/api/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(data),
//       });

//       if (!res.ok) {
//         const error = await res.json();
//         alert(error.message || "خطأ في تسجيل الدخول");
//         return;
//       }

//       alert("تم تسجيل الدخول بنجاح!");
//       // redirect or update UI here
//     } catch (err) {
//       alert("حدث خطأ أثناء تسجيل الدخول");
//       console.error(err);
//     }
//   }

//   return <LoginForm action={handleLogin} />;
// }
