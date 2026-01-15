export type Phase = {
  id: string;
  name: string;
  status: string;
  assigneeId: string;
  kind?: string | null;
  completionComment?: string | null;
  completionArtifactUrl?: string | null;
  deadline?: string | null;
  tasks: Task[];
  allowedActions?: Record<string, { allowed: boolean; reason?: string }>;
};

export type Task = {
  id: string;
  title: string;
  status: string;
  assigneeId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  dependencies?: { type?: string | null; targetId?: string | null }[] | null;
  allowedActions?: Record<string, { allowed: boolean; reason?: string }>;
};

export type IssueDetail = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  projectId?: string | null;
  status: string;
  deadline?: string | null;
  phases: Phase[];
  allowedActions?: Record<string, { allowed: boolean; reason?: string }>;
};

export type ActivityEntry = {
  id: string;
  type: string;
  summary: string;
  actorId?: string | null;
  occurredAt: string;
};

export type CommentEntry = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  readByCount?: number | null;
  unreadByCount?: number | null;
  readByUsers?: { id?: string | null; displayName?: string | null }[] | null;
  unreadByUsers?: { id?: string | null; displayName?: string | null }[] | null;
};

export type CommentThread = {
  comments: CommentEntry[];
  unreadCount: number;
  lastReadAt?: string | null;
  latestCommentAt?: string | null;
  firstUnreadCommentId?: string | null;
};

export type HistoryResponse = {
  activity?: ActivityEntry[];
  audit?: ActivityEntry[];
};

export type UserOption = {
  id: string;
  displayName: string;
};
