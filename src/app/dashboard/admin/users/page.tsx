"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Shield, ShieldAlert, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type User = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: Date;
};

export default function AdminUsersPage() {
  const [user, loading] = useAuthState(auth);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user && !loading) {
        try {
          // Verificar primeiro se o email está na lista de administradores
          const adminEmails = ['ti@andrademarinholmf.com.br', 'ti@am-holding.com.br'];
          if (user.email && adminEmails.includes(user.email.toLowerCase())) {
            setIsAdmin(true);
            fetchUsers();
            return;
          }
          
          // Se não estiver na lista, verificar no Firestore
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
          
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            if (userData.isAdmin === true) {
              setIsAdmin(true);
              fetchUsers();
              return;
            }
          }
          
          setIsAdmin(false);
          setIsLoading(false);
        } catch (error) {
          console.error("Erro ao verificar status de administrador:", error);
          setIsLoading(false);
        }
      } else if (!loading) {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, loading]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Adicionar console.log para depuração
      console.log("Buscando usuários...");
      
      // Usar a coleção correta para usuários
      const usersCollection = collection(db, "users");
      console.log("Coleção de usuários:", usersCollection);
      
      const usersSnapshot = await getDocs(usersCollection);
      console.log("Snapshot de usuários:", usersSnapshot.size, "documentos encontrados");
      
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Dados do usuário:", doc.id, data);
        return {
          id: doc.id,
          email: data.email,
          displayName: data.displayName || "Usuário sem nome",
          photoURL: data.photoURL,
          isAdmin: data.isAdmin || false,
          isBlocked: data.isBlocked || false,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });
      console.log("Dados de usuários processados:", usersData.length);
      setUsers(usersData);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, makeAdmin: boolean) => {
    if (userId === user?.uid) {
      toast.error("Você não pode alterar seu próprio status de administrador");
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        isAdmin: makeAdmin,
        updatedAt: new Date(),
      });

      setUsers(users.map(u => {
        if (u.id === userId) {
          return { ...u, isAdmin: makeAdmin };
        }
        return u;
      }));

      toast.success(`Usuário ${makeAdmin ? "promovido a administrador" : "removido de administrador"} com sucesso`);
    } catch (error) {
      console.error("Erro ao atualizar status de administrador:", error);
      toast.error("Erro ao atualizar status de administrador");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleBlockStatus = async (userId: string, block: boolean) => {
    if (userId === user?.uid) {
      toast.error("Você não pode bloquear sua própria conta");
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        isBlocked: block,
        updatedAt: new Date(),
      });

      setUsers(users.map(u => {
        if (u.id === userId) {
          return { ...u, isBlocked: block };
        }
        return u;
      }));

      toast.success(`Usuário ${block ? "bloqueado" : "desbloqueado"} com sucesso`);
    } catch (error) {
      console.error("Erro ao atualizar status de bloqueio:", error);
      toast.error("Erro ao atualizar status de bloqueio");
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === user?.uid) {
      toast.error("Você não pode excluir sua própria conta");
      return;
    }

    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(users.filter(u => u.id !== userId));
      toast.success("Usuário excluído com sucesso");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast.error("Erro ao excluir usuário");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  if (loading || isLoading) {
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

  if (!isAdmin) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página. Esta área é restrita a administradores.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Gerenciamento de Usuários</h3>
            <p className="text-sm text-muted-foreground">
              Gerencie os usuários do sistema, promova a administradores, bloqueie ou exclua contas.
            </p>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            Atualizar Lista
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Avatar>
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{user.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {user.isAdmin && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {user.isBlocked && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <UserX className="h-3 w-3 mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                          {!user.isBlocked && !user.isAdmin && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {user.isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAdminStatus(user.id, false)}
                              disabled={isProcessing || user.id === auth.currentUser?.uid}
                            >
                              <ShieldAlert className="h-4 w-4 mr-1" />
                              Remover Admin
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAdminStatus(user.id, true)}
                              disabled={isProcessing}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Tornar Admin
                            </Button>
                          )}
                          
                          {user.isBlocked ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleBlockStatus(user.id, false)}
                              disabled={isProcessing}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Desbloquear
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleBlockStatus(user.id, true)}
                              disabled={isProcessing || user.id === auth.currentUser?.uid}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Bloquear
                            </Button>
                          )}
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => confirmDelete(user)}
                            disabled={isProcessing || user.id === auth.currentUser?.uid}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir o usuário {selectedUser?.displayName}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedUser && deleteUser(selectedUser.id)}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}