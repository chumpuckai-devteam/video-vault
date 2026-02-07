export type VideoRecord = {
  id: string;
  title: string | null;
  drive_file_id: string;
  drive_url: string;
  created_at: string;
};

export type TokenRecord = {
  token: string;
  video_id: string;
  session_id: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  max_sessions: number;
  session_count: number;
};

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
};

export type DriveBrowseResponse = {
  folderId: string;
  folders: DriveFile[];
  videos: DriveFile[];
  error?: string;
};
