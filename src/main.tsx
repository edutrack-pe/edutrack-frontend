import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App, crearQueryClient, Proveedores } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Proveedores client={crearQueryClient()}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Proveedores>
  </StrictMode>,
);
