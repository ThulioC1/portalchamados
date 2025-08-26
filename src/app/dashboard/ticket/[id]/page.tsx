'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2, Paperclip, Clock, Calendar } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Ticket } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { isAdmin } from "@/lib/auth-utils";

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [comment, setComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  const ticketId = params?.id as string;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      setUserIsAdmin(isAdmin(user.email || ""));
      fetchTicket();
    }
  }, [user, loading]);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      const ticketRef = doc(db, "tickets", ticketId);
      const ticketSnap = await getDoc(ticketRef);

      if (ticketSnap.exists()) {
        const ticketData = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
        
        // Verificar se o usuário tem permissão para ver este ticket
        if (user && (isAdmin(user.email || "") || ticketData.userId === user.uid)) {
          setTicket(ticketData);
          setNewStatus(ticketData.status);
        } else {
          toast.error("Você não tem permissão para visualizar este ticket.");
          router.push("/dashboard");
        }
      } else {
        toast.error("Ticket não encontrado.");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Erro ao buscar ticket:", error);
      toast.error("Erro ao carregar o ticket. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicketStatus = async () => {
    if (!ticket || !newStatus || newStatus === ticket.status) return;

    try {
      setIsUpdating(true);
      const ticketRef = doc(db, "tickets", ticketId);
      
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      setTicket({ ...ticket, status: newStatus });
      toast.success("Status do ticket atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do ticket.");
    } finally {
      setIsUpdating(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim() || !ticket || !user) return;

    try {
      setIsUpdating(true);
      const ticketRef = doc(db, "tickets", ticketId);
      
      const newComment = {
        text: comment,
        userId: user.uid,
        userName: user.displayName || "Usuário",
        createdAt: Timestamp.now(),
      };

      const comments = ticket.comments || [];
      
      await updateDoc(ticketRef, {
        comments: [...comments, newComment],
        updatedAt: Timestamp.now(),
      });

      setTicket({
        ...ticket,
        comments: [...comments, newComment],
      });
      
      setComment("");
      toast.success("Comentário adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast.error("Erro ao adicionar comentário.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <p>Ticket não encontrado.</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "alta":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "média":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "baixa":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "aberto":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "em andamento":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "fechado":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Voltar para Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Ticket #{ticket.ticketNumber || 'N/A'} - {ticket.subject}</CardTitle>
              <CardDescription>Departamento: {ticket.department}</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Badge className={getPriorityColor(ticket.priority)}>
                Prioridade: {ticket.priority}
              </Badge>
              <Badge className={getStatusColor(ticket.status)}>
                Status: {ticket.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Descrição</h3>
            <p className="mt-2 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {ticket.attachmentUrl && (
            <div>
              <h3 className="text-lg font-medium">Anexo</h3>
              <div className="mt-2">
                <a 
                  href={ticket.attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:underline"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {ticket.attachmentName || "Anexo"}
                </a>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-4 sm:space-y-0">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span>Criado em: {formatDate(ticket.createdAt?.toDate())}</span>
            </div>
            {ticket.deadline && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span>Prazo: {formatDate(ticket.deadline.toDate())}</span>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium">Solicitante</h3>
            <div className="mt-2 flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback>{ticket.userName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{ticket.userName}</p>
                <p className="text-sm text-gray-500">{ticket.userEmail}</p>
              </div>
            </div>
          </div>

          {(userIsAdmin || ticket.status !== "fechado") && (
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-2">Atualizar Status</h3>
              <div className="flex space-x-2">
                <Select
                  value={newStatus}
                  onValueChange={setNewStatus}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aberto">Aberto</SelectItem>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={updateTicketStatus} 
                  disabled={isUpdating || newStatus === ticket.status}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    "Atualizar Status"
                  )}
                </Button>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          <div>
            <h3 className="text-lg font-medium mb-4">Comentários</h3>
            
            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="space-y-4">
                {ticket.comments.map((comment, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback>{comment.userName?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{comment.userName}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {formatDate(comment.createdAt?.toDate())}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{comment.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum comentário ainda.</p>
            )}

            {ticket.status !== "fechado" && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Adicione um comentário..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isUpdating}
                  className="min-h-[100px]"
                />
                <Button 
                  onClick={addComment} 
                  disabled={isUpdating || !comment.trim()}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Adicionar Comentário"
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}