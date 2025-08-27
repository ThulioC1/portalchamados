"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const profileFormSchema = z.object({
  displayName: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Email inválido.",
  }),
  photoURL: z.string().url({
    message: "URL inválida.",
  }).optional().or(z.literal(""))
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, {
    message: "Senha atual deve ter pelo menos 6 caracteres.",
  }),
  newPassword: z.string().min(6, {
    message: "Nova senha deve ter pelo menos 6 caracteres.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Confirmação de senha deve ter pelo menos 6 caracteres.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function ProfilePage() {
  const [user, loading] = useAuthState(auth);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [userDataLoading, setUserDataLoading] = useState(true);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      photoURL: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (user && !loading) {
      // Preencher o formulário com os dados do usuário atual
      profileForm.setValue("displayName", user.displayName || "");
      profileForm.setValue("email", user.email || "");
      profileForm.setValue("photoURL", user.photoURL || "");

      // Buscar dados adicionais do usuário do Firestore
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
          setUserDataLoading(false);
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          setUserDataLoading(false);
        }
      };

      fetchUserData();
    }
  }, [user, loading, profileForm]);

  const onSubmitProfile = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      // Atualizar o perfil do usuário
      await updateProfile(user, {
        displayName: data.displayName,
        photoURL: data.photoURL || null,
      });

      // Atualizar o email se foi alterado
      if (data.email !== user.email) {
        await updateEmail(user, data.email);
      }

      // Atualizar dados no Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL || null,
        updatedAt: new Date(),
      });

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      if (error.code === "auth/requires-recent-login") {
        toast.error("Por favor, faça login novamente para atualizar seu email.");
      } else {
        toast.error(`Erro ao atualizar perfil: ${error.message}`);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormValues) => {
    if (!user || !user.email) return;

    setIsChangingPassword(true);
    try {
      // Reautenticar o usuário
      const credential = EmailAuthProvider.credential(
        user.email,
        data.currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Atualizar a senha
      await updatePassword(user, data.newPassword);

      toast.success("Senha atualizada com sucesso!");
      passwordForm.reset();
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error);
      if (error.code === "auth/wrong-password") {
        toast.error("Senha atual incorreta.");
      } else {
        toast.error(`Erro ao atualizar senha: ${error.message}`);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading || userDataLoading) {
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
          <h3 className="text-lg font-medium">Perfil</h3>
          <p className="text-sm text-muted-foreground">
            Atualize suas informações de perfil.
          </p>
        </div>

        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-8">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <FormField
                  control={profileForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seu.email@exemplo.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Alterar seu email pode exigir que você faça login novamente.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Foto</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com/sua-foto.jpg" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL da imagem para seu avatar (opcional).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" onClick={() => profileForm.reset()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>

        <div className="mt-6">
          <h3 className="text-lg font-medium">Segurança</h3>
          <p className="text-sm text-muted-foreground">
            Atualize sua senha.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Senha</p>
                <p className="text-sm text-muted-foreground">
                  Altere sua senha para manter sua conta segura.
                </p>
              </div>
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Alterar Senha</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Alterar Senha</DialogTitle>
                    <DialogDescription>
                      Preencha os campos abaixo para alterar sua senha.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha Atual</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nova Senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Nova Senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsPasswordDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isChangingPassword}>
                          {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Salvar
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}