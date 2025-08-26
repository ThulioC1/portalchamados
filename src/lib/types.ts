export type Ticket = {
  id: string;
  ticketNumber: number; // Número sequencial do chamado
  subject: string;
  department: 'Engenharia' | 'Comercial' | 'RH' | 'Atendimento' | 'Suprimentos' | 'Financeiro' | 'TI' | 'Contabilidade';
  description: string;
  priority: 'Baixa' | 'Média' | 'Alta';
  status: 'open' | 'closed';
  createdAt: Date;
  deadline?: Date; // O prazo pode não existir
  userId: string;
  userName: string;
  userEmail: string; // Email do usuário para notificações
  attachmentUrl?: string;
  attachmentName?: string;
};