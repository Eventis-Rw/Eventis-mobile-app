import { Redirect } from "expo-router";
import React from "react";

// Legacy links now open event creation; standalone posts are no longer offered.
export default function CreatePostRedirect() {
  return <Redirect href="/business/create-event" />;
}
