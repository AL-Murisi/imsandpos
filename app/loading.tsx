import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo.png"
          alt="IMS"
          width={120}
          height={120}
          priority
          className="h-24 w-24 object-contain"
        />
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
