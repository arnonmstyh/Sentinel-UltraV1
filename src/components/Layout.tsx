import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, AlertTriangle, FileText, Settings, KeyRound } from "lucide-react";
import { useAuth } from "@/context/auth";
import AICompanion from "./AICompanion";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/incidents", icon: AlertTriangle, label: "Incidents" },
    { path: "/reports", icon: FileText, label: "Reports" },
    { path: "/ssl-monitor", icon: Shield, label: "SSL Monitor" },
    { path: "/vpn-access", icon: KeyRound, label: "VPN Access" },
    { path: "/settings", icon: Settings, label: "Settings" },
    { path: "/records", icon: FileText, label: "Records" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AIT SOC</h1>
              <p className="text-xs text-muted-foreground">Security Operations</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive(item.path)
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">SE</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{useAuth().user?.username || "Authenticated"}</p>
              <p className="text-xs text-muted-foreground">Logged in</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* AI Companion Widget */}
      <AICompanion />
    </div>
  );
};

export default Layout;

const LogoutButton = () => {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className="text-xs px-3 py-1 rounded-md border border-border hover:bg-secondary"
    >
      Logout
    </button>
  );
};
