// "use client";

// import { getCompany } from "@/lib/actions/createcompnayacc";
// import { useAuth } from "@/lib/context/AuthContext";
// import React, { useEffect, useState } from "react";

// export default function NavBar() {
//   const { user } = useAuth();
//   const [url, setUrl] = useState("");

//   useEffect(() => {
//     if (!user) return; // wait until user is loaded

//     const fetchCompany = async () => {
//       const res = await getCompany(user.companyId);
//       setUrl(res.data?.logoUrl ?? "");
//     };

//     fetchCompany();
//   }, [user]); // <- depend on user

//   // safely handle "user not loaded yet"
//   if (!user) return <div>Loading...</div>;

//   return (
//     <img
//       src={url}
//       alt="Logo Preview"
//       className="h-32 w-32 rounded-lg border object-contain"
//     />
//   );
// }
