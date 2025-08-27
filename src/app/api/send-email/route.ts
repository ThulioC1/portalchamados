import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import renderTicketNotificationEmail from '@/emails/ticket-notification';
import renderStatusUpdateEmail from '@/emails/status-update';

// Inicializar Resend com a API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Log para debug da API key
console.log('[EMAIL CONFIG] API Key configurada:', process.env.RESEND_API_KEY ? 'Sim (valor presente)' : 'Não (valor ausente)');
console.log('[EMAIL CONFIG] EMAIL_FROM:', process.env.EMAIL_FROM);

// Função para registrar logs de email para depuração
const logEmailAttempt = (type: string, data: any, error?: any) => {
  console.log(`[EMAIL LOG] Tentativa de envio - Tipo: ${type}`);
  console.log(`[EMAIL LOG] Dados:`, JSON.stringify(data));
  if (error) {
    console.error(`[EMAIL LOG] Erro:`, error);
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, subject, department, userName, userEmail } = body;
    
    // Log inicial da requisição
    logEmailAttempt('request', { type, subject, userEmail });
    
    // Verificar se a API key está configurada
    if (!process.env.RESEND_API_KEY) {
      const error = 'API key do Resend não configurada';
      logEmailAttempt('config_error', { error });
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }
    
    // Verificar se é um email direto ou um template
    if (body.to && body.subject && (body.html || body.text)) {
      // Email direto
      try {
        const emailData = {
          from: `TicketFlow <${process.env.EMAIL_FROM || 'noreply@ticketflow.com'}>`,
          to: body.to,
          subject: body.subject,
          html: body.html || undefined,
          text: body.text || undefined,
        };
        
        logEmailAttempt('direct_email', emailData);
        const data = await resend.emails.send(emailData);
        logEmailAttempt('direct_email_success', data);
        return NextResponse.json(data);
      } catch (emailError: any) {
        logEmailAttempt('direct_email_error', body, emailError);
        return NextResponse.json(
          { error: `Erro ao enviar email direto: ${emailError.message || 'Erro desconhecido'}` },
          { status: 500 }
        );
      }
    }
    
    // Verificar se temos os campos necessários para processar um template
    if (!type || !subject || !userEmail) {
      const error = 'Campos obrigatórios ausentes';
      logEmailAttempt('validation_error', { type, subject, userEmail, error });
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }
    
    // Processar diferentes tipos de templates
    let html;
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/dashboard';
    
    if (type === 'new-ticket') {
      // Template para novo ticket
      const templateData = {
        ticketId: body.ticketId || 'N/A',
        subject,
        department: department || 'N/A',
        priority: body.priority || 'Normal',
        userName: userName || 'Usuário',
        description: body.description || 'Sem descrição',
        dashboardUrl
      };
      
      logEmailAttempt('new_ticket_template', templateData);
      html = renderTicketNotificationEmail(templateData);
    } else if (type === 'status-update') {
      // Template para atualização de status
      const templateData = {
        ticketId: body.ticketId || 'N/A',
        subject,
        newStatus: body.newStatus || 'Atualizado',
        userName: userName || 'Usuário',
        dashboardUrl
      };
      
      logEmailAttempt('status_update_template', templateData);
      html = renderStatusUpdateEmail(templateData);
    } else {
      const error = 'Tipo de email não suportado';
      logEmailAttempt('unsupported_type', { type, error });
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }
    
    // Enviar o email com o template processado
    try {
      const emailData = {
        from: `TicketFlow <${process.env.EMAIL_FROM || 'noreply@ticketflow.com'}>`,
        to: userEmail,
        subject,
        html,
      };
      
      logEmailAttempt('template_email', emailData);
      const data = await resend.emails.send(emailData);
      logEmailAttempt('template_email_success', data);
      return NextResponse.json(data);
    } catch (emailError: any) {
      logEmailAttempt('template_email_error', { type, userEmail }, emailError);
      return NextResponse.json(
        { error: `Erro ao enviar email com template: ${emailError.message || 'Erro desconhecido'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro ao processar requisição de email:', error);
    return NextResponse.json(
      { error: `Erro ao processar requisição de email: ${error.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}