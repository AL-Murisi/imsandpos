import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import React from "react";
import { Badge } from "../ui/badge";

interface InfoCardProps {
  icon: React.ReactNode;
  title: string | number;
  description?: string;
  buttonLabel?: string;
  showButton?: boolean;
  centerContent?: boolean;
}

export function InfoCard({
  icon,
  title,
  description,
  buttonLabel,
  showButton = false,
  centerContent = false,
}: InfoCardProps) {
  return (
    <Card className="flex flex-col  p-4 dark:bg-card bg-chart-3 h-15">
      <CardHeader className="flex items-center justify-center mb-2 text-white">
        <Badge className=" dark:bg-chart-4 bg-chart-2"> {title}</Badge>
      </CardHeader>
      <CardTitle className="text-2xl text-white"> {icon}</CardTitle>
      {description && (
        <CardDescription className="text-sm mt-1 text-white">
          {description}
        </CardDescription>
      )}
      {showButton && buttonLabel && (
        <CardFooter className="flex-col items-center gap-1.5 text-sm mt-4">
          <Button>{buttonLabel}</Button>
        </CardFooter>
      )}
    </Card>
  );
}
