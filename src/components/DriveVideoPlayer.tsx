interface DriveVideoPlayerProps {
  fileId: string;
  title?: string;
}

export function DriveVideoPlayer({ fileId, title = 'Vidéo du module' }: DriveVideoPlayerProps) {
  return (
    <div className="w-full rounded-xl overflow-hidden my-6 shadow-sm" style={{ background: '#000' }}>
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          allow="autoplay; fullscreen"
          allowFullScreen
          title={title}
          loading="lazy"
        />
      </div>
    </div>
  );
}
