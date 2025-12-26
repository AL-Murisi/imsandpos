"use client";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

export default function IMSLoader() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0b142a] text-white">
      {/* Rotating Gradient Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-[3px]"
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b142a]">
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            <Loader2 className="h-10 w-10 text-cyan-400" />
          </motion.div>
        </div>
      </motion.div>

      {/* Arabic Text Animation */}
      <motion.p
        className="text-xl font-semibold tracking-wide text-cyan-200"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        ...جارٍ تحميل النظام
      </motion.p>
    </div>
  );
}
