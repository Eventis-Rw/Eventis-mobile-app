import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { localToday } from "@/utils/dates";

const pad = (n: number) => String(n).padStart(2, "0");

export function EventScheduleFields({ date, time, onDate, onTime }: {
  date: string; time: string; onDate: (value: string) => void; onTime: (value: string) => void;
}) {
  const p = useOrganiserPalette();
  const [mode, setMode] = useState<"date" | "time" | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [draftDate, setDraftDate] = useState("");
  const [hour, setHour] = useState(19);
  const [minute, setMinute] = useState(0);
  const today = localToday();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const open = (next: "date" | "time") => {
    setDraftDate(date || today);
    const [y, m, d] = (date || today).split("-").map(Number);
    setMonth(new Date(y, m - 1, d));
    const [h, min] = (time || "19:00").split(":").map(Number);
    setHour(h); setMinute(min); setMode(next);
  };
  const field = (type: "date" | "time", label: string, value: string) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: p.text }]}>{label} <Text style={{ color: p.accent }}>*</Text></Text>
      <Pressable onPress={() => open(type)} accessibilityRole="button" accessibilityLabel={`${label}: ${value || "Choose"}`}
        style={[styles.input, { backgroundColor: p.surfaceRaised, borderColor: p.line }]}>
        <Ionicons name={type === "date" ? "calendar-outline" : "time-outline"} size={20} color={p.accent} />
        <Text style={[styles.value, { color: value ? p.text : p.muted }]}>{value || `Choose ${type}`}</Text>
        <Ionicons name="chevron-down" size={16} color={p.muted} />
      </Pressable>
    </View>
  );
  return (
    <View style={styles.fields}>
      {field("date", "Date", date ? date.split("-").reverse().join("/") : "")}
      {field("time", "Start time · 24 hour", time)}
      <Modal visible={mode !== null} transparent animationType="fade" onRequestClose={() => setMode(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMode(null)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={[styles.sheet, { backgroundColor: p.surface, borderColor: p.line }]}>
            <View style={styles.heading}>
              <Text style={[styles.title, { color: p.text }]}>{mode === "date" ? "Choose event date" : "Choose start time"}</Text>
              <Pressable onPress={() => setMode(null)} accessibilityRole="button" accessibilityLabel="Close picker" style={styles.icon}><Ionicons name="close" size={22} color={p.text} /></Pressable>
            </View>
            {mode === "date" ? <>
              <View style={styles.heading}>
                <Pressable onPress={() => setMonth(new Date(year, monthIndex - 1, 1))} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.icon}><Ionicons name="chevron-back" size={22} color={p.accent} /></Pressable>
                <Text style={[styles.label, { color: p.text }]}>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</Text>
                <Pressable onPress={() => setMonth(new Date(year, monthIndex + 1, 1))} accessibilityRole="button" accessibilityLabel="Next month" style={styles.icon}><Ionicons name="chevron-forward" size={22} color={p.accent} /></Pressable>
              </View>
              <View style={styles.calendar}>
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <View key={`weekday-${i}`} style={styles.day}><Text style={{ color: p.muted }}>{day}</Text></View>)}
                {Array.from({ length: offset + days }, (_, i) => {
                  const day = i - offset + 1;
                  if (day < 1) return <View key={i} style={styles.day} />;
                  const value = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
                  const disabled = value < today;
                  const selected = draftDate === value;
                  return <Pressable key={i} disabled={disabled} onPress={() => setDraftDate(value)} accessibilityRole="button" accessibilityLabel={value} accessibilityState={{ disabled, selected }}
                    style={[styles.day, { borderRadius: 12, backgroundColor: selected ? p.blue : "transparent", opacity: disabled ? 0.25 : 1 }]}><Text style={{ color: selected ? p.onBlue : p.text }}>{day}</Text></Pressable>;
                })}
              </View>
            </> : <>
              <Text style={[styles.timePreview, { color: p.accent }]}>{pad(hour)}:{pad(minute)}</Text>
              <View style={styles.timeColumns}>
                {([{ label: "Hour", count: 24, value: hour, set: setHour }, { label: "Minute", count: 60, value: minute, set: setMinute }]).map((column) => (
                  <View key={column.label} style={styles.timeColumn}>
                    <Text style={[styles.label, { color: p.muted, textAlign: "center" }]}>{column.label}</Text>
                    <ScrollView style={styles.timeScroll} contentOffset={{ x: 0, y: Math.max(0, column.value * 44 - 88) }}>
                      {Array.from({ length: column.count }, (_, value) => <Pressable key={value} onPress={() => column.set(value)} accessibilityRole="button" accessibilityLabel={`${column.label} ${pad(value)}`} accessibilityState={{ selected: value === column.value }} style={[styles.timeOption, { backgroundColor: value === column.value ? p.blueSoft : "transparent" }]}><Text style={{ color: value === column.value ? p.accent : p.text, fontSize: 18 }}>{pad(value)}</Text></Pressable>)}
                    </ScrollView>
                  </View>
                ))}
              </View>
            </>}
            <Pressable onPress={() => { if (mode === "date") onDate(draftDate); else onTime(`${pad(hour)}:${pad(minute)}`); setMode(null); }} disabled={mode === "date" && draftDate < today} accessibilityRole="button" style={[styles.done, { backgroundColor: p.blue }]}><Text style={styles.doneText}>Confirm {mode}</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  fields: { gap: 16 }, field: { gap: 8 }, label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderWidth: 1, borderRadius: 14, minHeight: 54 }, value: { flex: 1, fontSize: 15 },
  backdrop: { flex: 1, padding: 20, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: { width: "100%", maxWidth: 400, padding: 18, borderRadius: 24, borderWidth: 1, gap: 14 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { fontSize: 18, fontFamily: "Inter_700Bold" }, icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  calendar: { flexDirection: "row", flexWrap: "wrap" }, day: { width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center" },
  timePreview: { fontSize: 32, textAlign: "center", fontFamily: "Inter_700Bold" }, timeColumns: { flexDirection: "row", gap: 16 }, timeColumn: { flex: 1, gap: 8 }, timeScroll: { height: 220 }, timeOption: { height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  done: { minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" }, doneText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
