'use client';

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Ticket } from "@/lib/types";
import { isAdmin } from "@/lib/auth-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("open");
  const userIsAdmin = user ? isAdmin(user.email) : false;
  const router = useRouter();

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return;

      try {
        setLoading(true);
        let ticketsQuery;

        if (userIsAdmin) {
          // Administradores veem todos os tickets
          ticketsQuery = query(
            collection(db, "tickets"),
            orderBy("createdAt", "desc")
          );
        } else {
          // Usuários normais veem apenas seus próprios tickets
          // Usar apenas o filtro por userId sem ordenação para evitar necessidade de índice composto
          ticketsQuery = query(
            collection(db, "tickets"),
            where("userId", "==", user.uid)
          );
        }

        const querySnapshot = await getDocs(ticketsQuery);
        const fetchedTickets: Ticket[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedTickets.push({
            id: doc.id,
            ticketNumber: data.ticketNumber || 0, // Fallback para tickets antigos
            subject: data.subject,
            department: data.department,
            description: data.description,
            priority: data.priority,
            status: data.status,
            createdAt: data.createdAt.toDate(),
            deadline: data.deadline ? data.deadline.toDate() : undefined,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            attachmentUrl: data.attachmentUrl,
            attachmentName: data.attachmentName,
          });
        });

        setTickets(fetchedTickets);
      } catch (error) {
        console.error("Erro ao buscar tickets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user, userIsAdmin]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "open") return matchesSearch && ticket.status === "Aberto";
    if (activeTab === "closed") return matchesSearch && ticket.status === "Fechado";
    return matchesSearch;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Alta":
        return "destructive";
      case "Média":
        return "warning";
      case "Baixa":
        return "secondary";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Gerencie seus chamados e acompanhe o status de cada solicitação.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Input
            placeholder="Buscar chamados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Tabs defaultValue="open" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="open">Abertos</TabsTrigger>
            <TabsTrigger value="in_progress">Em Andamento</TabsTrigger>
            <TabsTrigger value="closed">Fechados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum chamado encontrado.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <Card 
                    key={ticket.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/dashboard/ticket/${ticket.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-muted-foreground">
                              #{ticket.ticketNumber || ticket.id.substring(0, 6).toUpperCase()}
                            </span>
                            <CardTitle className="text-lg truncate">{ticket.subject}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{ticket.department}</Badge>
                            <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">{ticket.priority}</Badge>
                            <Badge variant={ticket.status === "open" ? "outline" : "secondary"} className="text-xs">
                              {ticket.status === "open" ? "Aberto" : "Fechado"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground ml-4">
                          {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="open" className="space-y-4">
            {filteredTickets.filter(ticket => ticket.status.toLowerCase() === "aberto" || ticket.status.toLowerCase() === "open").length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum chamado aberto encontrado.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTickets.filter(ticket => ticket.status.toLowerCase() === "aberto" || ticket.status.toLowerCase() === "open").map((ticket) => (
                  <Card 
                    key={ticket.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/dashboard/ticket/${ticket.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-muted-foreground">
                              #{ticket.ticketNumber || ticket.id.substring(0, 6).toUpperCase()}
                            </span>
                            <CardTitle className="text-lg truncate">{ticket.subject}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{ticket.department}</Badge>
                            <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">{ticket.priority}</Badge>
                            <Badge variant="outline" className="text-xs">Aberto</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground ml-4">
                          {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="in_progress" className="space-y-4">
            {filteredTickets.filter(ticket => ticket.status.toLowerCase() === "em andamento").length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum chamado em andamento encontrado.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTickets.filter(ticket => ticket.status.toLowerCase() === "em andamento").map((ticket) => (
                  <Card 
                    key={ticket.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/dashboard/ticket/${ticket.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-muted-foreground">
                              #{ticket.ticketNumber || ticket.id.substring(0, 6).toUpperCase()}
                            </span>
                            <CardTitle className="text-lg truncate">{ticket.subject}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{ticket.department}</Badge>
                            <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">{ticket.priority}</Badge>
                            <Badge variant="secondary" className="text-xs">Em Andamento</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground ml-4">
                          {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="closed" className="space-y-4">
            {filteredTickets.filter(ticket => ticket.status.toLowerCase() === "fechado" || ticket.status.toLowerCase() === "closed").length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum chamado fechado encontrado.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTickets.filter(ticket => ticket.status.toLowerCase() === "fechado" || ticket.status.toLowerCase() === "closed").map((ticket) => (
                  <Card 
                    key={ticket.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/dashboard/ticket/${ticket.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-muted-foreground">
                              #{ticket.ticketNumber || ticket.id.substring(0, 6).toUpperCase()}
                            </span>
                            <CardTitle className="text-lg truncate">{ticket.subject}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{ticket.department}</Badge>
                            <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">{ticket.priority}</Badge>
                            <Badge variant="secondary" className="text-xs">Fechado</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground ml-4">
                          {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}