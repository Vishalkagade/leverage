import type { Metadata } from "next";
import Notes from "@/components/Notes";

export const metadata: Metadata = {
  title: "Notes · Leverage",
};

export default function NotesPage() {
  return <Notes />;
}
