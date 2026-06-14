import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ModeProvider } from "./context/ModeContext";
import "./index.css";
import "./styles.css";
import "./styles/tcs-theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ModeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ModeProvider>
  </React.StrictMode>,
);
