'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, getDocs } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2, PieChart, BarChart, Calendar } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Ticket } from "@/lib/types";
import { isAdmin } from "@/lib/auth-utils";

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      if (!isAdmin(user.email || "")) {
        toast.error("Você não tem permissão para acessar esta página.");
        router.push("/dashboard");
        return;
      }

      fetchTickets();
    }
  }, [user, loading]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const ticketsRef = collection(db, "tickets");
      const ticketsSnapshot = await getDocs(query(ticketsRef));
      
      const ticketsList: Ticket[] = [];
      ticketsSnapshot.forEach((doc) => {
        ticketsList.push({ id: doc.id, ...doc.data() } as Ticket);
      });
      
      setTickets(ticketsList);
    } catch (error) {
      console.error("Erro ao buscar tickets:", error);
      toast.error("Erro ao carregar dados para análise.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Estatísticas por status
  const statusStats = {
    aberto: tickets.filter(t => t.status.toLowerCase() === "aberto").length,
    emAndamento: tickets.filter(t => t.status.toLowerCase() === "em andamento").length,
    fechado: tickets.filter(t => t.status.toLowerCase() === "fechado").length,
  };

  // Estatísticas por prioridade
  const priorityStats = {
    alta: tickets.filter(t => t.priority.toLowerCase() === "alta").length,
    media: tickets.filter(t => t.priority.toLowerCase() === "média").length,
    baixa: tickets.filter(t => t.priority.toLowerCase() === "baixa").length,
  };

  // Estatísticas por departamento
  const departmentMap = new Map<string, number>();
  tickets.forEach(ticket => {
    const dept = ticket.department;
    departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
  });

  const departmentStats = Array.from(departmentMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Tickets por mês (últimos 6 meses)
  const getMonthlyStats = () => {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = `${monthNames[month.getMonth()]} ${month.getFullYear()}`;
      
      const count = tickets.filter(ticket => {
        if (!ticket.createdAt) return false;
        const ticketDate = ticket.createdAt.toDate();
        return ticketDate.getMonth() === month.getMonth() && 
               ticketDate.getFullYear() === month.getFullYear();
      }).length;
      
      monthlyData.push({ month: monthYear, count });
    }

    return monthlyData;
  };

  const monthlyStats = getMonthlyStats();

  // Tempo médio de resolução (em dias)
  const getAverageResolutionTime = () => {
    const resolvedTickets = tickets.filter(t => 
      t.status.toLowerCase() === "fechado" && t.createdAt && t.updatedAt
    );
    
    if (resolvedTickets.length === 0) return 0;
    
    const totalDays = resolvedTickets.reduce((sum, ticket) => {
      const createdDate = ticket.createdAt.toDate();
      const resolvedDate = ticket.updatedAt.toDate();
      const diffTime = Math.abs(resolvedDate.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);
    
    return Math.round((totalDays / resolvedTickets.length) * 10) / 10; // Arredonda para 1 casa decimal
  };

  const averageResolutionTime = getAverageResolutionTime();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Análise de Tickets</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tickets.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statusStats.aberto}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((statusStats.aberto / tickets.length) * 100) || 0}% do total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio de Resolução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageResolutionTime} dias</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="status">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="priority">Prioridade</TabsTrigger>
          <TabsTrigger value="department">Departamento</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
              <CardDescription>
                Visão geral dos tickets por status atual
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                <div className="w-full">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-full flex items-center">
                        <span className="w-16 text-sm font-medium">Aberto</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full" 
                            style={{ width: `${(statusStats.aberto / tickets.length) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-medium">
                          {statusStats.aberto}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-full flex items-center">
                        <span className="w-16 text-sm font-medium">Andamento</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-purple-500 h-full" 
                            style={{ width: `${(statusStats.emAndamento / tickets.length) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-medium">
                          {statusStats.emAndamento}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-full flex items-center">
                        <span className="w-16 text-sm font-medium">Fechado</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-gray-500 h-full" 
                            style={{ width: `${(statusStats.fechado / tickets.length) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-medium">
                          {statusStats.fechado}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="priority" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Prioridade</CardTitle>
              <CardDescription>
                Visão geral dos tickets por nível de prioridade
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                <div className="w-full">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-full flex items-center">
                        <span className="w-16 text-sm font-medium">Alta</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-red-500 h-full" 
                            style={{ width: `${(priorityStats.alta / tickets.length) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-medium">
                          {priorityStats.alta}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-full flex items-center">
                        <span className="w-16 text-sm font-medium">Média</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-yellow-500 h-full" 
                            style={{ width: `${(priorityStats.media / tickets.length) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-medium">
                          {priorityStats.media}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-full flex items-center">
                        <span className="w-16 text-sm font-medium">Baixa</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500 h-full" 
                            style={{ width: `${(priorityStats.baixa / tickets.length) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-medium">
                          {priorityStats.baixa}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="department" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Departamentos</CardTitle>
              <CardDescription>
                Departamentos com mais tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="flex items-center">
                <BarChart className="h-5 w-5 mr-2 text-blue-500" />
                <div className="w-full">
                  <div className="space-y-2">
                    {departmentStats.map(([dept, count], index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-full flex items-center">
                          <span className="w-24 text-sm font-medium truncate" title={dept}>
                            {dept}
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full" 
                              style={{ width: `${(count / tickets.length) * 100}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-sm font-medium">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Tickets por Mês</CardTitle>
          <CardDescription>
            Número de tickets criados nos últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            <div className="w-full h-[200px] flex items-end justify-between">
              {monthlyStats.map((item, index) => {
                const maxCount = Math.max(...monthlyStats.map(i => i.count));
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                
                return (
                  <div key={index} className="flex flex-col items-center justify-end w-1/6">
                    <div 
                      className="w-12 bg-blue-500 rounded-t-md" 
                      style={{ height: `${height}%` }}
                    />
                    <div className="mt-2 text-xs text-center">{item.month}</div>
                    <div className="text-xs font-medium">{item.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}