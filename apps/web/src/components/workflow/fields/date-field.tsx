import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

// GMT offset timezones
const TIMEZONES = [
  { value: 0, label: "UTC" },
  { value: -12, label: "GMT-12" },
  { value: -11, label: "GMT-11" },
  { value: -10, label: "GMT-10" },
  { value: -9, label: "GMT-9" },
  { value: -8, label: "GMT-8" },
  { value: -7, label: "GMT-7" },
  { value: -6, label: "GMT-6" },
  { value: -5, label: "GMT-5" },
  { value: -4, label: "GMT-4" },
  { value: -3, label: "GMT-3" },
  { value: -2, label: "GMT-2" },
  { value: -1, label: "GMT-1" },
  { value: 1, label: "GMT+1" },
  { value: 2, label: "GMT+2" },
  { value: 3, label: "GMT+3" },
  { value: 4, label: "GMT+4" },
  { value: 5, label: "GMT+5" },
  { value: 6, label: "GMT+6" },
  { value: 7, label: "GMT+7" },
  { value: 8, label: "GMT+8" },
  { value: 9, label: "GMT+9" },
  { value: 10, label: "GMT+10" },
  { value: 11, label: "GMT+11" },
  { value: 12, label: "GMT+12" },
];

export function DateField({
  className,
  clearable,
  connected,
  disabled,
  onChange,
  onClear,
  value,
  asWidget: _asWidget, // DateField doesn't have container styling to conditionally apply
}: FieldProps) {
  // Value can be an ISO string or old format object { date: string, offset: number }
  const isoValue =
    typeof value === "string"
      ? value
      : value && typeof value === "object" && "date" in value
        ? (value as { date: string }).date
        : "";

  // Timezone offset is for display/editing only (not persisted)
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);

  // Convert ISO string to Date (validate it's a valid date)
  const dateValue = (() => {
    if (!isoValue) return undefined;
    const date = new Date(isoValue);
    return isNaN(date.getTime()) ? undefined : date;
  })();
  const hasValue = Boolean(dateValue);

  // Convert UTC time to time in the selected GMT offset
  const getOffsetTime = (date: Date) => {
    const utcTime = date.getTime();
    const offsetMs = offset * 60 * 60 * 1000;
    const offsetTime = new Date(utcTime + offsetMs);
    return {
      year: offsetTime.getUTCFullYear(),
      month: offsetTime.getUTCMonth(),
      day: offsetTime.getUTCDate(),
      hours: offsetTime.getUTCHours(),
      minutes: offsetTime.getUTCMinutes(),
      seconds: offsetTime.getUTCSeconds(),
    };
  };

  // Get display date for calendar (in GMT offset)
  const getDisplayDate = (date: Date) => {
    const offsetMs = offset * 60 * 60 * 1000;
    return new Date(date.getTime() + offsetMs);
  };

  // Extract time string in the selected offset
  const timeStr = dateValue
    ? (() => {
        const t = getOffsetTime(dateValue);
        return `${String(t.hours).padStart(2, "0")}:${String(t.minutes).padStart(2, "0")}:${String(t.seconds).padStart(2, "0")}`;
      })()
    : "00:00:00";

  const updateValue = (isoDate: string) => {
    if (!isoDate) {
      onChange(undefined);
      return;
    }
    onChange(isoDate);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      setOpen(false);
      return;
    }

    // Extract date components from the selected date (calendar gives us a date in browser local time)
    // We interpret these as being in the GMT offset timezone
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Combine with current time (or default to 00:00:00 if no time set)
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);

    // Create a date in UTC with these components
    const utcDate = new Date(
      Date.UTC(year, month, day, hours, minutes, seconds)
    );

    // Adjust for the GMT offset to get the actual UTC time
    // If offset is -5 (GMT-5), and user selects 14:00, that's 19:00 UTC
    const offsetMs = offset * 60 * 60 * 1000;
    const adjustedDate = new Date(utcDate.getTime() - offsetMs);

    // Ensure the date is valid
    if (isNaN(adjustedDate.getTime())) {
      console.error("Invalid date created:", adjustedDate);
      return;
    }

    updateValue(adjustedDate.toISOString());
    setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    if (!time) return;

    const [hours, minutes, seconds = 0] = time.split(":").map(Number);

    // Get the date part - if no date is set yet, use today's date in the GMT offset
    const dateInOffset = dateValue
      ? getOffsetTime(dateValue)
      : (() => {
          const now = new Date();
          const offsetMs = offset * 60 * 60 * 1000;
          const offsetNow = new Date(now.getTime() + offsetMs);
          return {
            year: offsetNow.getUTCFullYear(),
            month: offsetNow.getUTCMonth(),
            day: offsetNow.getUTCDate(),
            hours: offsetNow.getUTCHours(),
            minutes: offsetNow.getUTCMinutes(),
            seconds: offsetNow.getUTCSeconds(),
          };
        })();

    // Create UTC date representing the selected date/time in GMT offset
    const utcDate = new Date(
      Date.UTC(
        dateInOffset.year,
        dateInOffset.month,
        dateInOffset.day,
        hours,
        minutes,
        seconds
      )
    );

    // Convert from GMT offset to UTC
    const offsetMs = offset * 60 * 60 * 1000;
    const adjustedDate = new Date(utcDate.getTime() - offsetMs);

    // Ensure the date is valid
    if (isNaN(adjustedDate.getTime())) {
      console.error("Invalid date created:", adjustedDate);
      return;
    }

    updateValue(adjustedDate.toISOString());
  };

  const handleOffsetChange = (newOffset: string) => {
    const offsetValue = Number(newOffset);
    setOffset(offsetValue);
    // Note: Changing timezone doesn't change the stored value,
    // it only affects how the date/time is displayed for editing
  };

  return (
    <div className={cn("relative flex gap-2", className)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="date-picker" className="text-xs">
          Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              disabled={disabled}
              className={cn(
                "w-32 h-9 justify-between font-normal",
                !dateValue && "text-muted-foreground"
              )}
            >
              {dateValue
                ? getDisplayDate(dateValue).toLocaleDateString()
                : connected
                  ? "Connected"
                  : "Select date"}
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue ? getDisplayDate(dateValue) : undefined}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="time-picker" className="text-xs">
          Time
        </Label>
        <Input
          type="time"
          id="time-picker"
          step="1"
          value={timeStr}
          onChange={handleTimeChange}
          disabled={disabled}
          className="w-32 h-9 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone-picker" className="text-xs">
          Timezone
        </Label>
        <Select
          value={offset.toString()}
          onValueChange={handleOffsetChange}
          disabled={disabled}
        >
          <SelectTrigger id="timezone-picker" className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem
                key={tz.value}
                value={tz.value.toString()}
                className="text-xs"
              >
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!disabled && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear date"
          className="absolute -top-1 -right-1"
        />
      )}
    </div>
  );
}
