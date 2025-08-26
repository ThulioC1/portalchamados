import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, subject, html, text } = await request.json();

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: `TicketFlow <${process.env.EMAIL_FROM || 'noreply@ticketflow.com'}>`,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    );
  }
}