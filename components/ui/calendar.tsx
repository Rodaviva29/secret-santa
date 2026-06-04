"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** shadcn-style wrapper around react-day-picker v10. */
export function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-0", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 top-1 size-7 inline-flex items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40",
        ),
        button_next: cn(
          "absolute right-1 top-1 size-7 inline-flex items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 text-[0.8rem] font-normal",
        week: "flex w-full mt-1",
        day: "size-9 text-center text-sm p-0",
        day_button: cn(
          "size-9 rounded-md font-normal hover:bg-accent aria-selected:opacity-100",
        ),
        selected:
          "bg-primary text-primary-foreground [&_button]:bg-primary [&_button]:text-primary-foreground [&_button:hover]:bg-primary",
        today: "[&_button]:border [&_button]:border-primary",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
