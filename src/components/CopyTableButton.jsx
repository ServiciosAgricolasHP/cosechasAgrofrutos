import React, { useState } from 'react';
import { IconButton, Tooltip, useToast, Spinner } from '@chakra-ui/react';
import { CopyIcon } from '@chakra-ui/icons';
import html2canvas from 'html2canvas';

const CopyTableButton = ({ targetRef }) => {
  const [isCopying, setIsCopying] = useState(false);
  const toast = useToast();

  const handleCopy = async () => {
    if (!targetRef.current) {
      toast({
        title: 'Error',
        description: 'No se encontró la tabla para copiar.',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    setIsCopying(true);
    try {
      // Esperar un poco para asegurar que el DOM esté listo
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(targetRef.current, {
        scale: 2, // mayor calidad
        backgroundColor: '#ffffff',
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        toast({
          title: 'Copiado',
          description: 'La tabla ha sido copiada como imagen.',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'No se pudo copiar la imagen.',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Tooltip label="Copiar tabla como imagen">
      <IconButton
        icon={isCopying ? <Spinner size="xs" /> : <CopyIcon />}
        onClick={handleCopy}
        size="sm"
        variant="ghost"
        aria-label="Copiar tabla"
        isDisabled={isCopying}
      />
    </Tooltip>
  );
};

export default CopyTableButton;