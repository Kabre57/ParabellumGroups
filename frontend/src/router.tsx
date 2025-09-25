// frontend/src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "./App";

// On délègue toutes les routes à App (qui contient déjà <Routes>)
export const router = createBrowserRouter([
  {
    path: "/*",
    element: <App />,
  },
]);
