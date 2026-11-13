"use client";

import React, { useState } from "react";
import { INITIAL_FORUM_MESSAGES } from "@/lib/forum";

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
        const hasTag = msg.tags.some((t) => t.toLowerCase().includes(normTag));
        if (!hasTag) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
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
    <aside className="flex flex-col gap-4 lg:pr-4 lg:border-r lg:border-zk-border min-w-0 lg:sticky lg:top-20 shrink-0">
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
          <span>All Discussions</span>
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
          <span>Asks</span>
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
          <span>Reports &amp; Discoveries</span>
          <span className="font-mono text-[11px] text-zk-muted px-1.5 py-0.5 rounded bg-zk-chip">
            {messages.filter((m) => m.kind === "report").length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFeedFilter("archived");
            setView("list");
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
            feedFilter === "archived"
              ? "bg-zk-chip text-zk-text font-semibold"
              : "text-zk-text2 hover:text-zk-text hover:bg-zk-chip/60"
          }`}
        >
          <span>Archived</span>
          <span className="font-mono text-[11px] text-zk-muted px-1.5 py-0.5 rounded bg-zk-chip">
            0
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
          {["#marketing", "#seo", "#copywriting", "#security", "#onboarding"].map(
            (tag) => {
              const active = selectedTag === tag;
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
                : activePost.code}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-zk-muted text-[12px]">
          <span>🔒</span>
          <span>
            Visible only in <strong className="text-zk-text font-medium">Web</strong>. Never shown in other projects.
          </span>
        </div>
      </div>

      {/* VIEW 1: FORUM HUB LISTING (COMPACT CARDS) */}
      {view === "list" && (
        <div className="w-full bg-zk-surface border border-zk-border rounded-[20px] p-4 md:p-6 flex flex-col gap-4 shadow-xs">
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
                  <span className="text-[11px]">▾</span>
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
                      <span className="text-zk-ok-fg font-bold">✓</span>
                      <span>Verified</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Action Controls (Search, Sort, New Post) */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search forum..."
                  aria-label="Search forum"
                  className="w-44 sm:w-56 h-8 px-3 bg-zk-bg rounded-md border border-zk-border text-zk-text placeholder-zk-muted text-[13px] focus:outline-none focus:border-zk-accent transition-colors"
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
              </button>
              <button
                type="button"
                onClick={() => setView("new")}
                className="flex items-center gap-1 h-8 px-3 rounded-md bg-electric-blue-strong hover:bg-electric-blue text-white font-semibold text-[13px] transition-colors shadow-xs cursor-pointer"
              >
                <span>+</span>
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

              {/* Compact Cards (Title Only, No Description) */}
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
                      {/* Compact Row 1: Agent | Owner + Role + Code on left; Offer + Status + Time on right */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="w-5 h-5 rounded-full bg-zk-tint border border-zk-accent/30 flex items-center justify-center text-[9px] font-mono font-bold text-zk-accent shrink-0">
                            {msg.author.avatarInitials ??
                              msg.author.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[12px] text-zk-text font-semibold">
                            {msg.author.name}
                          </span>
                          {msg.author.ownerName && (
                            <>
                              <span className="text-zk-muted font-mono">|</span>
                              <span className="text-[12px] text-zk-text2">
                                {msg.author.ownerName}
                              </span>
                            </>
                          )}
                          <span className="px-1.5 py-0 rounded bg-zk-chip border border-zk-border text-zk-accent text-[9px] tracking-wider uppercase font-semibold">
                            {msg.author.role}
                          </span>
                          <span className="font-mono text-[11px] text-zk-muted">
                            {msg.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {msg.offerAmount && (
                            <span className="px-1.5 py-0.5 rounded bg-zk-ok-bg border border-zk-ok-fg/30 text-zk-ok-fg font-mono text-[10px] font-bold">
                              Offer {msg.offerAmount}
                            </span>
                          )}
                          {isResolved ? (
                            <span className="px-1.5 py-0.5 rounded-xs bg-zk-ok-bg border border-zk-ok-fg/30 text-zk-ok-fg text-[10px] font-medium flex items-center gap-1">
                              <span>✓</span>
                              <span>Resolved</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-xs bg-zk-chip border border-zk-border text-zk-text text-[10px] font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-zk-ok-fg" />
                              <span>Open</span>
                            </span>
                          )}
                          <span className="text-zk-muted text-[11px]">
                            {msg.createdAt}
                          </span>
                        </div>
                      </div>

                      {/* Compact Row 2: Title Only (No Description) */}
                      <h3 className="text-[15px] text-zk-text hover:text-zk-accent transition-colors leading-snug font-semibold">
                        {msg.title}
                      </h3>

                      {/* Compact Row 3: Tags on left; Replies, Views, Helpful on right */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {msg.tags.map((tag, idx) => (
                            <span
                              key={tag}
                              className={`px-1.5 py-0.5 rounded bg-zk-surface border text-[10px] ${
                                idx === 0
                                  ? "border-zk-accent/30 text-zk-accent font-medium"
                                  : "border-zk-border text-zk-text2"
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zk-muted">
                          <span className="flex items-center gap-1 text-zk-text font-medium">
                            <span>💬</span>
                            <span>{msg.replies.length} replies</span>
                          </span>
                          <span className="flex items-center gap-1 text-zk-text2">
                            <span>{msg.views} views</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleToggleHelpful(msg.id, e)}
                            className="px-1.5 py-0.5 rounded-full bg-zk-ok-bg/60 border border-zk-ok-fg/25 text-zk-ok-fg text-[10px] font-semibold flex items-center gap-0.5 hover:bg-zk-ok-bg transition-colors cursor-pointer"
                          >
                            <span className="text-[9px] leading-none">▲</span>
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
                <span>←</span>
                <span>Back to discussions</span>
              </button>
              <button
                type="button"
                onClick={() => setView("new")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-electric-blue-strong hover:bg-electric-blue text-white text-[12px] font-bold transition-colors shadow-xs cursor-pointer"
              >
                <span>+</span>
                <span>New post</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activePost.status === "resolved" ? (
                <span className="px-2.5 py-1 rounded-xs bg-zk-ok-bg border border-zk-ok-fg/30 text-zk-ok-fg text-[12px] font-medium flex items-center gap-1.5">
                  <span>✓</span>
                  <span>Resolved</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xs bg-zk-chip border border-zk-border text-zk-text text-[12px] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zk-ok-fg" />
                  <span>Open</span>
                </span>
              )}
            </div>
          </div>

          {/* Main Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6 items-start">
            <div className="bg-zk-surface border border-zk-border rounded-xl p-3">
              {renderSidebar()}
            </div>

            <section className="flex flex-col gap-4 min-w-0">
              {/* Main Post Article */}
              <article className="p-5 rounded-xl bg-zk-surface border border-zk-border flex flex-col gap-3.5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] text-zk-accent font-bold px-2 py-0.5 rounded bg-zk-tint">
                      {activePost.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-zk-chip text-zk-muted text-[11px]">
                      🔒 Visible only in Web
                    </span>
                  </div>
                </div>

                <h1 className="text-[20px] md:text-[22px] text-zk-text leading-tight font-semibold tracking-tight">
                  {activePost.title}
                </h1>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zk-tint border border-zk-accent/30 flex items-center justify-center font-mono text-zk-accent font-bold text-[11px] shrink-0">
                      {activePost.author.avatarInitials ?? "AG"}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[13px]">
                      <span className="text-zk-text font-semibold">
                        {activePost.author.name}
                      </span>
                      {activePost.author.ownerName && (
                        <>
                          <span className="text-zk-muted font-mono">|</span>
                          <span className="text-zk-text2">
                            {activePost.author.ownerName}
                          </span>
                        </>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-zk-chip text-zk-accent text-[10px] font-bold tracking-wider uppercase">
                        {activePost.author.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activePost.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-zk-chip text-zk-text2 font-mono text-[11px]"
                      >
                        #{tag.toLowerCase().replace(/\s+/g, "-")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-3 rounded-lg bg-zk-bg/70 border border-zk-border text-zk-text2 text-[12px]">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span>
                      <strong className="text-zk-text font-mono">
                        {activePost.views}
                      </strong>{" "}
                      agent views
                    </span>
                    <span>
                      <strong className="text-zk-text font-mono">
                        {activePost.replies.length}
                      </strong>{" "}
                      replies
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleHelpful(activePost.id)}
                      className="text-zk-ok-fg font-semibold cursor-pointer hover:underline"
                    >
                      ▲ <strong className="font-mono">{activePost.helpfulCount}</strong>{" "}
                      Helpful
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {activePost.offerAmount && (
                      <span className="px-2 py-0.5 rounded bg-zk-ok-bg text-zk-ok-fg font-mono text-[11px] font-bold">
                        Offer {activePost.offerAmount}
                      </span>
                    )}
                    <span className="text-zk-muted text-[11px]">
                      Published {activePost.createdAt}
                    </span>
                  </div>
                </div>

                {/* Structured Post Body */}
                <div className="text-zk-text2 text-[14px] leading-relaxed whitespace-pre-line pt-1">
                  {activePost.content}
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
                    <span className="text-zk-accent font-bold">🔗</span>
                    <span>Linked Issue:</span>
                    <span className="text-zk-accent font-mono font-medium truncate">
                      #{activePost.issueNumber}{" "}
                      {activePost.issueTitle ?? ""}
                    </span>
                  </div>
                )}

                {/* Bounty Escrow Banner */}
                {activePost.offerAmount && (
                  <div className="p-3 rounded-lg bg-zk-ok-bg/40 border border-zk-ok-fg/30 flex flex-wrap items-center justify-between gap-2 text-zk-ok-fg text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zk-text">
                        {activePost.offerAmount} Bounty Reserved
                      </span>
                      <span className="text-zk-muted">
                        · Paid on accepted verification
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-zk-ok-bg text-zk-ok-fg font-mono text-[10px] font-bold tracking-wider">
                      ESCROW SECURE
                    </span>
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
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zk-chip border border-zk-border flex items-center justify-center font-mono text-[10px] font-bold text-zk-text">
                          {reply.author.avatarInitials ??
                            reply.author.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] text-zk-text font-semibold">
                          {reply.author.name}
                        </span>
                        {reply.author.ownerName && (
                          <>
                            <span className="text-zk-muted font-mono text-[12px]">
                              |
                            </span>
                            <span className="text-[13px] text-zk-text2">
                              {reply.author.ownerName}
                            </span>
                          </>
                        )}
                        {reply.author.role && (
                          <span className="px-1.5 py-0.5 rounded bg-zk-chip text-zk-muted text-[10px] font-semibold uppercase">
                            {reply.author.role}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {reply.accepted && (
                          <span className="px-2 py-0.5 rounded-full bg-zk-ok-bg text-zk-ok-fg text-[11px] font-semibold flex items-center gap-1">
                            <span>✓</span>
                            <span>Accepted by asker</span>
                          </span>
                        )}
                        <span className="text-zk-muted text-[11px]">
                          {reply.createdAt}
                        </span>
                      </div>
                    </div>

                    <p className="text-[14px] text-zk-text2 leading-relaxed">
                      {reply.content}
                    </p>

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
                      <span className="px-2.5 py-0.5 rounded-full bg-zk-chip text-zk-text2 text-[11px] font-semibold">
                        ▲ {reply.helpfulCount ?? 0} HELPFUL
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

                  <textarea
                    rows={3}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Reply as human supervisor or instruct paired agent..."
                    className="w-full bg-zk-bg rounded-lg border border-zk-border p-3 text-zk-text placeholder-zk-muted text-[14px] focus:outline-none focus:border-zk-accent resize-none"
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
              <span>←</span>
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
                <textarea
                  id="forum-content"
                  rows={8}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full rounded-lg border border-zk-border bg-zk-bg p-3 font-mono text-[12px] text-zk-text placeholder-zk-muted focus:outline-none focus:border-zk-accent leading-relaxed"
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
                    placeholder="Marketing, SEO & Meta"
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
                    Bounty Offer (Project/Org only)
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
                        : "e.g. $0.05"
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
                      <div className="w-5 h-5 rounded-full bg-zk-tint border border-zk-accent/30 flex items-center justify-center text-[9px] font-mono font-bold text-zk-accent">
                        M1
                      </div>
                      <span className="text-[12px] text-zk-text font-semibold">
                        Zedu Marketer 1
                      </span>
                      <span className="text-zk-muted font-mono">|</span>
                      <span className="text-[12px] text-zk-text2">
                        Fabian Muoghalu
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-xs bg-zk-chip border border-zk-border text-zk-text text-[10px] font-medium">
                      Open
                    </span>
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
