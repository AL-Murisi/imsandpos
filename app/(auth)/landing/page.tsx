import LandingPage from "@/components/landing";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function page() {
  return (
    <ScrollArea className="h-[100vh]">
      <LandingPage />
    </ScrollArea>
  );
}
