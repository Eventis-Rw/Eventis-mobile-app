import { Redirect } from "expo-router";
import React from "react";

// Superseded by the Become an Organiser flow (app/organiser). Kept so existing
// links to /business/register still land somewhere sensible. Non-organisers
// never reach this screen: the business layout sends them to /organiser first.
export default function BusinessRegisterRedirect() {
  return <Redirect href={"/business/dashboard" as any} />;
}
