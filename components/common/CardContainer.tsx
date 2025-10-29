"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

type CardContainerProps = {
  title: string;
  total?: string | number;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export default function CardContainer({
  title,
  total,
  action,
  children,
}: CardContainerProps) {
  return (
    // <div className="flex flex-col ">
    <Card className="bg-background overflow-y h-[100vh] border-none">
      <CardHeader className="border-nonep-2 mt-3 flex items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {total !== undefined && <p>Total: {total}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="overflow-y-auto border-none">
        {children}
      </CardContent>
      {/* <CardFooter /> */}
    </Card>
    // </div>
  );
}
