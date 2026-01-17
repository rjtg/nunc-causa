"use client";

import { useCallback } from "react";
import type { RefObject } from "react";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";
import type { CommentEntry, CommentThread } from "../types";
import { formatTimestamp } from "../detail-utils";

type IssueCommentsProps = {
  comments: CommentEntry[];
  commentThread: CommentThread;
  openReceiptId: string | null;
  onToggleReceipt: (commentId: string) => void;
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  commentError: string | null;
  showJumpToLatest: boolean;
  onJumpToLatest: () => void;
  onJumpToUnread: () => void;
  commentsEndRef: RefObject<HTMLDivElement>;
};

export function IssueComments({
  comments,
  commentThread,
  openReceiptId,
  onToggleReceipt,
  commentBody,
  onCommentBodyChange,
  onSubmit,
  commentError,
  showJumpToLatest,
  onJumpToLatest,
  onJumpToUnread,
  commentsEndRef,
}: IssueCommentsProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onCommentBodyChange(event.target.value);
      event.currentTarget.style.height = "auto";
      event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
    },
    [onCommentBodyChange],
  );

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
      <div className="space-y-3 pb-32">
        {comments.length === 0 && (
          <p className="text-sm text-slate-500">No comments yet.</p>
        )}
        {comments.map((comment) => {
          const readByCount = comment.readByCount ?? 0;
          const unreadByCount = comment.unreadByCount ?? 0;
          const totalTargets = readByCount + unreadByCount;
          const allRead = totalTargets > 0 && unreadByCount === 0;
          const someRead = readByCount > 0 && !allRead;
          return (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className="rounded-xl border border-slate-100 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{comment.authorId}</span>
                <span className="flex items-center gap-2">
                  {totalTargets > 0 && (
                    <Tooltip
                      content={`${readByCount} read · ${unreadByCount} unread`}
                    >
                      <button
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          allRead
                            ? "bg-sky-100 text-sky-700"
                            : someRead
                              ? "bg-slate-100 text-slate-600"
                              : "bg-transparent text-slate-400"
                        }`}
                        type="button"
                        onClick={() => onToggleReceipt(comment.id)}
                      >
                        <Icon name="check" size={12} />
                        {readByCount}/{totalTargets}
                      </button>
                    </Tooltip>
                  )}
                  <span>{formatTimestamp(comment.createdAt)}</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
              {openReceiptId === comment.id && totalTargets > 0 && (
                <div className="mt-3 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-700">
                      Read ({readByCount})
                    </p>
                    <ul className="mt-1 space-y-1">
                      {(comment.readByUsers ?? []).map((user) => (
                        <li key={user.id ?? "unknown"}>
                          {user.displayName ?? user.id ?? "Unknown"}
                        </li>
                      ))}
                      {readByCount === 0 && (
                        <li className="text-slate-400">None yet.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">
                      Unread ({unreadByCount})
                    </p>
                    <ul className="mt-1 space-y-1">
                      {(comment.unreadByUsers ?? []).map((user) => (
                        <li key={user.id ?? "unknown"}>
                          {user.displayName ?? user.id ?? "Unknown"}
                        </li>
                      ))}
                      {unreadByCount === 0 && (
                        <li className="text-slate-400">All caught up.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={commentsEndRef} />
      </div>

      <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg">
        {commentThread.unreadCount > 0 && commentThread.firstUnreadCommentId && (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <span>{commentThread.unreadCount} unread comments</span>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-700"
              type="button"
              onClick={onJumpToUnread}
            >
              <Icon name="comment" size={12} />
              Jump to unread
            </button>
          </div>
        )}
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <div className="relative">
            <textarea
              className="max-h-40 min-h-[40px] w-full resize-none rounded-xl border border-slate-200 px-4 py-2 pr-12 text-sm"
              placeholder="Add a comment…"
              rows={1}
              value={commentBody}
              onChange={handleChange}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.ctrlKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Tooltip content="Send comment">
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                type="submit"
                disabled={!commentBody.trim()}
                aria-label="Send comment"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="send" size={12} />
                  Send
                </span>
              </button>
            </Tooltip>
          </div>
          {showJumpToLatest && (
            <div className="flex justify-center">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-md"
                type="button"
                onClick={onJumpToLatest}
              >
                <Icon name="arrow-down" size={12} />
                Jump to latest
              </button>
            </div>
          )}
          {commentError && (
            <div className="flex justify-center">
              <span className="text-xs text-rose-600">{commentError}</span>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
