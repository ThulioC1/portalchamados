'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Paperclip, Clock, Calendar, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

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
  const [isUploading, setIsUploading] = useState(false);
  const [comment, setComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const ticketId = params?.id as string;

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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      setUserIsAdmin(isAdmin(user.email || ""));
      fetchTicket();
    }
  }, [user, loading, router, ticketId]);

  const updateTicketStatus = async () => {
    if (!ticket || !newStatus || newStatus === ticket.status) return;

    try {
      setIsUpdating(true);
      const ticketRef = doc(db, "tickets", ticketId);
      
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      
      // Adicionar informações de quem fechou o chamado
      if (newStatus === "Fechado" && user) {
        updateData.closedBy = {
          userId: user.uid,
          userName: user.displayName || "Usuário",
          userEmail: user.email,
          closedAt: Timestamp.now(),
        };
      }
      
      await updateDoc(ticketRef, updateData);

      setTicket({ ...ticket, status: newStatus, ...updateData });
      toast.success("Status do ticket atualizado com sucesso!");
      
      // Enviar email de notificação de atualização de status
      try {
        const emailResponse = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "status-update",
            ticketId,
            subject: ticket.subject,
            newStatus,
            userName: ticket.userName || "Usuário",
            userEmail: ticket.userEmail,
          }),
        });
        
        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error("Erro na resposta do servidor de email:", errorData);
          // Mostrar toast de aviso, mas não interromper o fluxo
          toast.warning("O status foi atualizado, mas pode haver problemas com a notificação por email.");
        }
      } catch (emailError) {
        console.error("Erro ao enviar email de atualização:", emailError);
        // Mostrar toast de aviso, mas não interromper o fluxo
        toast.warning("O status foi atualizado, mas pode haver problemas com a notificação por email.");
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do ticket.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const uploadAttachment = async () => {
    if (!file || !ticket || !user) return;

    try {
      setIsUploading(true);

      // Validar tamanho do arquivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. O tamanho máximo permitido é 10MB.');
      }

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não permitido. Use: JPEG, PNG, GIF, PDF, TXT, DOC ou DOCX.');
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ml_default"); // Usando preset padrão para uploads não autenticados
      formData.append("folder", "ticket-attachments"); // Organizar em pasta

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) {
        throw new Error('Configuração do Cloudinary não encontrada.');
      }

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro no upload do Cloudinary:", errorData);
        throw new Error(`Falha no upload: ${errorData.error?.message || 'Erro desconhecido'}`);
      }

      const data = await response.json();
      const attachmentUrl = data.secure_url;
      const attachmentName = file.name;

      // Atualizar o ticket com o novo anexo
      const ticketRef = doc(db, "tickets", ticketId);
      
      // Adicionar comentário sobre o anexo
      const newComment = {
        text: `Anexou o arquivo: ${attachmentName}`,
        userId: user.uid,
        userName: user.displayName || "Usuário",
        createdAt: Timestamp.now(),
        isAttachment: true,
        attachmentUrl,
        attachmentName
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
      
      setFile(null);
      toast.success("Anexo adicionado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao adicionar anexo:", error);
      toast.error(`Erro ao adicionar anexo: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsUploading(false);
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
            {ticket.status === "Fechado" && ticket.closedBy && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                <span>Fechado por: {ticket.closedBy.userName} em {formatDate(ticket.closedBy.closedAt?.toDate())}</span>
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

          {(ticket.status !== "fechado") && (
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
                    {userIsAdmin ? (
                      <>
                        <SelectItem value="Aberto">Aberto</SelectItem>
                        <SelectItem value="Em andamento">Em andamento</SelectItem>
                        <SelectItem value="Fechado">Fechado</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="Fechado">Fechado</SelectItem>
                    )}
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
                        {comment.isAttachment && comment.attachmentUrl && (
                          <div className="mt-2 p-2 bg-gray-100 rounded flex items-center">
                            <a 
                              href={comment.attachmentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:underline"
                            >
                              <Paperclip className="h-4 w-4 mr-2" />
                              {comment.attachmentName || "Anexo"}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhum comentário ainda.</p>
                )}

            {ticket.status !== "fechado" && (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
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
                
                <div className="pt-2 border-t">
                  <h4 className="text-sm font-medium mb-2">Adicionar Anexo</h4>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="attachment"
                      className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      {file ? file.name : "Escolher arquivo"}
                    </label>
                    <Input
                      id="attachment"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {file && (
                      <div className="flex gap-2">
                        <Button
                          onClick={uploadAttachment}
                          disabled={isUploading || !file}
                          size="sm"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            "Enviar"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFile(null)}
                          disabled={isUploading}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}