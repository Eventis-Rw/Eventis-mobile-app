import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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
  addBooking: (booking: Omit<Booking, "id" | "purchasedAt">) => Promise<Booking>;
  cancelBooking: (bookingId: string) => Promise<void>;
  getBooking: (bookingId: string) => Booking | undefined;
  hasBookedEvent: (eventId: string) => boolean;
}

const BookingsContext = createContext<BookingsContextType | null>(null);
const STORAGE_KEY = "@eventis_bookings";

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setBookings(JSON.parse(stored));
      } catch {}
    })();
  }, []);

  const persist = useCallback(async (b: Booking[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(b));
    setBookings(b);
  }, []);

  const addBooking = useCallback(
    async (booking: Omit<Booking, "id" | "purchasedAt">): Promise<Booking> => {
      const newBooking: Booking = {
        ...booking,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        purchasedAt: new Date().toISOString(),
      };
      const updated = [newBooking, ...bookings];
      await persist(updated);
      return newBooking;
    },
    [bookings, persist]
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      const updated = bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled" as const } : b
      );
      await persist(updated);
    },
    [bookings, persist]
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
      value={{ bookings, addBooking, cancelBooking, getBooking, hasBookedEvent }}
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
