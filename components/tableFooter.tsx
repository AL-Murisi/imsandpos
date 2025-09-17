// import React from "react";

// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuCheckboxItem,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { ChevronDown } from "lucide-react";
// import { Table } from "@tanstack/react-table";

// export default function TableFooter() {
//   return (
//     <div className="flex items-center justify-end space-x-2 py-4">
//       <div className="text-muted-foreground flex-1 text-sm">
//         {table.getFilteredSelectedRowModel().rows.length} of{" "}
//         {table.getFilteredRowModel().rows.length} row(s) selected.
//       </div>
//       <DropdownMenu>
//         <DropdownMenuTrigger asChild>
//           <Button variant="outline" className="ml-auto">
//             row per page <ChevronDown className="ml-2 h-4 w-4" />
//           </Button>
//         </DropdownMenuTrigger>
//         <DropdownMenuContent align="end">
//           {[5, 10, 20, 50].map((size) => (
//             <DropdownMenuItem
//               key={size}
//               onClick={() => table.setPageSize(size)}
//             >
//               {size} rows
//             </DropdownMenuItem>
//           ))}
//           <DropdownMenuSeparator />
//           <DropdownMenuItem onClick={() => table.setPageSize(6)}>
//             Clear Filter
//           </DropdownMenuItem>
//         </DropdownMenuContent>
//       </DropdownMenu>

//       <div className="space-x-2">
//         <Button
//           onClick={() => table.previousPage()}
//           disabled={!table.getCanPreviousPage()}
//         >
//           Previous
//         </Button>
//         <Button
//           onClick={() => table.nextPage()}
//           disabled={!table.getCanNextPage()}
//         >
//           Next
//         </Button>
//       </div>
//     </div>
//   );
// }
