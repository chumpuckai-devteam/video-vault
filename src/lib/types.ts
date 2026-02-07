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
};
