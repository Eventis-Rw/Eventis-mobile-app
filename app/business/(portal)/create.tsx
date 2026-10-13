import { Redirect } from "expo-router";
import React from "react";

// Keep existing links working after consolidating creation tools on Overview.
export default function CreateRedirect() {
  return <Redirect href="/business/dashboard" />;
}
