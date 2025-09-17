"use client";
import { Card } from "./ui/card";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <Card className="border-0 shadow-2xl px-2 max-h-[85vh] bg-transparent animate-pulse">
      <ScrollArea
        className="min-h-[30vh] w-full border rounded-2xl pl-1"
        dir="rtl"
      >
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i} className="h-6 bg-gray-200 rounded-md" />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i} className="h-8">
                {Array.from({ length: columns }).map((_, j) => (
                  <TableCell key={j} className="bg-gray-200 rounded-md" />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
