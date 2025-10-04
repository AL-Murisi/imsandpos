"use client";
import React from "react";

type CustomTooltipContentProps = {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color?: string;
    dataKey?: string;
    payload?: Record<string, any>;
  }>;
  label?: string | number;
  labelFormatter?: (label: any) => string;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
};

export const CustomTooltipContent: React.FC<CustomTooltipContentProps> = ({
  active,
  payload,
  label,
  labelFormatter,
  hideIndicator = false,
  indicator = "dot",
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rtl min-w-[120px] rounded-xl bg-white p-3 text-right shadow-lg">
      {/* Label */}
      {label && (
        <div className="mb-2 text-sm font-medium text-gray-600">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}

      {/* Payload items */}
      {payload.map((entry, index) => (
        <div
          key={entry.dataKey || index}
          className="mb-1 flex items-center justify-between last:mb-0"
        >
          <div className="flex items-center gap-2">
            {!hideIndicator && (
              <span
                className={`h-2 w-2 rounded-full ${
                  indicator === "dot" ? "block" : "hidden"
                }`}
                style={{ backgroundColor: entry.color }}
              />
            )}
            <span className="text-sm text-gray-800">{entry.name}</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};
