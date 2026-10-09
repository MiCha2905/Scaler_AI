"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MeetingFormModal } from "@/components/meetings/MeetingFormModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [newMeetingModalOpen, setNewMeetingModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <Sidebar
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenNewMeeting={() => setNewMeetingModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNewMeeting={() => setNewMeetingModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global New Meeting Modal */}
      <MeetingFormModal
        isOpen={newMeetingModalOpen}
        onClose={() => setNewMeetingModalOpen(false)}
        onSuccess={() => {
          setNewMeetingModalOpen(false);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("meeting_created"));
          }
        }}
      />
    </div>
  );
}
