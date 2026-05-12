import React from "react";

export default function ServerLoader() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0b142a] text-white">
      <div
        className="relative mb-6 flex h-20 w-20 animate-spin items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-[3px]"
        style={{ animationDuration: "1.5s" }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b142a]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-10 w-10 text-cyan-400"
            style={{
              animationDuration: "2s",
              animationDirection: "reverse",
              animationIterationCount: "infinite",
            }}
          >
            <path
              d="M12 2v4"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 18v4"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.93 4.93l2.83 2.83"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.24 16.24l2.83 2.83"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12h4"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 12h4"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.93 19.07l2.83-2.83"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.24 7.76l2.83-2.83"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <p className="text-xl font-semibold tracking-wide text-cyan-200">
        ...جارٍ تحميل النظام
      </p>
    </div>
  );
}
