type MapEmbedProps = {
  src: string;
  title?: string;
};

export function MapEmbed({
  src,
  title = "Mapa de ubicación de Zunino Remates",
}: MapEmbedProps) {
  return (
    <div className="map-embed">
      <iframe
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
