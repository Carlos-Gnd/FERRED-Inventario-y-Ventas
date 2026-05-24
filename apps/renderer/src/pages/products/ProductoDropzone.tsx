import { useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';

interface ProductoDropzoneProps {
  imageUrl: string;
  onChange: (imageUrl: string) => void;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DATA_URL_BYTES = 95 * 1024;

export function ProductoDropzone({ imageUrl, onChange }: ProductoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file?: File) {
    setError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError('La imagen debe pesar menos de 2 MB.');
      return;
    }

    try {
      const dataUrl = file.type === 'image/svg+xml'
        ? await readFileAsDataUrl(file)
        : await resizeImage(file);

      if (dataUrl.length > MAX_DATA_URL_BYTES) {
        setError('La imagen sigue siendo muy pesada. Usa una imagen mas pequena.');
        return;
      }

      onChange(dataUrl);
    } catch {
      setError('No se pudo leer la imagen.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <section style={{
      display: 'grid',
      gridTemplateColumns: imageUrl ? '118px 1fr' : '1fr',
      gap: '12px',
      alignItems: 'stretch',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '14px',
    }}>
      {imageUrl && (
        <div style={{
          width: '118px',
          aspectRatio: '1',
          borderRadius: '7px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          <img
            src={imageUrl}
            alt="Imagen del producto"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Imagen del producto
          </p>
          {imageUrl && (
            <Button variant="danger" size="sm" onClick={() => onChange('')}>
              Eliminar imagen
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFile(event.dataTransfer.files[0]);
          }}
          style={{
            minHeight: imageUrl ? '72px' : '112px',
            borderRadius: '7px',
            border: `1px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            background: dragging ? 'var(--accent-glow)' : 'var(--bg-surface)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '14px',
            textAlign: 'center',
            transition: 'all 0.18s ease',
          }}
        >
          <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Arrastra una imagen aqui
          </span>
          <span style={{ display: 'block', marginTop: '4px', fontSize: '12px' }}>
            o haz clic para seleccionar JPG, PNG, WebP o SVG
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(event) => handleFile(event.target.files?.[0])}
          style={{ display: 'none' }}
        />

        {error && <span style={{ fontSize: '11px', color: 'var(--danger)' }}>{error}</span>}
      </div>
    </section>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function resizeImage(file: File) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxSide = 640;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/webp', 0.72);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
