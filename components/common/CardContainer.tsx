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
    <Card className=" border-none bg-background overflow-y h-[100vh]  ">
      <CardHeader className="border-nonep-2 mt-3 flex justify-between items-center">
        <div>
          <CardTitle>{title}</CardTitle>
          {total !== undefined && <p>Total: {total}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="border-none overflow-y-auto ">
        {children}
      </CardContent>
      {/* <CardFooter /> */}
    </Card>
    // </div>
  );
}
