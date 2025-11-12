"use client";

type Props = {
  title: string;
  description?: string | null;
  url: string;
  sourceName?: string | null;
  category?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | Date | null;
  onLike: () => void;
  onDislike: () => void;
  disabled?: boolean;
};

export function OnboardingCard({
  title,
  description,
  url,
  sourceName,
  category,
  urlToImage,
  publishedAt,
  onLike,
  onDislike,
  disabled,
}: Props) {
  const dateStr = publishedAt ? new Date(publishedAt).toLocaleDateString() : undefined;

  return (
    <div className="max-w-2xl w-full border rounded-xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {urlToImage ? (
        <div className="relative w-full h-56 bg-zinc-100 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlToImage} alt={title} className="w-full h-56 object-cover" />
        </div>
      ) : null}

      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {category ? <span className="uppercase tracking-wide">{category}</span> : null}
          {sourceName ? (
            <>
              <span>•</span>
              <span>{sourceName}</span>
            </>
          ) : null}
          {dateStr ? (
            <>
              <span>•</span>
              <span>{dateStr}</span>
            </>
          ) : null}
        </div>

        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <h2 className="text-lg font-semibold leading-snug hover:underline">{title}</h2>
        </a>

        {description ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{description}</p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            disabled={disabled}
            onClick={onLike}
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 text-sm font-medium"
          >
            Like
          </button>
          <button
            disabled={disabled}
            onClick={onDislike}
            className="inline-flex items-center justify-center rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-4 py-2 text-sm font-medium"
          >
            Dislike
          </button>
        </div>
      </div>
    </div>
  );
}