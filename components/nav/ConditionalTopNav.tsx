"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";

export default function ConditionalTopNav() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <TopNav />;
}
