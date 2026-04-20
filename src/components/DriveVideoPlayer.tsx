interface DriveVideoPlayerProps {
  fileId: string;
  title?: string;
}

export function DriveVideoPlayer({ fileId, title = 'Vidéo du module' }: DriveVideoPlayerProps) {
  return (
    <div className="my-6 w-full overflow-hidden rounded-xl border border-gray-200 bg-black shadow-sm">
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay"
          allowFullScreen
          title={title}
          loading="lazy"
        />
      </div>
    </div>
  );
}
