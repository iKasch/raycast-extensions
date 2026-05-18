import ytdl from "ytdl-core";

const URL_PATTERN = /https?:\/\/[^\s)>\]]+/g;

function trimUrlCandidate(value: string) {
  return value.trim().replace(/[.,;:!?]+$/, "");
}

function getYouTubeVideoIdFromText(text: string): string | undefined {
  return text
    .split(/\s+/)
    .map(trimUrlCandidate)
    .find((part) => ytdl.validateID(part));
}

export function getYouTubeVideoUrlFromText(text: string | undefined | null): string | undefined {
  if (!text) return undefined;

  const trimmed = trimUrlCandidate(text);

  if (ytdl.validateURL(trimmed)) return trimmed;
  if (ytdl.validateID(trimmed)) return `https://www.youtube.com/watch?v=${trimmed}`;

  const url = (text.match(URL_PATTERN) ?? []).map(trimUrlCandidate).find((candidate) => ytdl.validateURL(candidate));
  if (url) return url;

  const videoId = getYouTubeVideoIdFromText(text);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined;
}

export function removeYouTubeVideoReferenceFromText(text: string): string {
  return text
    .replace(URL_PATTERN, " ")
    .split(/\s+/)
    .map(trimUrlCandidate)
    .filter((part) => part && !ytdl.validateID(part))
    .join(" ")
    .trim();
}
