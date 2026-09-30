import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import type { Booking } from "@/context/BookingsContext";

interface TicketCardProps {
  booking: Booking;
  index: number;
}

export function TicketCard({ booking, index }: TicketCardProps) {
  const colors = useColors();
  const isCancelled = booking.status === "cancelled";

  const statusColorClass =
    booking.status === "confirmed"
      ? "text-success"
      : booking.status === "pending"
      ? "text-warning"
      : "text-destructive";

  const statusBgClass =
    booking.status === "confirmed"
      ? "bg-success/13"
      : booking.status === "pending"
      ? "bg-warning/13"
      : "bg-destructive/13";

  const statusDotClass =
    booking.status === "confirmed"
      ? "bg-success"
      : booking.status === "pending"
      ? "bg-warning"
      : "bg-destructive";

  return (
    <Animated.View
      entering={Platform.OS !== "web" ? FadeInDown.delay(index * 80).springify() : undefined}
      className={`mb-4 overflow-hidden rounded-2xl border border-border bg-card dark:border-border-dark dark:bg-card-dark ${
        isCancelled ? "opacity-55" : "opacity-100"
      }`}
    >
      <View className="flex-row items-start gap-3 p-[18px]">
        <View className="flex-1 gap-2">
          <Text
            className="font-semibold text-[17px] leading-6 text-foreground dark:text-foreground-dark"
            numberOfLines={2}
          >
            {booking.eventTitle}
          </Text>
          <View
            className={`flex-row items-center gap-1.5 self-start rounded-[20px] px-2.5 py-1 ${statusBgClass}`}
          >
            <View className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
            <Text className={`font-semibold text-xs ${statusColorClass}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>
        <View className="rounded-xl bg-primary px-3.5 py-2">
          <Text className="font-bold text-[15px] text-white">
            {booking.totalPrice === 0
              ? "Free"
              : `£${booking.totalPrice}`}
          </Text>
        </View>
      </View>

      <View className="relative h-px flex-row items-center bg-border dark:bg-border-dark">
        <View className="absolute left-[-10px] z-[2] h-5 w-5 rounded-full bg-background dark:bg-background-dark" />
        <View className="flex-1 flex-row justify-between px-4">
          {Array(20)
            .fill(null)
            .map((_, i) => (
              <View
                key={i}
                className="h-px w-1.5 bg-border dark:bg-border-dark"
              />
            ))}
        </View>
        <View className="absolute right-[-10px] z-[2] h-5 w-5 rounded-full bg-background dark:bg-background-dark" />
      </View>

      <View className="p-[18px]">
        <View className="flex-row gap-5">
          <View className="flex-1 flex-row items-start gap-2">
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <View>
              <Text className="mb-px font-medium text-[11px] text-muted-foreground dark:text-muted-foreground-dark">
                Date
              </Text>
              <Text className="font-semibold text-[13px] text-foreground dark:text-foreground-dark">
                {formatDate(booking.eventDate)}
              </Text>
            </View>
          </View>
          <View className="flex-1 flex-row items-start gap-2">
            <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
            <View>
              <Text className="mb-px font-medium text-[11px] text-muted-foreground dark:text-muted-foreground-dark">
                Time
              </Text>
              <Text className="font-semibold text-[13px] text-foreground dark:text-foreground-dark">
                {booking.eventTime}
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-2.5 flex-1 flex-row items-start gap-2">
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          <View className="flex-1">
            <Text className="mb-px font-medium text-[11px] text-muted-foreground dark:text-muted-foreground-dark">
              Location
            </Text>
            <Text
              className="font-semibold text-[13px] text-foreground dark:text-foreground-dark"
              numberOfLines={2}
            >
              {booking.eventLocation}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-5 bg-muted p-[18px] dark:bg-muted-dark">
        <View className="rounded-[10px] bg-white p-2">
          <QRPattern />
        </View>
        <View className="flex-1">
          <Text className="mb-1 font-medium text-[11px] text-muted-foreground dark:text-muted-foreground-dark">
            Ticket Code
          </Text>
          <Text className="mb-1 font-bold text-[15px] tracking-[2px] text-foreground dark:text-foreground-dark">
            {booking.ticketCode}
          </Text>
          <Text className="font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
            {booking.quantity} {booking.quantity === 1 ? "ticket" : "tickets"}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function QRPattern() {
  const rows = 6;
  const cols = 6;
  const cells = React.useMemo(() => {
    const arr: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
      arr[r] = [];
      for (let c = 0; c < cols; c++) {
        arr[r][c] = Math.random() > 0.45;
      }
    }
    arr[0][0] = arr[0][1] = arr[1][0] = arr[1][1] = true;
    arr[0][4] = arr[0][5] = arr[1][4] = arr[1][5] = true;
    arr[4][0] = arr[4][1] = arr[5][0] = arr[5][1] = true;
    return arr;
  }, []);

  return (
    <View className="h-[60px] w-[60px] flex-row flex-wrap gap-0.5">
      {cells.map((row, r) =>
        row.map((filled, c) => (
          <View
            key={`${r}-${c}`}
            className={`h-2 w-2 rounded-[1.5px] ${
              filled
                ? "bg-foreground dark:bg-foreground-dark"
                : "bg-transparent"
            }`}
          />
        ))
      )}
    </View>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
