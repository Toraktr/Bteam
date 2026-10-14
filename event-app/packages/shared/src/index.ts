/** 主催者 / 参加者 共有型定義 */

export type RsvpStatus = "attend" | "decline" | "maybe";

export const RSVP_STATUSES: RsvpStatus[] = ["attend", "decline", "maybe"];

export const RSVP_LABEL: Record<RsvpStatus, string> = {
  attend: "参加",
  decline: "不参加",
  maybe: "未定",
};

export interface EventItem {
  id: string;
  /** 要件1: タイトル */
  title: string;
  /** 要件1: 開催日時 (ISO 8601) */
  datetime: string;
  /** 要件1,3: 定員 (あとから増やせる) */
  capacity: number;
  /** 要件2: 締め切り (イベントごとに主催者が自由に決める, ISO 8601) */
  deadline: string;
  createdAt: string;
}

export interface Rsvp {
  /** 要件4: 名前だけ (登録・メール不要) */
  name: string;
  /** 要件5: 参加 / 不参加 / 未定 */
  status: RsvpStatus;
  updatedAt: string;
}

export interface EventDetail extends EventItem {
  rsvps: Rsvp[];
  counts: Record<RsvpStatus, number>;
  attendCount: number;
  remaining: number;
  isClosed: boolean;
}

export interface CreateEventInput {
  title: string;
  datetime: string;
  capacity: number;
  deadline: string;
}

export interface UpdateEventInput {
  title?: string;
  datetime?: string;
  capacity?: number;
  deadline?: string;
}

export interface UpsertRsvpInput {
  name: string;
  status: RsvpStatus;
}
