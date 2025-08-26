'use client';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function AppHeader() {
  const [user] = useAuthState(auth);
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="font-bold text-xl">
            TicketFlow
          </Link>
        </div>

        {/* Menu para dispositivos móveis */}
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={toggleMenu}>
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Menu para desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {user && (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/new-ticket"
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/dashboard/new-ticket" ? "text-primary" : "text-muted-foreground"}`}
              >
                Novo Chamado
              </Link>
              <Link
                href="/dashboard/analytics"
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/dashboard/analytics" ? "text-primary" : "text-muted-foreground"}`}
              >
                Análises
              </Link>
            </>
          )}
        </nav>

        {/* Perfil do usuário */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "Usuário"} />
                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <Button variant="outline" onClick={handleSignOut}>
                Sair
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Menu mobile expandido */}
      {isMenuOpen && user && (
        <div className="md:hidden border-t p-4 bg-background">
          <nav className="flex flex-col space-y-4">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/new-ticket"
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/dashboard/new-ticket" ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Novo Chamado
            </Link>
            <Link
              href="/dashboard/analytics"
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/dashboard/analytics" ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Análises
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}