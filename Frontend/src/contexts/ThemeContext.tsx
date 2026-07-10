import React, { createContext, useContext, useEffect, useState } from "react"
import { authApi, isOnline } from "../services/api"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const getInitialTheme = (): Theme => {
    try {
      const userStr = localStorage.getItem('dairy_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.preferences?.theme) return user.preferences.theme;
      }
    } catch {}
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        const userStr = localStorage.getItem('dairy_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.preferences?.theme) {
            setThemeState(user.preferences.theme);
          }
        }
      } catch {}
    };
    window.addEventListener('dairy-user-login', handleUserUpdate);
    window.addEventListener('dairy-reset', () => setThemeState(defaultTheme));
    return () => {
      window.removeEventListener('dairy-user-login', handleUserUpdate);
    };
  }, [defaultTheme]);

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setThemeState(theme)

      // Sync to backend if online and logged in
      const userStr = localStorage.getItem('dairy_user');
      if (userStr && isOnline()) {
        try {
          const user = JSON.parse(userStr);
          if (user.id) {
            // Update local user object
            if (!user.preferences) user.preferences = {};
            user.preferences.theme = theme;
            localStorage.setItem('dairy_user', JSON.stringify(user));

            authApi.updatePreferences({ theme }).catch(() => {});
          }
        } catch {}
      }
    },
  }

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
