export interface Participant {
  id: number;
  name: string;
  email?: string | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface TranscriptSegment {
  id: number;
  meeting_id: number;
  speaker_id?: number | null;
  speaker_label: string;
  start_sec: number;
  end_sec: number;
  text: string;
  position: number;
  speaker?: Participant | null;
}

export interface Chapter {
  id: number;
  meeting_id: number;
  title: string;
  description?: string | null;
  start_sec: number;
  position: number;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  assignee_id?: number | null;
  text: string;
  due_date?: string | null;
  is_completed: boolean;
  created_at: string;
  assignee?: Participant | null;
}

export interface Summary {
  id: number;
  meeting_id: number;
  overview?: string | null;
  keywords: string[];
  generated_at: string;
  chapters: Chapter[];
}

export interface MeetingListItem {
  id: number;
  title: string;
  date: string;
  duration_sec: number;
  source: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  tags: Tag[];
  action_items_count: number;
  has_transcript: boolean;
}

export interface MeetingDetail {
  id: number;
  title: string;
  date: string;
  duration_sec: number;
  audio_url?: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  tags: Tag[];
  summary?: Summary | null;
  chapters: Chapter[];
  action_items: ActionItem[];
}

export interface MeetingListPagination {
  items: MeetingListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface Comment {
  id: number;
  meeting_id: number;
  segment_id: number;
  body: string;
  kind: "comment" | "highlight" | "soundbite";
  created_at: string;
}

export interface GlobalSearchResult {
  query: string;
  total: number;
  results: {
    meeting_id: number;
    meeting_title: string;
    match_type: "title" | "transcript" | "summary" | "action_item";
    snippet: string;
    timestamp_sec?: number | null;
    created_at: string;
  }[];
}

export interface ChatAnswer {
  question: string;
  answer: string;
  relevant_segments: number[];
}
