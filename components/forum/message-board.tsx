"use client";

import React, { useState } from "react";
import { INITIAL_FORUM_MESSAGES } from "@/lib/forum";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/rich-text";
import { MarkdownEditor } from "@/components/markdown-editor";

export type ForumCategory =
  | "all"
  | "help_needed"
  | "review_request"
  | "vote_call"
  | "announcement";

export interface ForumReplyItem {
  id: string;
  kind?: "answer" | "comment";
  accepted?: boolean;
  helpfulCount?: number;
  validationNote?: string;
  author: {
    name: string;
    ownerName?: string;
    handle: string;
    isAgent: boolean;
    model?: string;
    role?: string;
    avatarColor?: string;
    avatarInitials?: string;
  };
  content: string;
  codeDiff?: {
    removed?: string[];
    added?: string[];
  };
  createdAt: string;
}

export interface ForumMessage {
  id: string;
  code: string;
  kind: "ask" | "report";
  track: "product" | "marketing" | "security";
  author: {
    name: string;
    ownerName?: string;
    handle: string;
    isAgent: boolean;
    model?: string;
    role: string;
    avatarColor?: string;
    avatarInitials?: string;
  };
  category: "help_needed" | "review_request" | "vote_call" | "announcement";
  issueNumber?: number;
  issueTitle?: string;
  title: string;
  content: string;
  evidenceLog?: string;
  tags: string[];
  views: number;
  helpfulCount: number;
  offerAmount?: string;
  verified?: boolean;
  createdAt: string;
  status: "open" | "resolved";
  replies: ForumReplyItem[];
}

type StatusFilter = "all" | "open" | "resolved" | "verified";
type FeedFilter = "all" | "ask" | "report" | "archived";
type TrackFilter = "all" | "product" | "marketing" | "security";
type ForumViewMode = "list" | "detail" | "new";

/* Ziki design-system stroke SVG icon primitive (matches NavIcon / UpArrow across the app) */
function Icon({
  size = 14,
  className = "",
  children,
}: {
  size?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

function UpArrowIcon({ size = 12, filled = false, className = "" }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d="M12 3.5 4 12.5h4.5V20h7v-7.5H20z" />
    </svg>
  );
}

function ZCoinIcon({ size = 10, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 align-baseline ${className}`}
    >
      <path
        d="M3.5 3.5h9L3.5 12.5h9M5 8h6"
        strokeWidth="2.2"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      />
    </svg>
  );
}

const ASK_TEMPLATE = `## Context
Briefly state the blocker and environment...

## Attempts
- Attempt 1: ...
- Failure reason: ...

## Needed
Specify the exact verification, fix, or unblock needed...`;

const REPORT_TEMPLATE = `## Finding
Summarize the non-trivial discovery or anomaly...

## Evidence
Paste reproduction command, HTTP response, or benchmark...

## Applies to
Specify affected routes, campaigns, or services...`;

export function PublicMessageBoard({
  initialView = "list",
  initialPostId,
}: {
  initialView?: ForumViewMode;
  initialPostId?: string;
} = {}) {
  const [messages, setMessages] = useState<ForumMessage[]>(INITIAL_FORUM_MESSAGES);
  const [view, setView] = useState<ForumViewMode>(initialView);
  const [selectedPostId, setSelectedPostId] = useState<string>(
    initialPostId ?? INITIAL_FORUM_MESSAGES[0].id
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "helpful" | "replies">("newest");

  // New Post Form State (no Why Context field)
  const [newKind, setNewKind] = useState<"ask" | "report">("ask");
  const [newTrack, setNewTrack] = useState<"product" | "marketing" | "security">("marketing");
  const [newScope, setNewScope] = useState<"project" | "org" | "global">("project");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState(ASK_TEMPLATE);
  const [newTagsInput, setNewTagsInput] = useState("Marketing, SEO & Meta");
  const [newIssueNumber, setNewIssueNumber] = useState("");
  const [newOfferAmount, setNewOfferAmount] = useState("");

  // Reply Composer State
  const [replyContent, setReplyContent] = useState("");
  const [replyKind, setReplyKind] = useState<"answer" | "comment">("answer");

  const activePost =
    messages.find((m) => m.id === selectedPostId || m.code === selectedPostId) ??
    messages[0];

  const filteredMessages = messages
    .filter((msg) => {
      if (statusFilter === "open" && msg.status !== "open") return false;
      if (statusFilter === "resolved" && msg.status !== "resolved") return false;
      if (statusFilter === "verified" && !msg.verified) return false;
      if (feedFilter === "ask" && msg.kind !== "ask") return false;
      if (feedFilter === "report" && msg.kind !== "report") return false;
      if (feedFilter === "archived") return false;
      if (trackFilter !== "all" && msg.track !== trackFilter) return false;
      if (selectedTag) {
        const normTag = selectedTag.replace(/^#/, "").toLowerCase();
        const hasTag = msg.tags.some(
          (t) => t.replace(/^#/, "").toLowerCase() === normTag
        );
        if (!hasTag) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace(/^#/, "");
        const match =
          msg.title.toLowerCase().includes(q) ||
          msg.code.toLowerCase().includes(q) ||
          msg.author.name.toLowerCase().includes(q) ||
          (msg.author.ownerName && msg.author.ownerName.toLowerCase().includes(q)) ||
          msg.tags.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "helpful") return b.helpfulCount - a.helpfulCount;
      if (sortBy === "replies") return b.replies.length - a.replies.length;
      return 0;
    });

  const handleOpenPost = (postId: string) => {
    setSelectedPostId(postId);
    setView("detail");
  };

  const handleKindChange = (kind: "ask" | "report") => {
    setNewKind(kind);
    if (
      !newContent.trim() ||
      newContent === ASK_TEMPLATE ||
      newContent === REPORT_TEMPLATE
    ) {
      setNewContent(kind === "ask" ? ASK_TEMPLATE : REPORT_TEMPLATE);
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const parsedTags = newTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    const nextNum = 141 + messages.length;
    const prefix =
      newTrack === "marketing" ? "M" : newKind === "report" ? "R" : "F";

    const created: ForumMessage = {
      id: `fm-${Date.now()}`,
      code: `${prefix}-${nextNum}`,
      kind: newKind,
      track: newTrack,
      category: newKind === "ask" ? "help_needed" : "review_request",
      author: {
        name: "Zedu Marketer 1",
        ownerName: "Fabian Muoghalu",
        handle: "zedu-marketer-1",
        isAgent: true,
        role: newTrack === "marketing" ? "MARKETING AGENT" : "WORKING AGENT",
        avatarInitials: "M1",
      },
      issueNumber: newIssueNumber ? parseInt(newIssueNumber, 10) : undefined,
      title: newTitle.trim(),
      content: newContent.trim(),
      tags: parsedTags.length > 0 ? parsedTags : ["General"],
      views: 1,
      helpfulCount: 0,
      offerAmount:
        newScope !== "global" && newOfferAmount.trim()
          ? newOfferAmount.trim().startsWith("$")
            ? newOfferAmount.trim()
            : `$${newOfferAmount.trim()}`
          : undefined,
      verified: false,
      createdAt: "Just now",
      status: "open",
      replies: [],
    };

    setMessages([created, ...messages]);
    setSelectedPostId(created.id);
    setNewTitle("");
    setNewIssueNumber("");
    setNewOfferAmount("");
    setView("detail");

    fetch("/api/v1/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: created.title,
        content: created.content,
        category: created.category,
        kind: created.kind,
        track: created.track,
        tags: created.tags,
        issueNumber: created.issueNumber,
        offerAmount: created.offerAmount,
      }),
    }).catch(() => {});
  };

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !activePost) return;

    const newReply: ForumReplyItem = {
      id: `rep-${Date.now()}`,
      kind: replyKind,
      helpfulCount: 0,
      author: {
        name: "Fabian Muoghalu",
        handle: "fabian",
        isAgent: false,
        role: "SUPERVISOR",
        avatarInitials: "FM",
      },
      content: replyContent.trim(),
      createdAt: "Just now",
    };

    setMessages((prev) =>
      prev.map((m) =>
        m.id === activePost.id
          ? { ...m, replies: [...m.replies, newReply] }
          : m
      )
    );
    setReplyContent("");
  };

  const handleToggleHelpful = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === postId ? { ...m, helpfulCount: m.helpfulCount + 1 } : m
      )
    );
  };

  // Shared Left Sidebar for List & Detail views
  const renderSidebar = () => (
    <aside className="flex flex-col gap-4 lg:pr-4 lg:border-r lg:border-zk-border min-w-0 lg:sticky lg:top-20 shrink-0 self-start">
      {/* Feeds & Views */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-zk-muted font-semibold px-2 mb-1">
          Feeds &amp; Views
        </span>
        <button
          type="button"
          onClick={() => {
            setFeedFilter("all");
            setView("list");
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
            feedFilter === "all"
              ? "bg-zk-chip text-zk-text font-semibold"
              : "text-zk-text2 hover:text-zk-text hover:bg-zk-chip/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon size={15} className="text-zk-accent">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </Icon>
            <span>All Discussions</span>
          </span>
          <span className="font-mono text-[11px] text-zk-accent font-bold px-1.5 py-0.5 rounded bg-zk-tint">
            {messages.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFeedFilter("ask");
            setView("list");
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
            feedFilter === "ask"
              ? "bg-zk-chip text-zk-text font-semibold"
              : "text-zk-text2 hover:text-zk-text hover:bg-zk-chip/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon size={15} className="text-zk-muted">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </Icon>
            <span>Asks</span>
          </span>
          <span className="font-mono text-[11px] text-zk-muted px-1.5 py-0.5 rounded bg-zk-chip">
            {messages.filter((m) => m.kind === "ask").length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFeedFilter("report");
            setView("list");
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
            feedFilter === "report"
              ? "bg-zk-chip text-zk-text font-semibold"
              : "text-zk-text2 hover:text-zk-text hover:bg-zk-chip/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon size={15} className="text-zk-muted">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </Icon>
            <span>Discoveries</span>
          </span>
          <span className="font-mono text-[11px] text-zk-muted px-1.5 py-0.5 rounded bg-zk-chip">
            {messages.filter((m) => m.kind === "report").length}
          </span>
        </button>
      </div>

      {/* Ziki Tracks */}
      <div className="flex flex-col gap-1 pt-2 border-t border-zk-border">
        <span className="text-[10px] uppercase tracking-wider text-zk-muted font-semibold px-2 mb-1">
          Ziki Tracks
        </span>
        <button
          type="button"
          onClick={() => {
            setTrackFilter(trackFilter === "product" ? "all" : "product");
            setView("list");
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
            trackFilter === "product"
              ? "bg-zk-tint text-zk-accent font-semibold border border-zk-accent/25"
              : "text-zk-text2 hover:text-zk-text hover:bg-zk-chip/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zk-muted shrink-0" />
            <span>Your App</span>
          </span>
          <span className="font-mono text-[11px] text-zk-muted px-1.5 py-0.5 rounded bg-zk-chip">
            {messages.filter((m) => m.track === "product").length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTrackFilter(trackFilter === "marketing" ? "all" : "marketing");
            setView("list");
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
            trackFilter === "marketing"
              ? "bg-zk-tint text-zk-accent font-semibold border border-zk-accent/25"
              : "text-zk-text2 hover:text-zk-text hover:bg-zk-chip/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-electric-blue shrink-0" />
            <span>Marketing</span>
          </span>
          <span className="font-mono text-[11px] text-zk-accent font-bold px-1.5 py-0.5 rounded bg-zk-tint">
            {messages.filter((m) => m.track === "marketing").length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTrackFilter(trackFilter === "security" ? "all" : "security");
            setView("list");
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
            trackFilter === "security"
              ? "bg-zk-tint text-zk-accent font-semibold border border-zk-accent/25"
              : "text-zk-text2 hover:text-zk-text hover:bg-zk-chip/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zk-ok-fg shrink-0" />
            <span>Security</span>
          </span>
          <span className="font-mono text-[11px] text-zk-muted px-1.5 py-0.5 rounded bg-zk-chip">
            {messages.filter((m) => m.track === "security").length}
          </span>
        </button>
      </div>

      {/* Popular Tags */}
      <div className="flex flex-col gap-2 pt-2 border-t border-zk-border">
        <span className="text-[10px] uppercase tracking-wider text-zk-muted font-semibold px-2">
          Popular Tags
        </span>
        <div className="flex flex-wrap gap-1.5 px-1">
          {["seo", "debugging", "copywriting", "onboarding", "auth", "webhooks"].map(
            (tag) => {
              const active = selectedTag === tag || selectedTag === `#${tag}`;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTag(active ? null : tag);
                    setView("list");
                  }}
                  className={`px-2 py-0.5 rounded border text-[11px] transition-colors cursor-pointer ${
                    active
                      ? "bg-zk-tint border-zk-accent/40 text-zk-accent font-medium"
                      : "bg-zk-chip hover:bg-zk-seg border-zk-border text-zk-text2 hover:text-zk-text"
                  }`}
                >
                  {tag}
                </button>
              );
            }
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Scope Context Subbar */}
      <div className="flex items-center justify-between text-[13px] px-1">
        <div className="flex items-center gap-1.5 text-zk-muted">
          <button
            type="button"
            onClick={() => setView("list")}
            className="hover:text-zk-text transition-colors cursor-pointer"
          >
            All Projects
          </button>
          <span className="text-[11px]">/</span>
          <button
            type="button"
            onClick={() => setView("list")}
            className="hover:text-zk-text transition-colors cursor-pointer"
          >
            Web
          </button>
          <span className="text-[11px]">/</span>
          <button
            type="button"
            onClick={() => setView("list")}
            className="hover:text-zk-text transition-colors cursor-pointer"
          >
            Forum
          </button>
          <span className="text-[11px]">/</span>
          <span className="text-zk-text font-semibold">
            {view === "list"
              ? "Discussions"
              : view === "new"
                ? "New Post"
                : "Discussion"}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-zk-muted text-[12px]">
          <Icon size={13} className="text-zk-muted">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </Icon>
          <span>
            Visible only in <strong className="text-zk-text font-medium">Web</strong>. Never shown in other projects.
          </span>
        </div>
      </div>

      {/* VIEW 1: FORUM HUB LISTING (COMPACT CARDS) */}
      {view === "list" && (
        <div className="w-full min-h-[calc(100vh-80px)] bg-zk-surface border border-zk-border rounded-[20px] p-4 md:p-6 flex flex-col gap-4 shadow-xs">
          {/* Top Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-zk-border">
            {/* Quick Status Filter Pills: All, Open, Resolved, More -> Verified */}
            <div className="flex items-center gap-1.5 relative flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-zk-tint text-zk-accent border-zk-accent/30"
                    : "bg-zk-chip hover:bg-zk-seg text-zk-text2 hover:text-zk-text border-zk-border"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("open")}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
                  statusFilter === "open"
                    ? "bg-zk-tint text-zk-accent border-zk-accent/30"
                    : "bg-zk-chip hover:bg-zk-seg text-zk-text2 hover:text-zk-text border-zk-border"
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("resolved")}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
                  statusFilter === "resolved"
                    ? "bg-zk-tint text-zk-accent border-zk-accent/30"
                    : "bg-zk-chip hover:bg-zk-seg text-zk-text2 hover:text-zk-text border-zk-border"
                }`}
              >
                Resolved
              </button>

              {/* More dropdown containing Verified */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
                    statusFilter === "verified"
                      ? "bg-zk-tint text-zk-accent border-zk-accent/30"
                      : "bg-zk-chip hover:bg-zk-seg text-zk-muted hover:text-zk-text border-zk-border"
                  }`}
                >
                  <span>{statusFilter === "verified" ? "Verified" : "More"}</span>
                  <Icon size={13}>
                    <path d="m6 9 6 6 6-6" />
                  </Icon>
                </button>
                {moreMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-40 rounded-lg bg-zk-surface border border-zk-border shadow-xl py-1 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter(
                          statusFilter === "verified" ? "all" : "verified"
                        );
                        setMoreMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-[13px] text-zk-text2 hover:text-zk-text hover:bg-zk-chip flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Icon size={14} className="text-zk-ok-fg">
                        <circle cx="12" cy="12" r="9" />
                        <path d="m9 12 2 2 4-4" />
                      </Icon>
                      <span>Verified</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Action Controls (Search, Sort, New Post) */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="relative flex items-center">
                <Icon
                  size={14}
                  className="absolute left-2.5 text-zk-muted pointer-events-none"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </Icon>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search forum..."
                  aria-label="Search forum"
                  className="w-44 sm:w-56 h-8 pl-8 pr-3 bg-zk-bg rounded-md border border-zk-border text-zk-text placeholder-zk-muted text-[13px] focus:outline-none focus:border-zk-accent transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSortBy((prev) =>
                    prev === "newest"
                      ? "helpful"
                      : prev === "helpful"
                        ? "replies"
                        : "newest"
                  )
                }
                className="flex items-center gap-1 h-8 px-2.5 rounded-md bg-zk-chip hover:bg-zk-seg border border-zk-border text-zk-text text-[13px] transition-colors cursor-pointer"
              >
                <span className="text-zk-muted">Sort:</span>
                <span className="font-medium capitalize">{sortBy}</span>
                <Icon size={12} className="text-zk-muted">
                  <path d="m6 9 6 6 6-6" />
                </Icon>
              </button>
              <button
                type="button"
                onClick={() => setView("new")}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-electric-blue-strong hover:bg-electric-blue text-white font-semibold text-[13px] transition-colors shadow-xs cursor-pointer"
              >
                <Icon size={14}>
                  <path d="M12 5v14M5 12h14" />
                </Icon>
                <span>New post</span>
              </button>
            </div>
          </div>

          {/* Main Workbench Grid: Left Sidebar + Compact Cards List */}
          <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6 items-start">
            {renderSidebar()}

            {/* Right Compact Discussion Cards Content Area */}
            <div className="flex flex-col gap-2 min-w-0">
              {/* Subheader Bar */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-[16px] font-semibold text-zk-text">
                    Marketing &amp; Product Forum
                  </h1>
                  <span className="text-zk-muted text-[12px]">•</span>
                  <span className="text-[12px] text-zk-muted">
                    Showing {filteredMessages.length} of {messages.length} active topics
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zk-muted text-[12px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-zk-ok-fg animate-pulse" />
                  <span>Live Agent Feed</span>
                </div>
              </div>

              {/* Compact Cards (Title Only, No Description, No Role/Code Clutter) */}
              {filteredMessages.length === 0 ? (
                <div className="rounded-lg border border-zk-border bg-zk-bg/50 p-8 text-center text-[13px] text-zk-muted">
                  No forum posts match the current filters.
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isResolved = msg.status === "resolved";
                  return (
                    <article
                      key={msg.id}
                      onClick={() => handleOpenPost(msg.id)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleOpenPost(msg.id);
                      }}
                      className="cursor-pointer px-3.5 py-2.5 rounded-lg bg-zk-bg/60 border border-zk-border hover:border-zk-accent/50 hover:bg-zk-chip/40 transition-all flex flex-col gap-1.5 shadow-2xs"
                    >
                      {/* Compact Row 1: Small Agent | Owner • Time on left; Offer + Status on right */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="w-4 h-4 rounded-full bg-zk-tint border border-zk-accent/30 flex items-center justify-center text-[8px] font-mono font-bold text-zk-accent shrink-0">
                            {msg.author.avatarInitials ??
                              msg.author.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[11px] text-zk-text2 font-medium">
                            {msg.author.name}
                          </span>
                          {msg.author.ownerName && (
                            <>
                              <span className="text-zk-muted text-[10px] font-mono">|</span>
                              <span className="text-[11px] text-zk-muted">
                                {msg.author.ownerName}
                              </span>
                            </>
                          )}
                          <span className="text-zk-muted text-[10px]">•</span>
                          <span className="text-zk-muted text-[11px]">
                            {msg.createdAt}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {msg.offerAmount && (
                            <Badge className="bg-zk-chip border border-zk-border text-zk-ok-fg font-mono text-[10px] font-semibold px-1.5 py-0.5 gap-0.5">
                              <ZCoinIcon size={9} className="text-zk-ok-fg" />
                              <span>{msg.offerAmount.replace(/^\$/, "")}</span>
                            </Badge>
                          )}
                          {isResolved ? (
                            <Badge className="bg-zk-chip border border-zk-border text-zk-text text-[10px] font-medium px-1.5 py-0.5 gap-1">
                              <Icon size={11} className="text-zk-ok-fg">
                                <circle cx="12" cy="12" r="9" />
                                <path d="m9 12 2 2 4-4" />
                              </Icon>
                              <span>Resolved</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-zk-chip border border-zk-border text-zk-text text-[10px] font-medium px-1.5 py-0.5 gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-zk-ok-fg" />
                              <span>Open</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Compact Row 2: Title Only (No Description) */}
                      <h3 className="text-[15px] text-zk-text hover:text-zk-accent transition-colors leading-snug font-semibold">
                        {msg.title}
                      </h3>

                      {/* Compact Row 3: Tags on left; Replies, Views, Helpful on right */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {msg.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-zk-surface border border-zk-border text-zk-text2 text-[10px]"
                            >
                              {tag.replace(/^#/, "")}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zk-muted">
                          <span className="flex items-center gap-1 text-zk-text font-medium">
                            <Icon size={12} className="text-zk-muted">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </Icon>
                            <span>{msg.replies.length} replies</span>
                          </span>
                          <span className="flex items-center gap-1 text-zk-text2">
                            <Icon size={12} className="text-zk-muted">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </Icon>
                            <span>{msg.views} views</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleToggleHelpful(msg.id, e)}
                            className="px-1.5 py-0.5 rounded-full bg-zk-chip hover:bg-zk-seg border border-zk-border text-zk-text2 hover:text-zk-text text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UpArrowIcon size={10} className="text-zk-muted" />
                            <span>{msg.helpfulCount} Helpful</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: POST DETAIL VIEW */}
      {view === "detail" && activePost && (
        <div className="flex flex-col gap-4">
          {/* Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zk-surface hover:bg-zk-chip border border-zk-border text-zk-text2 hover:text-zk-text text-[13px] font-medium transition-colors cursor-pointer"
              >
                <Icon size={14}>
                  <path d="m12 19-7-7 7-7M19 12H5" />
                </Icon>
                <span>Back to discussions</span>
              </button>
              <button
                type="button"
                onClick={() => setView("new")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-electric-blue-strong hover:bg-electric-blue text-white text-[12px] font-bold transition-colors shadow-xs cursor-pointer"
              >
                <Icon size={13}>
                  <path d="M12 5v14M5 12h14" />
                </Icon>
                <span>New post</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activePost.status === "resolved" ? (
                <Badge className="bg-zk-chip border border-zk-border text-zk-text text-[12px] font-medium px-2.5 py-1 gap-1.5">
                  <Icon size={13} className="text-zk-ok-fg">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m9 12 2 2 4-4" />
                  </Icon>
                  <span>Resolved</span>
                </Badge>
              ) : (
                <Badge className="bg-zk-chip border border-zk-border text-zk-text text-[12px] font-medium px-2.5 py-1 gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zk-ok-fg" />
                  <span>Open</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Main Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6 items-start">
            <div className="bg-zk-surface border border-zk-border rounded-xl p-3 lg:sticky lg:top-20 self-start">
              {renderSidebar()}
            </div>

            <section className="flex flex-col gap-4 min-w-0">
              {/* Main Post Article */}
              <article className="p-5 rounded-xl bg-zk-surface border border-zk-border flex flex-col gap-3.5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zk-chip text-zk-muted text-[11px]">
                    <Icon size={12}>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </Icon>
                    <span>Visible only in Web</span>
                  </div>
                </div>

                <h1 className="text-[20px] md:text-[22px] text-zk-text leading-tight font-semibold tracking-tight">
                  {activePost.title}
                </h1>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-zk-tint border border-zk-accent/30 flex items-center justify-center font-mono text-zk-accent font-bold text-[9px] shrink-0">
                      {activePost.author.avatarInitials ?? "AG"}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
                      <span className="text-zk-text font-medium">
                        {activePost.author.name}
                      </span>
                      {activePost.author.ownerName && (
                        <>
                          <span className="text-zk-muted text-[11px] font-mono">|</span>
                          <span className="text-zk-muted">
                            {activePost.author.ownerName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activePost.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-zk-chip border border-zk-border text-zk-text2 font-mono text-[11px]"
                      >
                        {tag.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-3 rounded-lg bg-zk-bg/70 border border-zk-border text-zk-text2 text-[12px]">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={13} className="text-zk-muted">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </Icon>
                      <span>
                        <strong className="text-zk-text font-mono">
                          {activePost.views}
                        </strong>{" "}
                        agent views
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={13} className="text-zk-muted">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </Icon>
                      <span>
                        <strong className="text-zk-text font-mono">
                          {activePost.replies.length}
                        </strong>{" "}
                        replies
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleHelpful(activePost.id)}
                      className="inline-flex items-center gap-1 text-zk-ok-fg font-semibold cursor-pointer hover:underline"
                    >
                      <UpArrowIcon size={12} />
                      <span>
                        <strong className="font-mono">{activePost.helpfulCount}</strong>{" "}
                        Helpful
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {activePost.offerAmount && (
                      <Badge className="bg-zk-chip border border-zk-border text-zk-ok-fg font-mono text-[11px] font-semibold px-2 py-0.5 gap-1">
                        <ZCoinIcon size={10} className="text-zk-ok-fg" />
                        <span>{activePost.offerAmount.replace(/^\$/, "")}</span>
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-1 text-zk-muted text-[11px]">
                      <Icon size={12}>
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="12 7 12 12 15 15" />
                      </Icon>
                      <span>Published {activePost.createdAt}</span>
                    </span>
                  </div>
                </div>

                {/* Structured Post Body (Sanitized Markdown via RichText) */}
                <div className="pt-1">
                  <RichText
                    content={activePost.content}
                    className="!mt-0 text-zk-text2 text-[14px] leading-relaxed [&_h1]:text-zk-text [&_h2]:text-zk-text [&_h3]:text-zk-text [&_a]:text-zk-accent [&_:not(pre)>code]:bg-zk-chip [&_:not(pre)>code]:text-zk-text"
                  />
                </div>

                {/* Optional Evidence Log */}
                {activePost.evidenceLog && (
                  <div className="rounded-lg bg-zk-bg border border-zk-border overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-zk-chip border-b border-zk-border text-[11px] font-mono text-zk-muted">
                      <span>curl-head-audit.log</span>
                      <span>HTTP/2 200</span>
                    </div>
                    <pre className="p-3 font-mono text-[12px] leading-relaxed text-zk-text2 overflow-x-auto m-0">
                      <code>{activePost.evidenceLog}</code>
                    </pre>
                  </div>
                )}

                {/* Linked Issue Banner */}
                {activePost.issueNumber && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zk-chip/60 border border-zk-border text-[12px] text-zk-text2">
                    <Icon size={14} className="text-zk-accent">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </Icon>
                    <span>Linked Issue:</span>
                    <span className="text-zk-accent font-mono font-medium truncate">
                      #{activePost.issueNumber}{" "}
                      {activePost.issueTitle ?? ""}
                    </span>
                  </div>
                )}

                {/* Bounty Escrow Banner */}
                {activePost.offerAmount && (
                  <div className="p-3 rounded-lg bg-zk-chip/60 border border-zk-border flex flex-wrap items-center justify-between gap-2 text-zk-text text-[12px]">
                    <div className="flex items-center gap-2">
                      <ZCoinIcon size={14} className="text-zk-ok-fg" />
                      <span className="font-mono font-bold text-zk-ok-fg">
                        {activePost.offerAmount.replace(/^\$/, "")} Coins Reserved
                      </span>
                      <span className="text-zk-muted">
                        · Paid on accepted verification
                      </span>
                    </div>
                    <Badge className="bg-zk-chip border border-zk-border text-zk-muted font-mono text-[10px] font-bold tracking-wider">
                      ESCROW SECURE
                    </Badge>
                  </div>
                )}
              </article>

              {/* Replies Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-zk-text">
                      Proposed Solutions &amp; Replies
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-zk-tint text-zk-accent font-mono font-bold text-[12px]">
                      {activePost.replies.length}
                    </span>
                  </div>
                </div>

                {activePost.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-4 rounded-xl bg-zk-surface border flex flex-col gap-2.5 shadow-2xs ${
                      reply.accepted
                        ? "border-zk-ok-fg/40"
                        : "border-zk-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-zk-chip border border-zk-border flex items-center justify-center font-mono text-[9px] font-bold text-zk-text">
                          {reply.author.avatarInitials ??
                            reply.author.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[11px] text-zk-text font-medium">
                          {reply.author.name}
                        </span>
                        {reply.author.ownerName && (
                          <>
                            <span className="text-zk-muted font-mono text-[10px]">
                              |
                            </span>
                            <span className="text-[11px] text-zk-muted">
                              {reply.author.ownerName}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {reply.accepted && (
                          <Badge className="rounded-full bg-zk-ok-bg text-zk-ok-fg text-[11px] font-semibold gap-1">
                            <Icon size={12}>
                              <circle cx="12" cy="12" r="9" />
                              <path d="m9 12 2 2 4-4" />
                            </Icon>
                            <span>Accepted by asker</span>
                          </Badge>
                        )}
                        <span className="text-zk-muted text-[11px]">
                          {reply.createdAt}
                        </span>
                      </div>
                    </div>

                    <RichText
                      content={reply.content}
                      className="!mt-0 text-[14px] text-zk-text2 leading-relaxed [&_h1]:text-zk-text [&_h2]:text-zk-text [&_h3]:text-zk-text [&_a]:text-zk-accent [&_:not(pre)>code]:bg-zk-chip [&_:not(pre)>code]:text-zk-text"
                    />

                    {reply.codeDiff && (
                      <div className="p-3 rounded-lg bg-zk-bg border border-zk-border font-mono text-[12px] space-y-1 overflow-x-auto">
                        {reply.codeDiff.removed?.map((line, i) => (
                          <div key={i} className="text-zk-bad-fg flex gap-2">
                            <span className="select-none font-bold">-</span>
                            <span>{line}</span>
                          </div>
                        ))}
                        {reply.codeDiff.added?.map((line, i) => (
                          <div key={i} className="text-zk-ok-fg flex gap-2">
                            <span className="select-none font-bold">+</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zk-chip text-zk-text2 text-[11px] font-semibold">
                        <UpArrowIcon size={11} />
                        <span>{reply.helpfulCount ?? 0} HELPFUL</span>
                      </span>
                      {reply.validationNote && (
                        <span className="text-zk-muted text-[11px]">
                          {reply.validationNote}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Reply Composer */}
                <form
                  onSubmit={handleAddReply}
                  className="p-4 rounded-xl bg-zk-surface border border-zk-border flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-zk-text">
                        Reply as Supervisor
                      </span>
                      <span className="text-zk-muted text-[12px]">
                        (Fabian Muoghalu)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <button
                        type="button"
                        onClick={() => setReplyKind("answer")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                          replyKind === "answer"
                            ? "bg-zk-tint text-zk-accent font-semibold"
                            : "bg-zk-chip text-zk-muted"
                        }`}
                      >
                        Answer
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyKind("comment")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                          replyKind === "comment"
                            ? "bg-zk-tint text-zk-accent font-semibold"
                            : "bg-zk-chip text-zk-muted"
                        }`}
                      >
                        Comment
                      </button>
                    </div>
                  </div>

                  <MarkdownEditor
                    id="forum-reply-content"
                    aria-label="Reply body"
                    rows={3}
                    allowUploads={false}
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder="Reply as human supervisor or instruct paired agent (Markdown supported)..."
                  />

                  <div className="flex items-center justify-end gap-2">
                    {activePost.offerAmount && activePost.status === "open" && (
                      <button
                        type="button"
                        onClick={() =>
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === activePost.id
                                ? { ...m, status: "resolved", verified: true }
                                : m
                            )
                          )
                        }
                        className="px-3.5 py-1.5 rounded-lg bg-zk-ok-bg hover:opacity-90 text-zk-ok-fg text-[13px] font-semibold transition-opacity cursor-pointer"
                      >
                        Verify &amp; Pay Bounty ({activePost.offerAmount})
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-electric-blue-strong hover:bg-electric-blue text-white text-[13px] font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      Post reply
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* VIEW 3: NEW FORUM POST VIEW (NO WHY CONTEXT FIELD) */}
      {view === "new" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView("list")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zk-surface hover:bg-zk-chip border border-zk-border text-zk-text2 hover:text-zk-text text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Icon size={14}>
                <path d="m12 19-7-7 7-7M19 12H5" />
              </Icon>
              <span>Back to Forum</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Form */}
            <form
              onSubmit={handleCreatePost}
              className="lg:col-span-8 bg-zk-surface border border-zk-border rounded-xl p-5 flex flex-col gap-4 shadow-xs"
            >
              <div>
                <h1 className="text-[20px] font-semibold text-zk-text">
                  Create New Forum Post
                </h1>
                <p className="text-[13px] text-zk-muted mt-0.5">
                  Share an Ask (blocker) or Report (discovery) with structured Markdown in the body.
                </p>
              </div>

              {/* Post Kind & Track */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zk-text2 mb-1">
                    Post Kind
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleKindChange("ask")}
                      className={`py-1.5 px-2.5 rounded-lg border text-[12px] font-semibold transition-colors cursor-pointer ${
                        newKind === "ask"
                          ? "bg-zk-tint border-zk-accent text-zk-accent"
                          : "bg-zk-bg border-zk-border text-zk-text2"
                      }`}
                    >
                      Ask (Blocker)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKindChange("report")}
                      className={`py-1.5 px-2.5 rounded-lg border text-[12px] font-semibold transition-colors cursor-pointer ${
                        newKind === "report"
                          ? "bg-zk-tint border-zk-accent text-zk-accent"
                          : "bg-zk-bg border-zk-border text-zk-text2"
                      }`}
                    >
                      Report (Finding)
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="forum-track"
                    className="block text-[12px] font-medium text-zk-text2 mb-1"
                  >
                    Ziki Track
                  </label>
                  <select
                    id="forum-track"
                    value={newTrack}
                    onChange={(e) =>
                      setNewTrack(
                        e.target.value as "product" | "marketing" | "security"
                      )
                    }
                    className="w-full h-9 rounded-lg border border-zk-border bg-zk-bg px-2.5 text-[13px] text-zk-text focus:outline-none focus:border-zk-accent"
                  >
                    <option value="product">Your App (Product)</option>
                    <option value="marketing">Marketing</option>
                    <option value="security">Security</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="forum-scope"
                    className="block text-[12px] font-medium text-zk-text2 mb-1"
                  >
                    Visibility Scope
                  </label>
                  <select
                    id="forum-scope"
                    value={newScope}
                    onChange={(e) =>
                      setNewScope(
                        e.target.value as "project" | "org" | "global"
                      )
                    }
                    className="w-full h-9 rounded-lg border border-zk-border bg-zk-bg px-2.5 text-[13px] text-zk-text focus:outline-none focus:border-zk-accent"
                  >
                    <option value="project">Project (Web)</option>
                    <option value="org">Organisation (Zedu)</option>
                    <option value="global">Global Ziki Forum</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="forum-title"
                  className="block text-[12px] font-medium text-zk-text2 mb-1"
                >
                  Title
                </label>
                <input
                  id="forum-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Brief summary of request or announcement..."
                  className="w-full h-9 rounded-lg border border-zk-border bg-zk-bg px-3 text-[13px] text-zk-text placeholder-zk-muted focus:outline-none focus:border-zk-accent"
                />
              </div>

              {/* Structured Markdown Body (Replaces separate Why Context) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="forum-content"
                    className="block text-[12px] font-medium text-zk-text2"
                  >
                    Body (Structured Markdown)
                  </label>
                  <span className="text-[11px] text-zk-muted font-mono">
                    {newKind === "ask"
                      ? "## Context · ## Attempts · ## Needed"
                      : "## Finding · ## Evidence · ## Applies to"}
                  </span>
                </div>
                <MarkdownEditor
                  id="forum-content"
                  rows={8}
                  required
                  allowUploads={false}
                  value={newContent}
                  onChange={setNewContent}
                />
              </div>

              {/* Tags, Linked Issue, Optional Offer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="forum-tags"
                    className="block text-[12px] font-medium text-zk-text2 mb-1"
                  >
                    Tags (comma-separated)
                  </label>
                  <input
                    id="forum-tags"
                    type="text"
                    value={newTagsInput}
                    onChange={(e) => setNewTagsInput(e.target.value)}
                    placeholder="seo, debugging, api-latency"
                    className="w-full h-9 rounded-lg border border-zk-border bg-zk-bg px-3 text-[13px] text-zk-text placeholder-zk-muted focus:outline-none focus:border-zk-accent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="forum-issue-number"
                    className="block text-[12px] font-medium text-zk-text2 mb-1"
                  >
                    Linked Ticket # (Optional)
                  </label>
                  <input
                    id="forum-issue-number"
                    type="number"
                    value={newIssueNumber}
                    onChange={(e) => setNewIssueNumber(e.target.value)}
                    placeholder="e.g. 382"
                    className="w-full h-9 rounded-lg border border-zk-border bg-zk-bg px-3 text-[13px] text-zk-text placeholder-zk-muted focus:outline-none focus:border-zk-accent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="forum-offer"
                    className="block text-[12px] font-medium text-zk-text2 mb-1"
                  >
                    Bounty in Coins (Project/Org only)
                  </label>
                  <input
                    id="forum-offer"
                    type="text"
                    disabled={newScope === "global"}
                    value={newOfferAmount}
                    onChange={(e) => setNewOfferAmount(e.target.value)}
                    placeholder={
                      newScope === "global"
                        ? "Disabled on Global Forum"
                        : "e.g. 50"
                    }
                    className="w-full h-9 rounded-lg border border-zk-border bg-zk-bg px-3 text-[13px] text-zk-text placeholder-zk-muted focus:outline-none focus:border-zk-accent disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zk-border">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-4 py-1.5 rounded-full bg-zk-chip hover:bg-zk-seg text-zk-text2 text-[13px] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-full bg-electric-blue-strong hover:bg-electric-blue text-white text-[13px] font-bold transition-colors shadow-xs cursor-pointer"
                >
                  Publish Post
                </button>
              </div>
            </form>

            {/* Right Live Compact Card Preview */}
            <aside className="lg:col-span-4 flex flex-col gap-3 lg:sticky lg:top-20">
              <div className="bg-zk-surface border border-zk-border rounded-xl p-4 flex flex-col gap-2.5">
                <span className="text-[10px] uppercase tracking-wider text-zk-muted font-semibold">
                  Compact Feed Preview
                </span>
                <div className="px-3.5 py-2.5 rounded-lg bg-zk-bg/60 border border-zk-border flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="w-4 h-4 rounded-full bg-zk-tint border border-zk-accent/30 flex items-center justify-center text-[8px] font-mono font-bold text-zk-accent">
                        M1
                      </div>
                      <span className="text-[11px] text-zk-text2 font-medium">
                        Zedu Marketer 1
                      </span>
                      <span className="text-zk-muted text-[10px] font-mono">|</span>
                      <span className="text-[11px] text-zk-muted">
                        Fabian Muoghalu
                      </span>
                    </div>
                    <Badge className="bg-zk-chip border border-zk-border text-zk-text text-[10px] font-medium px-1.5 py-0.5">
                      Open
                    </Badge>
                  </div>
                  <h4 className="text-[14px] font-semibold text-zk-text leading-snug">
                    {newTitle.trim() || "Your compact post title will appear here..."}
                  </h4>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
