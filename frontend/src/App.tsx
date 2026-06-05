import { useState } from "react";
import ChatApp from "./ChatApp";
import Landing from "./Landing";

export default function App() {
  const [view, setView] = useState<"landing" | "chat">("landing");

  if (view === "chat") {
    return <ChatApp onBack={() => setView("landing")} />;
  }

  return <Landing onStartChat={() => setView("chat")} />;
}
