import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

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

interface DateTimeValue {
  date: string; // ISO date string
  offset: number; // GMT offset in hours
}

export function DateField({
  className,
  clearable,
  connected,
  disabled,
  onChange,
  onClear,
  value,
}: FieldProps) {
  // Parse value - can be ISO string or DateTimeValue object
  const parsedValue = typeof value === "string"
    ? { date: value, offset: 0 }
    : (value as DateTimeValue) || { date: "", offset: 0 };

  const [offset, setOffset] = useState(parsedValue.offset || 0);
  const [open, setOpen] = useState(false);

  // Convert ISO string to Date in the selected offset
  const dateValue = parsedValue.date ? new Date(parsedValue.date) : undefined;
  const hasValue = parsedValue.date !== undefined && parsedValue.date !== "";

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

  const updateValue = (isoDate: string, gmtOffset: number) => {
    if (!isoDate) {
      onChange(undefined);
      return;
    }
    onChange({ date: isoDate, offset: gmtOffset });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      setOpen(false);
      return;
    }

    // Combine selected date with current time in GMT offset
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);

    // Create UTC date representing the selected date/time in GMT offset
    const utcDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      seconds
    ));

    // Convert from GMT offset to UTC
    const offsetMs = offset * 60 * 60 * 1000;
    const adjustedDate = new Date(utcDate.getTime() - offsetMs);

    updateValue(adjustedDate.toISOString(), offset);
    setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    if (!time) return;

    const [hours, minutes, seconds = 0] = time.split(":").map(Number);

    // Get the date part in GMT offset
    const dateInOffset = dateValue ? getOffsetTime(dateValue) : getOffsetTime(new Date());

    // Create UTC date representing the selected date/time in GMT offset
    const utcDate = new Date(Date.UTC(
      dateInOffset.year,
      dateInOffset.month,
      dateInOffset.day,
      hours,
      minutes,
      seconds
    ));

    // Convert from GMT offset to UTC
    const offsetMs = offset * 60 * 60 * 1000;
    const adjustedDate = new Date(utcDate.getTime() - offsetMs);

    updateValue(adjustedDate.toISOString(), offset);
  };

  const handleOffsetChange = (newOffset: string) => {
    const offsetValue = Number(newOffset);
    setOffset(offsetValue);
    if (parsedValue.date) {
      updateValue(parsedValue.date, offsetValue);
    }
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
                "w-32 justify-between font-normal text-xs",
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
          className="w-32 text-xs bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
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
          <SelectTrigger id="timezone-picker" className="w-28 text-xs">
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
