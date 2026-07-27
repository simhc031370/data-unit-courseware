"use client";

import type { LessonVideo } from "@/lib/course";
import { youtubeEmbedUrl } from "@/lib/course";

export function VideoEmbed({ video }: { video: LessonVideo }) {
  return (
    <figure className="video-card">
      <div className="video-frame">
        <iframe
          src={youtubeEmbedUrl(video)}
          title={video.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption>
        <strong>{video.title}</strong>
        <p>{video.description}</p>
      </figcaption>
    </figure>
  );
}

export function VideoSection({
  videos,
  heading = "관련 영상",
}: {
  videos: LessonVideo[];
  heading?: string;
}) {
  if (!videos.length) return null;
  return (
    <section className="video-section">
      <h2>{heading}</h2>
      <p className="section-lead">
        영상은 이 페이지에서 바로 재생됩니다. 가능하면 자막을 켜고 시청하세요.
      </p>
      <div className="video-list">
        {videos.map((video) => (
          <VideoEmbed key={`${video.youtubeId}-${video.title}`} video={video} />
        ))}
      </div>
    </section>
  );
}
