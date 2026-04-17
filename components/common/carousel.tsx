import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";

export function CarouselDemo() {
  const images = Array.from({ length: 17 }, (_, i) => ({
    src: `/landingicons/screenshot-${i + 1}.png`,
    alt: `Screenshot ${i + 1}`,
  }));
  //const plugin = React.useRef(
  //     Autoplay({ delay: 2000, stopOnInteraction: true })
  //   )
  return (
    <Carousel
      className="h-full w-full"
      orientation="vertical"
      opts={{
        loop: true,
      }}
      plugins={[
        Autoplay({
          delay: 5000,
        }),
      ]}
    >
      {/* Increased height slightly to give the dashboard breathing room */}
      <CarouselContent className="h-[670px]">
        {images.map((src, index) => (
          <CarouselItem key={index} className="basis-full">
            {/* Changed padding to p-4 to maximize image size while keeping it away from edges */}
            <div className="relative h-full w-full">
              <Image src={src.src} alt={src.alt} fill className="rounded-2xl" />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
