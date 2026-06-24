import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SiteDataProvider } from "./context/SiteDataContext";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SiteDataProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SiteDataProvider>
  </StrictMode>,
);
