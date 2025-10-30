import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 🔐 Guard: permitir acceso si viene con ?auth=dev o si ya hay localStorage
const params = new URLSearchParams(window.location.search);
const fromLogin = params.get('auth') === 'dev';

if (fromLogin) {
  // guarda la "sesión" EN EL ORIGEN DEL DASHBOARD (3003)
  localStorage.setItem('salon_auth', 'ok');
  // limpia el query param de la URL
  window.history.replaceState({}, '', window.location.pathname);
}

if (!fromLogin && localStorage.getItem('salon_auth') !== 'ok') {
  // sin flag y sin sesión → mandar a la landing (3001)
  window.location.href = 'http://localhost:3001/';
}

createRoot(document.getElementById("root")!).render(<App />);
