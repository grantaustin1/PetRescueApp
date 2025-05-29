import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MarketingApp from "./MarketingApp";
import App from "./App"; // Your existing pet tag system
import "./MarketingApp.css";
import "./App.css";

// Router component to handle both marketing and application routes
const MainRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Marketing website routes */}
        <Route path="/" element={<MarketingApp />} />
        <Route path="/how-it-works" element={<MarketingApp />} />
        <Route path="/about" element={<MarketingApp />} />
        <Route path="/pricing" element={<MarketingApp />} />
        
        {/* Application routes (existing system) */}
        <Route path="/register" element={<App />} />
        <Route path="/scan/:petId" element={<App />} />
        <Route path="/customer/*" element={<App />} />
        <Route path="/admin" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MainRouter />
  </React.StrictMode>
);
