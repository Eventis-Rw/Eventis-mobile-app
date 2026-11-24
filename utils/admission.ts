/** Admission as shown to people: free entry, a paid ticket price, or paid entry priced on the ticket page. */
export type AdmissionInput = { isPaid: boolean; price: number; currency: string };

export function hasTicketPrice(event: AdmissionInput): boolean {
  return event.isPaid && Number.isFinite(event.price) && event.price > 0;
}

export function admissionLabel(event: AdmissionInput): string {
  if (!event.isPaid) return "Free entry";
  return hasTicketPrice(event) ? `${event.currency} ${event.price.toLocaleString()}` : "Paid entry";
}

/** Only web links are opened from "Get Tickets". */
export function ticketLink(event: { isPaid: boolean; organizerWebsite?: string }): string | undefined {
  const url = event.organizerWebsite?.trim();
  return event.isPaid && url && /^https?:\/\//i.test(url) ? url : undefined;
}
