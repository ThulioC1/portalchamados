import { useState } from 'react';

type UploadState = {
  isUploading: boolean;
  progress: number;
  error: string | null;
  url: string | null;
  filename: string | null;
};

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    url: null,
    filename: null,
  });

  const uploadFile = async (file: File) => {
    if (!file) return;

    setState({
      isUploading: true,
      progress: 0,
      error: null,
      url: null,
      filename: null,
    });

    try {
      // Criar um FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ticketflow');

      // Iniciar o upload para o Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao fazer upload do arquivo');
      }

      const data = await response.json();

      setState({
        isUploading: false,
        progress: 100,
        error: null,
        url: data.secure_url,
        filename: file.name,
      });

      return {
        url: data.secure_url,
        filename: file.name,
      };
    } catch (error) {
      console.error('Erro no upload:', error);
      setState({
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido no upload',
        url: null,
        filename: null,
      });
      return null;
    }
  };

  const reset = () => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      url: null,
      filename: null,
    });
  };

  return {
    ...state,
    uploadFile,
    reset,
  };
}