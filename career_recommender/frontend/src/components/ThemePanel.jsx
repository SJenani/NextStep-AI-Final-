import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export default function ThemePanel({ compact = false }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`theme-panel ${compact ? "theme-panel-compact" : ""}`} aria-label="Theme selector">
      {options.map(({ value, label, Icon }) => {
        const isActive = theme === value;

        return (
          <button
            key={value}
            type="button"
            className={`theme-panel-button ${isActive ? "active" : ""}`}
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            title={`${label} theme`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
