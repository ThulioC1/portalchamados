'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, runTransaction, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  subject: z.string().min(5, {
    message: "O assunto deve ter pelo menos 5 caracteres.",
  }),
  department: z.string({
    required_error: "Por favor selecione um departamento.",
  }),
  description: z.string().min(10, {
    message: "A descrição deve ter pelo menos 10 caracteres.",
  }),
  priority: z.string({
    required_error: "Por favor selecione uma prioridade.",
  }),
});

export default function NewTicketPage() {
  const [user, loading] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      description: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error("Você precisa estar logado para criar um chamado.");
      return;
    }

    try {
      setIsSubmitting(true);

      let attachmentUrl = "";
      let attachmentName = "";

      // Se houver um arquivo, fazer upload para o Cloudinary
      if (file) {
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

        const uploadToCloudinary = async (retries = 2) => {
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "dygr2yg24"); // Usando preset padrão
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
              
              // Tratar erros específicos
              if (response.status === 400) {
                if (errorData.error?.message?.includes('Upload preset')) {
                  throw new Error('Configuração de upload inválida. Contate o administrador.');
                } else if (errorData.error?.message?.includes('Invalid image file')) {
                  throw new Error('Arquivo de imagem inválido ou corrompido.');
                } else {
                  throw new Error(`Erro de validação: ${errorData.error?.message || 'Dados inválidos'}`);
                }
              } else if (response.status === 401) {
                throw new Error('Credenciais do Cloudinary inválidas. Contate o administrador.');
              } else if (response.status >= 500) {
                throw new Error('Erro interno do servidor de upload. Tente novamente.');
              } else {
                throw new Error(`Falha no upload: ${errorData.error?.message || 'Erro desconhecido'}`);
              }
            }

            const data = await response.json();
            return {
              url: data.secure_url,
              name: file.name
            };
          } catch (error: any) {
            console.error(`Tentativa de upload falhou:`, error);
            
            // Retry para erros de rede ou servidor
            if (retries > 0 && (error.message?.includes('fetch') || error.message?.includes('servidor'))) {
              console.log(`Tentando upload novamente... (${retries} tentativas restantes)`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
              return uploadToCloudinary(retries - 1);
            }
            
            throw error;
          }
        };

        const uploadResult = await uploadToCloudinary();
        attachmentUrl = uploadResult.url;
        attachmentName = uploadResult.name;
      }

      // Criar o ticket no Firestore com numeração sequencial e retry logic
      const createTicket = async (retries = 3) => {
        try {
          // Usar transação para garantir numeração sequencial única
          await runTransaction(db, async (transaction) => {
            // Buscar o último número de ticket
            const ticketsRef = collection(db, "tickets");
            const lastTicketQuery = query(
              ticketsRef,
              orderBy("ticketNumber", "desc"),
              limit(1)
            );
            
            const lastTicketSnapshot = await getDocs(lastTicketQuery);
            let nextTicketNumber = 1; // Começar do 1 se não houver tickets
            
            if (!lastTicketSnapshot.empty) {
              const lastTicket = lastTicketSnapshot.docs[0].data();
              nextTicketNumber = (lastTicket.ticketNumber || 0) + 1;
            }
            
            // Criar o novo ticket com número sequencial
            const newTicketRef = doc(collection(db, "tickets"));
            transaction.set(newTicketRef, {
              ticketNumber: nextTicketNumber,
              subject: values.subject,
              department: values.department,
              description: values.description,
              priority: values.priority,
              status: "open",
              createdAt: serverTimestamp(),
              userId: user.uid,
              userName: user.displayName || "Usuário",
              userEmail: user.email,
              attachmentUrl,
              attachmentName,
            });
          });
        } catch (error: any) {
          console.error("Erro ao criar ticket:", error);
          
          // Se for erro de rede ou bloqueio, tentar novamente
          if (retries > 0 && (error.code === 'unavailable' || error.message?.includes('ERR_BLOCKED_BY_CLIENT'))) {
            console.log(`Tentando novamente... (${retries} tentativas restantes)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
            return createTicket(retries - 1);
          }
          
          // Se esgotaram as tentativas ou é outro tipo de erro
          if (error.code === 'permission-denied') {
            throw new Error('Você não tem permissão para criar chamados. Verifique suas credenciais.');
          } else if (error.code === 'unavailable') {
            throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns minutos.');
          } else {
            throw new Error(`Erro ao criar chamado: ${error.message || 'Erro desconhecido'}`);
          }
        }
      };
      
      await createTicket();

      // Enviar email de notificação (opcional)
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "new-ticket",
            subject: values.subject,
            department: values.department,
            userName: user.displayName || "Usuário",
            userEmail: user.email,
          }),
        });
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
        // Não interrompe o fluxo se o email falhar
      }

      toast.success("Chamado criado com sucesso!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Erro ao criar chamado:", error);
      toast.error("Erro ao criar chamado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Chamado</h1>
        <p className="text-muted-foreground">
          Preencha o formulário abaixo para criar um novo chamado.
        </p>
      </div>

      <div className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o assunto do chamado" {...field} />
                  </FormControl>
                  <FormDescription>
                    Um título breve que descreva o problema.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Engenharia">Engenharia</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                      <SelectItem value="RH">RH</SelectItem>
                      <SelectItem value="Atendimento">Atendimento</SelectItem>
                      <SelectItem value="Suprimentos">Suprimentos</SelectItem>
                      <SelectItem value="Financeiro">Financeiro</SelectItem>
                      <SelectItem value="TI">TI</SelectItem>
                      <SelectItem value="Contabilidade">Contabilidade</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhadamente o problema ou solicitação"
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel htmlFor="attachment">Anexo (opcional)</FormLabel>
              <div className="mt-1 flex items-center gap-4">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Tamanho máximo: 5MB. Formatos aceitos: PDF, DOC, DOCX, JPG, PNG.
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Criar Chamado"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}