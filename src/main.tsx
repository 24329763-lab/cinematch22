import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Sanity check: log which backend the build is pointing to
if (import.meta.env.DEV || import.meta.env.MODE !== "production") {
  console.log("[CineMatch] Backend:", import.meta.env.VITE_SUPABASE_URL);
}

createRoot(document.getElementById("root")!).render(<App />);
