'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, PlusCircle, BarChart3 } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { isAdmin } from "@/lib/auth-utils";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }[];
}

export function AppSidebar({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const [user] = useAuthState(auth);
  const isUserAdmin = user ? isAdmin(user.email) : false;

  const items = [
    {
      href: "/dashboard",
      title: "Dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      href: "/dashboard/new-ticket",
      title: "Novo Chamado",
      icon: <PlusCircle className="mr-2 h-4 w-4" />,
    },
    {
      href: "/dashboard/analytics",
      title: "Análises",
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      adminOnly: true,
    },
  ];

  const filteredItems = items.filter(item => !item.adminOnly || isUserAdmin);

  return (
    <nav
      className={cn(
        "hidden md:block space-y-1 py-4 px-3 bg-muted/40",
        className
      )}
      {...props}
    >
      <SidebarNav items={filteredItems} />
    </nav>
  );
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col space-y-1", className)} {...props}>
      {items.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "justify-start",
            pathname === item.href
              ? "bg-secondary text-secondary-foreground"
              : "hover:bg-transparent hover:underline"
          )}
          asChild
        >
          <Link href={item.href}>
            {item.icon}
            {item.title}
          </Link>
        </Button>
      ))}
    </nav>
  );
}