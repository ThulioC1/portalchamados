import * as React from 'react';

interface TicketNotificationProps {
  ticketId: string;
  subject: string;
  department: string;
  priority: string;
  userName: string;
  description: string;
  dashboardUrl: string;
}

export const TicketNotificationEmail: React.FC<TicketNotificationProps> = ({
  ticketId,
  subject,
  department,
  priority,
  userName,
  description,
  dashboardUrl,
}) => {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f9f9f9',
      borderRadius: '5px',
    }}>
      <div style={{
        backgroundColor: '#0070f3',
        color: 'white',
        padding: '15px',
        borderRadius: '5px 5px 0 0',
        textAlign: 'center',
      }}>
        <h1 style={{ margin: '0', fontSize: '24px' }}>Novo Ticket Criado</h1>
      </div>
      
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '0 0 5px 5px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
      }}>
        <p style={{ fontSize: '16px', color: '#333' }}>
          Um novo ticket foi criado no sistema TicketFlow.
        </p>
        
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
        }}>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>ID do Ticket:</strong> {ticketId}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Assunto:</strong> {subject}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Departamento:</strong> {department}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Prioridade:</strong> {priority}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Solicitante:</strong> {userName}
          </p>
          <p style={{ margin: '10px 0 5px', fontSize: '14px' }}>
            <strong>Descrição:</strong>
          </p>
          <p style={{
            margin: '5px 0',
            fontSize: '14px',
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '3px',
            border: '1px solid #ddd',
          }}>
            {description}
          </p>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <a
            href={dashboardUrl}
            style={{
              backgroundColor: '#0070f3',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            Ver Ticket no Dashboard
          </a>
        </div>
        
        <p style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '30px',
          textAlign: 'center',
          borderTop: '1px solid #eee',
          paddingTop: '15px',
        }}>
          Esta é uma mensagem automática do sistema TicketFlow. Por favor, não responda a este email.
        </p>
      </div>
    </div>
  );
};

export default function renderTicketNotificationEmail(props: TicketNotificationProps) {
  return (
    <TicketNotificationEmail {...props} />
  );
}