import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_CONVEX_URL environment variable.\n" +
      "Set it in .env.local\n" +
      "You can get the URL from https://dashboard.convex.dev"
  );
}

export const convex = new ConvexReactClient(convexUrl);
