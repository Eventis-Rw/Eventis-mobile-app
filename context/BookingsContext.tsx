import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { api, getToken } from "@/utils/apiClient";

export interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventImage: string;
  userId: string;
  status: "confirmed" | "pending" | "cancelled";
  ticketCode: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  purchasedAt: string;
  isPaid: boolean;
}

interface BookingsContextType {
  bookings: Booking[];
  isLoading: boolean;
  addBooking: (booking: Omit<Booking, "id" | "purchasedAt" | "ticketCode" | "status">) => Promise<Booking>;
  cancelBooking: (bookingId: string) => Promise<void>;
  getBooking: (bookingId: string) => Booking | undefined;
  hasBookedEvent: (eventId: string) => boolean;
  refreshBookings: () => Promise<void>;
}

const BookingsContext = createContext<BookingsContextType | null>(null);
const STORAGE_KEY = "@eventis_bookings_v2";

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetch = useRef<number>(0);

  const loadLocal = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setBookings(JSON.parse(stored));
    } catch {}
  }, []);

  const saveLocal = useCallback(async (list: Booking[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }, []);

  const refreshBookings = useCallback(async () => {
    if (Date.now() - lastFetch.current < 5000) return;
    const token = await getToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.get<{ bookings: Booking[] }>("/bookings");
      setBookings(data.bookings);
      await saveLocal(data.bookings);
      lastFetch.current = Date.now();
    } catch {
      await loadLocal();
    } finally {
      setIsLoading(false);
    }
  }, [loadLocal, saveLocal]);

  useEffect(() => {
    (async () => {
      await loadLocal();
      await refreshBookings();
    })();
  }, [loadLocal, refreshBookings]);

  const addBooking = useCallback(
    async (
      bookingData: Omit<Booking, "id" | "purchasedAt" | "ticketCode" | "status">
    ): Promise<Booking> => {
      const token = await getToken();
      if (token) {
        try {
          const data = await api.post<{ booking: Booking }>("/bookings", bookingData);
          const updated = [data.booking, ...bookings];
          setBookings(updated);
          await saveLocal(updated);
          return data.booking;
        } catch (err) {
          const existing = bookings.find(
            (b) => b.eventId === bookingData.eventId && b.status === "confirmed"
          );
          if (existing) return existing;
        }
      }
      const local: Booking = {
        ...bookingData,
        id: Date.now().toString(),
        ticketCode: `EVT-${Date.now().toString(36).toUpperCase()}`,
        status: "confirmed",
        purchasedAt: new Date().toISOString(),
      };
      const updated = [local, ...bookings];
      setBookings(updated);
      await saveLocal(updated);
      return local;
    },
    [bookings, saveLocal]
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      const token = await getToken();
      if (token) {
        try {
          await api.delete(`/bookings/${bookingId}`);
        } catch {}
      }
      const updated = bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled" as const } : b
      );
      setBookings(updated);
      await saveLocal(updated);
    },
    [bookings, saveLocal]
  );

  const getBooking = useCallback(
    (bookingId: string) => bookings.find((b) => b.id === bookingId),
    [bookings]
  );

  const hasBookedEvent = useCallback(
    (eventId: string) =>
      bookings.some((b) => b.eventId === eventId && b.status !== "cancelled"),
    [bookings]
  );

  return (
    <BookingsContext.Provider
      value={{ bookings, isLoading, addBooking, cancelBooking, getBooking, hasBookedEvent, refreshBookings }}
    >
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error("useBookings must be used within BookingsProvider");
  return ctx;
}
