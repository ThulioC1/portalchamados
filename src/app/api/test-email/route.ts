import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET() {
  try {
    // Log para debug da API key
    console.log('[TEST EMAIL] API Key configurada:', process.env.RESEND_API_KEY ? 'Sim (valor presente)' : 'Não (valor ausente)');
    console.log('[TEST EMAIL] EMAIL_FROM:', process.env.EMAIL_FROM);
    console.log('[TEST EMAIL] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    
    // Inicializar Resend com a API key
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Enviar email de teste
    const data = await resend.emails.send({
      from: `TicketFlow <${process.env.EMAIL_FROM || 'noreply@ticketflow.com'}>`,
      to: 'test@example.com', // Substitua por um email válido para teste
      subject: 'Teste de Email do TicketFlow',
      html: '<h1>Teste de Email</h1><p>Este é um email de teste do sistema TicketFlow.</p>',
    });
    
    console.log('[TEST EMAIL] Resposta:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Email de teste enviado com sucesso',
      data
    });
  } catch (error) {
    console.error('[TEST EMAIL] Erro:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.details || 'Sem detalhes adicionais'
      },
      { status: 500 }
    );
  }
}