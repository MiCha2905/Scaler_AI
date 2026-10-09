import {
  MeetingListItem,
  MeetingDetail,
  MeetingListPagination,
  TranscriptSegment,
  Summary,
  ActionItem,
  Participant,
  Tag,
  Comment,
  GlobalSearchResult,
  ChatAnswer,
} from "@/types/api";

function getApiBase(): string {
  let base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!base) {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      base = "https://scaler-ai-backend-q590.onrender.com/api";
    } else {
      base = "http://127.0.0.1:8000/api";
    }
  }
  base = base.replace(/\/+$/, "");
  if (!base.endsWith("/api") && !base.includes("/api")) {
    base = `${base}/api`;
  }
  return base;
}

const API_BASE = getApiBase();

export class ApiError extends Error {
  code: string;
  details: any[];
  status: number;

  constructor(status: number, message: string, code: string = "api_error", details: any[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return null as unknown as T;
  }

  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    if (!res.ok) {
      throw new ApiError(res.status, `Request failed with status ${res.status}`);
    }
    return null as unknown as T;
  }

  if (!res.ok) {
    const errorInfo = data?.error || {};
    throw new ApiError(
      res.status,
      errorInfo.message || data?.message || "An unexpected error occurred",
      errorInfo.code || "unknown_error",
      errorInfo.details || []
    );
  }

  return data as T;
}

export const api = {
  // Meetings
  async getMeetings(params: {
    q?: string;
    participant_id?: number;
    tag?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
    page?: number;
    page_size?: number;
  }): Promise<MeetingListPagination> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.participant_id) query.set("participant_id", String(params.participant_id));
    if (params.tag) query.set("tag", params.tag);
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.sort) query.set("sort", params.sort);
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));

    return request<MeetingListPagination>(`/meetings?${query.toString()}`);
  },

  async getMeeting(id: number): Promise<MeetingDetail> {
    return request<MeetingDetail>(`/meetings/${id}`);
  },

  async createMeeting(data: {
    title: string;
    date?: string;
    participants?: (number | { name: string; email?: string })[];
    transcript_text?: string;
    tag_ids?: number[];
  }): Promise<MeetingDetail> {
    return request<MeetingDetail>("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async uploadMeeting(formData: FormData): Promise<MeetingDetail> {
    return request<MeetingDetail>("/meetings/upload", {
      method: "POST",
      body: formData,
    });
  },

  async updateMeeting(
    id: number,
    data: {
      title?: string;
      date?: string;
      participants?: (number | { name: string; email?: string })[];
      tag_ids?: number[];
    }
  ): Promise<MeetingDetail> {
    return request<MeetingDetail>(`/meetings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteMeeting(id: number): Promise<void> {
    return request<void>(`/meetings/${id}`, {
      method: "DELETE",
    });
  },

  async getTranscript(meetingId: number): Promise<TranscriptSegment[]> {
    return request<TranscriptSegment[]>(`/meetings/${meetingId}/transcript`);
  },

  async regenerateSummary(meetingId: number): Promise<Summary> {
    return request<Summary>(`/meetings/${meetingId}/summary/regenerate`, {
      method: "POST",
    });
  },

  async generateAudio(meetingId: number): Promise<MeetingDetail> {
    return request<MeetingDetail>(`/meetings/${meetingId}/generate-audio`, {
      method: "POST",
    });
  },

  // Action Items
  async createActionItem(
    meetingId: number,
    data: { text: string; assignee_id?: number | null; due_date?: string | null }
  ): Promise<ActionItem> {
    return request<ActionItem>(`/meetings/${meetingId}/action-items`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateActionItem(
    id: number,
    data: { text?: string; assignee_id?: number | null; due_date?: string | null; is_completed?: boolean }
  ): Promise<ActionItem> {
    return request<ActionItem>(`/action-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteActionItem(id: number): Promise<void> {
    return request<void>(`/action-items/${id}`, {
      method: "DELETE",
    });
  },

  // Participants & Tags
  async getParticipants(): Promise<Participant[]> {
    return request<Participant[]>("/participants");
  },

  async getTags(): Promise<Tag[]> {
    return request<Tag[]>("/tags");
  },

  async createTag(name: string): Promise<Tag> {
    return request<Tag>("/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async setMeetingTags(meetingId: number, tagIds: number[]): Promise<MeetingDetail> {
    return request<MeetingDetail>(`/meetings/${meetingId}/tags`, {
      method: "PUT",
      body: JSON.stringify(tagIds),
    });
  },

  // Bonus: Search, Comments, Export, Chat
  async globalSearch(q: string, type?: string): Promise<GlobalSearchResult> {
    const query = new URLSearchParams({ q });
    if (type) query.set("type", type);
    return request<GlobalSearchResult>(`/search?${query.toString()}`);
  },

  async getComments(meetingId: number): Promise<Comment[]> {
    return request<Comment[]>(`/meetings/${meetingId}/comments`);
  },

  async addComment(meetingId: number, data: { segment_id: number; body: string; kind?: string }): Promise<Comment> {
    return request<Comment>(`/meetings/${meetingId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteComment(id: number): Promise<void> {
    return request<void>(`/comments/${id}`, {
      method: "DELETE",
    });
  },

  async chatWithMeeting(meetingId: number, question: string): Promise<ChatAnswer> {
    return request<ChatAnswer>(`/meetings/${meetingId}/chat`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },

  getExportUrl(meetingId: number, format: "md" | "txt" = "md"): string {
    return `${API_BASE}/meetings/${meetingId}/export?format=${format}`;
  },

  async checkHealth(): Promise<{ status: string; database: string }> {
    return request<{ status: string; database: string }>("/health");
  },
};
