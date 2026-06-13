import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Hud from "./Hud";
import "./index.css";

// ?hud renders the compact floating overlay (the Electron HUD window); the
// bare URL renders the full room console.
const isHud = new URLSearchParams(window.location.search).has("hud");
if (isHud) document.documentElement.classList.add("hud");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isHud ? <Hud /> : <App />}</React.StrictMode>,
);
