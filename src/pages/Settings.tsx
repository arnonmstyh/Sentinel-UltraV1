import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Bell, Shield, Users, Database, HeartPulse } from "lucide-react";
import DataHealth from "@/components/dashboard/DataHealth";

const Settings = () => {
  const settingsCategories = [
    {
      title: "Notifications",
      icon: Bell,
      description: "Configure alert and notification preferences",
    },
    {
      title: "Security Policies",
      icon: Shield,
      description: "Manage security rules and policies",
    },
    {
      title: "Team Management",
      icon: Users,
      description: "Add and manage SOC team members",
    },
    {
      title: "Data Sources",
      icon: Database,
      description: "Configure data sources and integrations",
    },
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your CSOC environment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category) => (
          <Card
            key={category.title}
            className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300 cursor-pointer"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <category.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{category.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Data Health */}
      <DataHealth />
    </div>
  );
};

export default Settings;
