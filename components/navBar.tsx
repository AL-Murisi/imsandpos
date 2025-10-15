// import React from 'react'

// export default function NavBar() {
//   return (
//    <nav
//           className={`fixed z-50 w-full transition-all duration-300 ${scrolled ? "bg-white/90 shadow-lg backdrop-blur-lg" : "bg-transparent"}`}
//         >
//           <div className="mx-auto max-w-7xl px-6 py-4">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center space-x-2">
//                 <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2">
//                   <ShoppingCart className="text-white" size={24} />
//                 </div>
//                 <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent">
//                   SmartPOS Pro
//                 </span>
//               </div>

//               {/* Desktop Menu */}
//               <div className="hidden items-center space-x-8 md:flex">
//                 <a
//                   href="#features"
//                   className="text-gray-700 transition hover:text-blue-600"
//                 >
//                   Features
//                 </a>
//                 <a
//                   href="#how-it-works"
//                   className="text-gray-700 transition hover:text-blue-600"
//                 >
//                   How It Works
//                 </a>
//                 <a
//                   href="#benefits"
//                   className="text-gray-700 transition hover:text-blue-600"
//                 >
//                   Benefits
//                 </a>
//                 <a
//                   href="#pricing"
//                   className="text-gray-700 transition hover:text-blue-600"
//                 >
//                   Pricing
//                 </a>
//                 <button
//                   onClick={() => router.push("/login")}
//                   className="transform rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-white transition hover:scale-105 hover:shadow-lg"
//                 >
//                   تسجيل الدخول
//                 </button>
//                 <ModeToggle />
//               </div>

//               {/* Mobile Menu Button */}
//               <button
//                 onClick={() => setIsMenuOpen(!isMenuOpen)}
//                 className="md:hidden"
//               >
//                 {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
//               </button>
//             </div>

//             {/* Mobile Menu */}
//             {isMenuOpen && (
//               <div className="mt-4 space-y-4 pb-4 md:hidden">
//                 <a
//                   href="#features"
//                   className="block text-gray-700 hover:text-blue-600"
//                 >
//                   Features
//                 </a>
//                 <a
//                   href="#how-it-works"
//                   className="block text-gray-700 hover:text-blue-600"
//                 >
//                   How It Works
//                 </a>
//                 <a
//                   href="#benefits"
//                   className="block text-gray-700 hover:text-blue-600"
//                 >
//                   Benefits
//                 </a>
//                 <a
//                   href="#pricing"
//                   className="block text-gray-700 hover:text-blue-600"
//                 >
//                   Pricing
//                 </a>
//                 <button className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-white">
//                   Sign In
//                 </button>
//               </div>
//             )}
//           </div>
//         </nav>
//   )
// }
