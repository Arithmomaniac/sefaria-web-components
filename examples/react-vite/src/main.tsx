import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ReactSourceCardExample } from "./app.js";
import "./style.css";

const mount = document.querySelector("#root");
if (!mount) throw new Error("The React example mount is missing.");

createRoot(mount).render(
  <StrictMode>
    <ReactSourceCardExample />
  </StrictMode>,
);
