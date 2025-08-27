"use client";

import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const settingsFormSchema = z.object({
  notificationsEmail: z.boolean().default(true),
  notificationsPush: z.boolean().default(true),
  language: z.string().default("pt-BR"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const [user, loading] = useAuthState(auth);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      notificationsEmail: true,
      notificationsPush: true,
      language: "pt-BR",
      theme: "system",
    },
  });

  const onSubmit = async (data: SettingsFormValues) => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Atualizar configurações no Firestore
      await updateDoc(doc(db, "users", user.uid), {
        settings: data,
        updatedAt: new Date(),
      });

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar logado para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Configurações</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie suas preferências e configurações do sistema.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure como você deseja receber notificações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="notificationsEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Notificações por Email
                        </FormLabel>
                        <FormDescription>
                          Receba atualizações sobre seus chamados por email.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationsPush"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Notificações Push
                        </FormLabel>
                        <FormDescription>
                          Receba notificações no navegador quando houver atualizações.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tema</FormLabel>
                      <div className="flex gap-4">
                        <Label
                          htmlFor="theme-light"
                          className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer ${field.value === "light" ? "border-primary" : "border-muted"}`}
                        >
                          <input
                            type="radio"
                            id="theme-light"
                            value="light"
                            className="sr-only"
                            checked={field.value === "light"}
                            onChange={() => field.onChange("light")}
                          />
                          <div className="mb-2 h-16 w-16 rounded-md bg-[#f8fafc] border" />
                          <span>Claro</span>
                        </Label>
                        <Label
                          htmlFor="theme-dark"
                          className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer ${field.value === "dark" ? "border-primary" : "border-muted"}`}
                        >
                          <input
                            type="radio"
                            id="theme-dark"
                            value="dark"
                            className="sr-only"
                            checked={field.value === "dark"}
                            onChange={() => field.onChange("dark")}
                          />
                          <div className="mb-2 h-16 w-16 rounded-md bg-[#1e293b] border" />
                          <span>Escuro</span>
                        </Label>
                        <Label
                          htmlFor="theme-system"
                          className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer ${field.value === "system" ? "border-primary" : "border-muted"}`}
                        >
                          <input
                            type="radio"
                            id="theme-system"
                            value="system"
                            className="sr-only"
                            checked={field.value === "system"}
                            onChange={() => field.onChange("system")}
                          />
                          <div className="mb-2 h-16 w-16 rounded-md bg-gradient-to-r from-[#f8fafc] to-[#1e293b] border" />
                          <span>Sistema</span>
                        </Label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Idioma</CardTitle>
                <CardDescription>
                  Escolha o idioma do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idioma</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="pt-BR">Português (Brasil)</option>
                          <option value="en-US">English (US)</option>
                          <option value="es">Español</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Configurações
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}