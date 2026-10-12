import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { ticketPattern } from "@/utils/customerProfile";

interface TicketCodePatternProps {
  code: string;
  /** Rendered width/height in points, excluding the white quiet zone. */
  size: number;
  cells?: number;
  dimmed?: boolean;
}

/**
 * Pass graphic for a ticket, stable per ticket code. Always dark on white so it
 * stays legible in dark mode. Not a scannable QR (see `ticketPattern`).
 */
export function TicketCodePattern({ code, size, cells = 9, dimmed }: TicketCodePatternProps) {
  const grid = useMemo(() => ticketPattern(code, cells), [code, cells]);
  const cell = size / cells;

  return (
    <View
      style={[styles.frame, { padding: Math.max(6, cell), opacity: dimmed ? 0.35 : 1 }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Ticket pass for code ${code}`}
    >
      <View style={{ width: size, height: size, flexDirection: "row", flexWrap: "wrap" }}>
        {grid.map((row, r) =>
          row.map((filled, c) => (
            <View
              key={`${r}-${c}`}
              style={{ width: cell, height: cell, backgroundColor: filled ? "#0F172A" : "transparent" }}
            />
          )),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: "#FFFFFF", borderRadius: 10, alignSelf: "flex-start" },
});
