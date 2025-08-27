'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, PlusCircle, BarChart3, Users } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { isAdmin, checkAdminStatus } from "@/lib/auth-utils";
import { useEffect, useState } from "react";

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
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        // Primeiro verifica pelo método legado (email)
        const legacyAdminCheck = isAdmin(user.email);
        if (legacyAdminCheck) {
          setIsUserAdmin(true);
          return;
        }
        
        // Depois verifica pelo Firestore
        const firestoreAdminCheck = await checkAdminStatus(user.uid);
        setIsUserAdmin(firestoreAdminCheck);
      } else {
        setIsUserAdmin(false);
      }
    };
    
    checkAdmin();
  }, [user]);

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
    {
      href: "/dashboard/admin/users",
      title: "Usuários",
      icon: <Users className="mr-2 h-4 w-4" />,
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