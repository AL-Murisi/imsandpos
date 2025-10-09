"use client";
import { useState, useMemo, useRef } from "react"; // 💡 Import useRef
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // 💡 Create a ref for the file input element
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine the display text for the file input area
  const fileInputText = useMemo(() => {
    if (file) {
      return file.name;
    }
    return " اختر ملفًا لرفع المُنتَجات";
  }, [file]);

  // 💡 Updated: Handler function to clear the file state AND the native input
  const handleRemoveFile = () => {
    // 1. Clear the React state
    setFile(null);

    // 2. Clear the native input value using the ref
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) return toast("Please select an Excel file");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/importItems", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      toast.success(`✅ Imported ${data.createdCount} products`, {
        closeButton: true,
      });
      // 3. IMPORTANT: Also clear the file state and native input after success
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      toast.error("Some rows failed to import");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        {/* The visual input displaying the file name or placeholder */}
        <Input
          value={fileInputText}
          readOnly
          dir="rtl"
          className="cursor-pointer pr-8"
        />

        {/* The actual hidden file input */}
        <input
          type="file"
          id="file-upload"
          accept=".xlsx, .xls"
          // 💡 Attach the ref here
          ref={fileInputRef}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />

        {/* The 'X' (Remove File) Button */}
        {file && (
          <button
            type="button"
            onClick={handleRemoveFile}
            className="absolute top-1/2 left-0 z-20 -translate-y-1/2 transform p-2 text-gray-500 hover:text-red-500"
            aria-label="Remove selected file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* The Upload Button */}
      <Button onClick={handleUpload} disabled={loading || !file}>
        {loading ? (
          "Uploading..."
        ) : (
          <div className="flex items-center gap-1">
            <Upload className="h-4 w-4" />
            <span>رَفع المُنتَجات</span>
          </div>
        )}
      </Button>
    </div>
  );
}
