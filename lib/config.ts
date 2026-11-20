export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Sur téléphone, l'espace membres n'est accessible que depuis l'app installée. */
export const EXIGER_INSTALLATION = process.env.NEXT_PUBLIC_EXIGER_INSTALLATION !== "false";

export const YOUTUBE_CHANNEL_ID = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? "";
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "";

/** Playlist « toutes les vidéos » d'une chaîne : UCxxxx -> UUxxxx */
export function youtubeUploadsEmbed(channelId: string): string | null {
  if (!channelId.startsWith("UC")) return null;
  return `https://www.youtube-nocookie.com/embed/videoseries?list=UU${channelId.slice(2)}`;
}
