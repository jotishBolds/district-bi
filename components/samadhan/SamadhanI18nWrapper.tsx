"use client";

import { SamadhanI18nProvider } from "@/lib/samadhan-i18n";

export default function SamadhanI18nWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SamadhanI18nProvider>{children}</SamadhanI18nProvider>;
}
