"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Calendar, Users, Tag as TagIcon, X, ArrowUpDown, ChevronDown } from "lucide-react";
import { Participant, Tag } from "@/types/api";

interface FilterState {
  q: string;
  participantId?: number;
  tagName?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  sort: string;
}

interface MeetingFiltersProps {
  participants: Participant[];
  tags: Tag[];
  onFilterChange: (filters: {
    q?: string;
    participant_id?: number;
    tag?: string;
    date_from?: string; // UTC ISO string
    date_to?: string;   // UTC ISO string
    sort?: string;
  }) => void;
}

export function MeetingFilters({ participants, tags, onFilterChange }: MeetingFiltersProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sort, setSort] = useState<string>("date_desc");

  // Debounced search term trigger (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      applyFilters();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedParticipant, selectedTag, dateFrom, dateTo, sort]);

  const applyFilters = () => {
    let utcDateFrom: string | undefined = undefined;
    let utcDateTo: string | undefined = undefined;
    if (dateFrom) {
      const localStart = new Date(`${dateFrom}T00:00:00`);
      utcDateFrom = localStart.toISOString();
    }
    if (dateTo) {
      const localEnd = new Date(`${dateTo}T23:59:59.999`);
      utcDateTo = localEnd.toISOString();
    }

    onFilterChange({
      q: searchTerm.trim() || undefined,
      participant_id: selectedParticipant ? Number(selectedParticipant) : undefined,
      tag: selectedTag || undefined,
      date_from: utcDateFrom,
      date_to: utcDateTo,
      sort: sort || "date_desc",
    });
  };

  const hasActiveFilters = Boolean(
    searchTerm || selectedParticipant || selectedTag || dateFrom || dateTo || sort !== "date_desc"
  );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedParticipant("");
    setSelectedTag("");
    setDateFrom("");
    setDateTo("");
    setSort("date_desc");
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-6 space-y-3">
      {/* Top Row: Search & Sort */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search meetings by title or transcript content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border/80 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs font-medium rounded-xl border border-border/80 bg-background text-foreground hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none cursor-pointer"
            >
              <option value="date_desc" className="bg-card text-foreground">Most Recent</option>
              <option value="date_asc" className="bg-card text-foreground">Oldest First</option>
              <option value="title" className="bg-card text-foreground">Title (A-Z)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Row: Participants, Tags, Date Range */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Participant Filter */}
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Users className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          </div>
          <select
            value={selectedParticipant}
            onChange={(e) => setSelectedParticipant(e.target.value)}
            className="pl-8 pr-8 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background dark:bg-[#181537] text-slate-800 dark:text-slate-100 hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none cursor-pointer transition-colors shadow-sm"
          >
            <option value="" className="bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 font-medium">
              All Participants
            </option>
            {participants.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 font-medium">
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Tag Filter */}
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <TagIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          </div>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="pl-8 pr-8 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background dark:bg-[#181537] text-slate-800 dark:text-slate-100 hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none cursor-pointer transition-colors shadow-sm"
          >
            <option value="" className="bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 font-medium">
              All Tags
            </option>
            {tags.map((t) => (
              <option key={t.id} value={t.name} className="bg-white dark:bg-[#181537] text-slate-900 dark:text-slate-100 font-medium">
                #{t.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Date From */}
        <div className="flex items-center gap-1.5 text-xs text-foreground bg-background dark:bg-[#181537] border border-border rounded-lg px-2.5 py-1 shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span className="text-[10px] uppercase font-bold text-muted-foreground">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1.5 text-xs text-foreground bg-background dark:bg-[#181537] border border-border rounded-lg px-2.5 py-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
