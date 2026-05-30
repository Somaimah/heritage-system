import { useState, useEffect } from "react";

export function useSessionStorage(key, initialValue) {
  // 1. Grab the value from storage, or use the initial value if nothing is saved
  const [value, setValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn("Error reading sessionStorage", error);
      return initialValue;
    }
  });

  // 2. Anytime the value changes, update the storage automatically
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Error setting sessionStorage", error);
    }
  }, [key, value]);

  return [value, setValue];
}