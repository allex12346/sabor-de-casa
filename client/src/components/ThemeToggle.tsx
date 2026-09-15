import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) return null;

  const isDark = theme === "dark";
  const label = isDark ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="rounded-full w-10 h-10 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600 dark:text-stone-300" />}
    </Button>
  );
}
