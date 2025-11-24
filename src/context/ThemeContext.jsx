// src/context/ThemeContext.jsx
import React, { createContext, useState, useEffect, useCallback } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    const className = "dark-mode";
    if (darkMode) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const setDarkModeExplicit = useCallback((value) => {
    setDarkMode(Boolean(value));
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode: setDarkModeExplicit }}>
      {children}
    </ThemeContext.Provider>
  );
};