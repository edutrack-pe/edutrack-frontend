import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App, crearQueryClient, FUTURO_ROUTER, Proveedores } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Proveedores client={crearQueryClient()}>
      <BrowserRouter future={FUTURO_ROUTER}>
        <App />
      </BrowserRouter>
    </Proveedores>
  </StrictMode>,
);
