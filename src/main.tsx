import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppStateProvider } from "./contexts/AppStateContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import "./styles/globals.css";
import "./styles/themes.css";
import "./styles/variables.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // Temporarily disabled StrictMode to prevent duplicate drag-drop listeners
  // <React.StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </NotificationProvider>
    </ThemeProvider>
  // </React.StrictMode>,
);
