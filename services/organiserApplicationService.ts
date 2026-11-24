import { api } from "@/utils/apiClient";

export type OrganiserApplicationStatus = "PENDING_PAYMENT" | "IN_REVIEW" | "APPROVED" | "REJECTED";
export interface OrganiserApplication {
  id: string;
  status: OrganiserApplicationStatus;
  name: string;
  description: string;
  activities: string;
  location: string;
  website: string | null;
  manualPaymentId: string | null;
  submittedAt: string | null;
  rejectionReason: string | null;
}
export type OrganiserApplicationInput = Pick<OrganiserApplication, "name" | "description" | "activities" | "location"> & { website?: string };

export async function getMyOrganiserApplication(): Promise<OrganiserApplication | null> {
  const result = await api.get<{ application: OrganiserApplication | null }>("/api/v1/me/organiser-application");
  return result.application;
}

export function createOrganiserApplication(input: OrganiserApplicationInput): Promise<OrganiserApplication> {
  return api.post("/api/v1/organiser-applications", input);
}
