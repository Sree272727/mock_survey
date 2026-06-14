import { NavLink, Outlet } from "react-router-dom";

import { useMode } from "../context/ModeContext";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

type NavItem = { label: string; to: string };

const customerItems: NavItem[] = [
  { label: "Surveys", to: "/" },
  { label: "Facilities", to: "/admin/facilities" },
  { label: "Users", to: "/admin/users" },
];

const platformItems: NavItem[] = [
  { label: "Question Library", to: "/admin/questions" },
  { label: "Pathways", to: "/admin/pathways" },
  { label: "Templates", to: "/admin/templates" },
];

export default function AppLayout() {
  const { mode, setMode } = useMode();
  const navItems = mode === "customer" ? customerItems : platformItems;
  const modeLabel = mode === "customer" ? "LTC Customer" : "Platform Admin";

  return (
    <div className="modeLayout">
      <header className="modeHeader h-16 bg-white border-b border-border px-6 flex items-center justify-between">
        <div className="modeHeaderInner w-full max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="modeBrandRow flex items-center gap-4">
            <img src="/tcs-logo.png" alt="The Compliance Store logo" className="h-7" />
            <div className="w-px h-6 bg-border" />
            <h1 className="text-lg font-medium text-[#303030]">LTC Survey Platform</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="modeSwitchTrigger text-[#595959]">
                {modeLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setMode("platform")}>Platform Admin</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMode("customer")}>LTC Customer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <aside className="modeSidebar">
        <nav className="modeNav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="modeContent">
        <section className="modeContentCard">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
