export function extractDriveFileId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const patterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/uc\?export=download&id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/drive\/u\/\d+\/files\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  const idLike = trimmed.match(/([a-zA-Z0-9_-]{20,})/);
  return idLike?.[1] ?? null;
}

export function buildDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
