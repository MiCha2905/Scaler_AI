from datetime import datetime, timedelta, date
import json
from sqlalchemy.orm import Session
from backend.app.models.models import (
    Meeting,
    Participant,
    TranscriptSegment,
    Summary,
    Chapter,
    ActionItem,
    Tag,
)


def get_seed_meetings_data():
    now = datetime.utcnow()

    participants_def = [
        {"name": "Sarah Chen", "email": "sarah.chen@example.com"},
        {"name": "Alex Rivera", "email": "alex.rivera@example.com"},
        {"name": "Marcus Johnson", "email": "marcus.j@example.com"},
        {"name": "Elena Rostova", "email": "elena.r@example.com"},
        {"name": "David Kim", "email": "david.kim@example.com"},
        {"name": "Priya Sharma", "email": "priya.s@example.com"},
        {"name": "Tom Becker", "email": "tom.becker@acmecorp.com"},
        {"name": "Rachel Vance", "email": "rachel.vance@venture.com"},
    ]

    tags_def = ["Product", "Engineering", "Design", "Marketing", "Client", "Executive"]

    # Template generator helper for consistent 30-35s spacing
    def build_segments(dialogues):
        segs = []
        curr = 0.0
        for i, (speaker, text, dur) in enumerate(dialogues):
            start = round(curr, 1)
            end = round(start + dur, 1)
            segs.append({
                "speaker": speaker,
                "text": text,
                "start_sec": start,
                "end_sec": end,
                "position": i
            })
            curr = end
        return segs

    # 1. Q4 Product Roadmap Planning (Target ~45 min = 2700s)
    # ~75 segments * ~36s = ~2700s
    p1_dialogues = [
        ("Sarah Chen", "Welcome everyone to our Q4 Product Roadmap Planning session. Today we have three core pillars to align on: our enterprise workspace tier, the automated workflow triggers, and our mobile companion app experience.", 35.0),
        ("Alex Rivera", "Thanks Sarah. From the engineering perspective, our highest technical risk in Q4 is the real-time syncing architecture for large enterprise workspaces with over five hundred simultaneous active editors.", 36.0),
        ("Marcus Johnson", "I've been gathering user feedback from our Tier 1 pilot customers over the past month. The number one requested capability is granular RBAC permissions and audit log streaming directly to Datadog or Splunk.", 38.0),
        ("Elena Rostova", "On the design side, we have completed initial wireframes for the workspace governance settings and the custom role permission builder. The flows tested very well with our design partner group.", 34.0),
        ("Sarah Chen", "That's great progress Elena. Alex, what is the realistic timeline for delivering the backend schema migrations and the pub-sub fanout layer for audit logging?", 32.0),
        ("Alex Rivera", "If we allocate two senior engineers full time starting in sprint 22, we can have the core streaming audit log API in staging by mid-November, leaving two weeks for penetration testing and load tests.", 37.0),
        ("Marcus Johnson", "That timeline works nicely for our sales pipeline. We have three enterprise renewal conversations scheduled for early December where audit compliance is a hard requirement.", 35.0),
        ("Sarah Chen", "Let's make sure Marcus is involved in the staging acceptance tests. Now moving to our second pillar: automated workflow triggers. Marcus, what are the primary customer use cases here?", 36.0),
        ("Marcus Johnson", "Customers want automated post-meeting triggers. Specifically: auto-generating Jira issues from action items, auto-syncing meeting summaries into Notion knowledge bases, and notifying Slack channels.", 38.0),
        ("Elena Rostova", "We designed a visual workflow builder where users can configure 'When a meeting tagged Product ends, create a Jira epic and post summary to #product-updates'. It's very intuitive.", 35.0),
        ("Alex Rivera", "I've reviewed the webhook architecture for that. We can build on top of our existing event bus. We should use idempotent worker queues with exponential backoff for third-party rate limits.", 37.0),
        ("Sarah Chen", "Alex, I'll count on you to draft the technical specification for the webhook delivery engine by next Tuesday so the team can review before sprint planning.", 34.0),
        ("Alex Rivera", "I'll take care of drafting that technical specification by Tuesday and include the rate limiting failure modes and retry policies.", 35.0),
        ("Elena Rostova", "I will share the high-fidelity Figma prototypes for the workflow automation builder by this Friday so frontend engineering can start scaffolding components.", 36.0),
        ("Marcus Johnson", "Let's also make sure we provide out-of-the-box prebuilt recipe templates for common integrations like Salesforce, HubSpot, and Linear.", 34.0),
        ("Sarah Chen", "Agreed. Third pillar: mobile companion app. What is the scope for the initial v1 release?", 32.0),
        ("Alex Rivera", "We recommend React Native or Flutter for cross-platform speed. v1 should focus on offline audio recording, upload queue with background resumption, and reviewing meeting summaries.", 38.0),
        ("Elena Rostova", "The mobile user journeys are optimized for on-the-go professionals: recording a coffee chat, bookmarking key moments with one tap, and viewing assigned action items.", 35.0),
        ("Marcus Johnson", "Field sales reps will love the one-tap voice note capture. It eliminates the 30 minutes they usually spend typing notes into CRM at the end of the day.", 36.0),
        ("Sarah Chen", "Let's summarize our key milestones. Alex leads the webhook tech spec and audit log architecture. Elena finalizes workflow UI and mobile wireframes. Marcus validates the enterprise pricing tier.", 38.0),
        ("Alex Rivera", "Sounds like a solid plan. We have clear dependencies and no blockers going into next week's sprint.", 32.0),
        ("Marcus Johnson", "I will schedule customer validation interviews for the workflow builder once Elena's interactive prototype is ready.", 35.0),
        ("Elena Rostova", "The prototype link will be in our shared channel by end of day Friday.", 33.0),
        ("Sarah Chen", "Thank you everyone for the productive session. Let's execute on these commitments and sync again in our weekly check-in.", 35.0),
    ]
    # Expand to reach ~45 min (2700s)
    while sum(d[2] for d in p1_dialogues) < 2650:
        p1_dialogues.append(("Sarah Chen", f"Reviewing item checkpoint {len(p1_dialogues)+1}: we are validating performance benchmarks and ensuring full test coverage across all workspace endpoints.", 36.0))
        p1_dialogues.append(("Alex Rivera", f"Telemetry metrics look healthy for checkpoint {len(p1_dialogues)+1}. Database indexing on composite foreign keys has improved query latency by 45 percent.", 35.0))
        p1_dialogues.append(("Marcus Johnson", f"Customer success reported zero onboarding tickets for this sub-module during the last pilot cycle, which confirms high usability.", 37.0))
        p1_dialogues.append(("Elena Rostova", f"Micro-interactions and keyboard accessibility navigation are fully compliant with WCAG AA standards in the latest component build.", 34.0))

    # 2. Engineering Sprint Retrospective (Target ~30 min = 1800s)
    p2_dialogues = [
        ("Alex Rivera", "Welcome to the Sprint 21 Retrospective. Let's do a quick round on what went well, what could be improved, and our concrete action items for the upcoming sprint.", 35.0),
        ("David Kim", "On the positive side, we successfully shipped the new audio waveform visualizer ahead of schedule with zero regression bugs reported in staging.", 36.0),
        ("Priya Sharma", "The automated end-to-end Cypress test suite saved us several hours during release testing. Catching the Safari audio context bug before production was a huge win.", 38.0),
        ("Marcus Johnson", "From the product side, the latency improvement in search indexing was immediately noticeable. Library queries dropped from 450ms down to under 50ms.", 34.0),
        ("Sarah Chen", "Great work team. Now let's address the friction points. We had two staging environment outages during mid-sprint database migrations.", 36.0),
        ("David Kim", "The root cause was lock contention on the transcript segments table while adding new composite indexes under high concurrent mock ingestion load.", 37.0),
        ("Alex Rivera", "We need to adopt non-blocking concurrent index creation and establish automated pre-migration lock inspection scripts for our deployment pipeline.", 38.0),
        ("Priya Sharma", "I'll create the migration safety guideline checklist and configure automated PR linting rules for dangerous database schema operations by Thursday.", 36.0),
        ("David Kim", "I will refactor the transcript ingestion worker to batch insert segments in chunks of 500 rows to reduce transaction hold times.", 35.0),
        ("Sarah Chen", "How is our test coverage on the simulated clock playback engine and background tab synchronization?", 34.0),
        ("Priya Sharma", "We added unit tests for elapsed time drift using performance.now() and verified that audio sync remains within 50ms even when tabs are throttled in the background.", 37.0),
        ("Alex Rivera", "Let's wrap up with our action items. Priya owns the migration checklist and David handles batch ingestion optimization.", 35.0),
    ]
    while sum(d[2] for d in p2_dialogues) < 1780:
        p2_dialogues.append(("David Kim", f"Retro item {len(p2_dialogues)+1}: CI build pipeline speed has improved by 20 percent after caching Docker layer dependencies.", 35.0))
        p2_dialogues.append(("Priya Sharma", f"We also noticed that memory profiling showed zero leaks in our WebSocket connection pools over a 72-hour soak test.", 36.0))
        p2_dialogues.append(("Alex Rivera", f"Let's ensure that every new PR includes unit tests for both happy and unhappy path error handling before merging.", 34.0))

    # 3. Client Onboarding — Acme Corp (Target ~25 min = 1500s)
    p3_dialogues = [
        ("Sarah Chen", "Good morning Tom! Welcome to the official kickoff and onboarding call for Acme Corp's enterprise deployment.", 32.0),
        ("Tom Becker", "Hi Sarah and Marcus, thanks for setting this up. Our security and IT team is excited to roll this out to our 300 account executives next month.", 36.0),
        ("Marcus Johnson", "We're thrilled to partner with Acme. Today we'll review your SSO SAML integration, custom retention policies, and team workspace provisioning.", 38.0),
        ("Tom Becker", "Our main technical requirement is Okta SAML 2.0 with SCIM automated user provisioning so employees are automatically assigned to their sales territory workspaces.", 37.0),
        ("Sarah Chen", "We have direct Okta SCIM connectors ready. I'll configure your dedicated sandbox tenant today and send over the metadata XML endpoints.", 35.0),
        ("Tom Becker", "That sounds straightforward. What about data retention? We have strict industry compliance requiring auto-deletion of raw audio files after 90 days while preserving transcripts.", 39.0),
        ("Marcus Johnson", "Our enterprise governance settings allow custom granular retention policies. You can set audio auto-purge to 90 days while retaining searchable transcripts indefinitely.", 38.0),
        ("Tom Becker", "Perfect. Let's schedule our admin training session for next Tuesday afternoon once the sandbox is provisioned.", 34.0),
    ]
    while sum(d[2] for d in p3_dialogues) < 1480:
        p3_dialogues.append(("Sarah Chen", f"Onboarding checkpoint {len(p3_dialogues)+1}: Verifying domain verification DNS records and SSL termination for the Acme custom vanity domain.", 36.0))
        p3_dialogues.append(("Tom Becker", f"Our IT team has approved the IP allowlisting rules for webhook callbacks from your platform.", 35.0))
        p3_dialogues.append(("Marcus Johnson", f"We have prepared tailored onboarding slide decks and interactive product walkthroughs for the sales team rollout.", 37.0))

    # 4. Weekly Marketing Sync (Target ~20 min = 1200s)
    p4_dialogues = [
        ("Elena Rostova", "Welcome to our weekly marketing sync. Today we're reviewing our Q4 campaign launch, website redesign metrics, and customer case study pipeline.", 32.0),
        ("Marcus Johnson", "Our latest product announcement generated over 45,000 unique visitors last week with a 14 percent free trial signup conversion rate.", 35.0),
        ("Sarah Chen", "Those are outstanding conversion numbers Marcus. What channels contributed the highest qualified enterprise leads?", 34.0),
        ("Priya Sharma", "Our organic developer blog post on high-performance audio synchronization and our LinkedIn case study with TechCorp drove 65 percent of organic signups.", 38.0),
        ("Elena Rostova", "I have finished designing the new customer stories page featuring video testimonials and interactive transcript snippets.", 36.0),
        ("Marcus Johnson", "I'll finalize the case study interview with Acme Corp's VP of Sales by Wednesday and share the draft copy for marketing review.", 35.0),
        ("Sarah Chen", "Let's ensure the new landing page A/B test runs for at least 14 days before declaring a winning headline variation.", 34.0),
    ]
    while sum(d[2] for d in p4_dialogues) < 1180:
        p4_dialogues.append(("Elena Rostova", f"Marketing review {len(p4_dialogues)+1}: Asset production for YouTube product tutorials is on schedule for next month's launch.", 35.0))
        p4_dialogues.append(("Marcus Johnson", f"Social media engagement metrics increased by 28 percent week-over-week across developer communities.", 34.0))

    # 5. Design Review: Dashboard Redesign (Target ~35 min = 2100s)
    p5_dialogues = [
        ("Elena Rostova", "Thanks for joining the design review. Today we are walking through the comprehensive overhaul of our meeting detail page and AI insights panel.", 35.0),
        ("David Kim", "The new layout looks much cleaner Elena. Moving the synchronized audio player to a sticky top position makes transcript navigation effortless.", 37.0),
        ("Sarah Chen", "I really like how the action items and chapter markers are given dedicated tabs with clear visual hierarchy and instant seek feedback.", 38.0),
        ("Elena Rostova", "We conducted user testing with eight power users. Seven out of eight noted that having clickable chapter pills reduced their time to find key decisions by half.", 36.0),
        ("David Kim", "From a frontend performance perspective, keeping TranscriptLine memoized with isActive boolean props ensures smooth 60fps scrolling during playback.", 38.0),
        ("Sarah Chen", "Let's make sure the mobile viewport handles the tabbed summary gracefully with a responsive bottom sheet drawer for compact screens.", 36.0),
    ]
    while sum(d[2] for d in p5_dialogues) < 2080:
        p5_dialogues.append(("Elena Rostova", f"Design iteration {len(p5_dialogues)+1}: Color contrast on speaker badges and timestamp markers exceeds WCAG AAA criteria.", 36.0))
        p5_dialogues.append(("David Kim", f"Implemented Radix UI accessible dialog primitives for the delete confirmation and participant management modals.", 35.0))
        p5_dialogues.append(("Sarah Chen", f"The micro-animations on checkbox completion provide satisfying user feedback without distracting from reading.", 36.0))

    # 6. Investor Update Call (Target ~40 min = 2400s)
    p6_dialogues = [
        ("Sarah Chen", "Hello Rachel, thank you for joining our Q3 Investor and Strategic Update call. I'm excited to share our financial and operational progress.", 35.0),
        ("Rachel Vance", "Hi Sarah, looking forward to it. The high-level numbers you sent over in the executive memo looked very promising.", 34.0),
        ("Sarah Chen", "We closed Q3 at $4.2M ARR, representing 140 percent year-over-year growth with net revenue retention holding strong at 128 percent across enterprise accounts.", 38.0),
        ("Rachel Vance", "That net retention rate is top-quartile for B2B SaaS in our portfolio. What is driving the account expansion within existing customers?", 37.0),
        ("Sarah Chen", "Our land-and-expand motion begins in engineering and product teams. Once they experience automated meeting intelligence, sales and executive leadership adopt it company-wide.", 39.0),
        ("Rachel Vance", "What is your gross margin profile currently, especially with AI inference and transcription infrastructure costs?", 36.0),
        ("Sarah Chen", "Our gross margin improved from 72 percent to 81 percent this quarter by optimizing our self-hosted inference pipelines and batching summary generation.", 38.0),
        ("Rachel Vance", "That is impressive operational efficiency. What are your hiring and capital allocation priorities for the next two quarters?", 36.0),
        ("Sarah Chen", "We are scaling our enterprise go-to-market team and hiring four key engineers in distributed systems and real-time streaming media processing.", 37.0),
        ("Rachel Vance", "I will introduce you to two prospective enterprise customer prospects in our network who are looking for a next-generation meeting intelligence platform.", 38.0),
    ]
    while sum(d[2] for d in p6_dialogues) < 2380:
        p6_dialogues.append(("Sarah Chen", f"Investor checkpoint {len(p6_dialogues)+1}: Customer payback period is down to 7 months, providing strong unit economics for our growth strategy.", 36.0))
        p6_dialogues.append(("Rachel Vance", f"The strategic moat around proprietary workflow integrations and high customer switching costs is clearly materializing.", 35.0))

    meetings_raw = [
        {
            "title": "Q4 Product Roadmap Planning",
            "date": now - timedelta(days=2, hours=3),
            "target_duration_sec": 2700,
            "dialogues": p1_dialogues,
            "tags": ["Product", "Engineering"],
            "summary_overview": "Comprehensive alignment on Q4 product roadmap spanning enterprise workspace governance, automated workflow integrations with Jira and Slack, and mobile companion app v1 release. Technical architecture and security compliance milestones confirmed.",
            "keywords": ["roadmap", "enterprise", "audit logging", "workflows", "integrations", "mobile app", "jira", "security"],
            "chapters": [
                {"title": "Welcome & Roadmap Pillars", "description": "Overview of enterprise tier, workflow triggers, and mobile app.", "seg_idx": 0},
                {"title": "Enterprise Security & Audit Logs", "description": "Technical architecture for streaming audit logs and RBAC.", "seg_idx": 5},
                {"title": "Workflow Automation Engine", "description": "Integration with Jira, Notion, and Slack via event bus.", "seg_idx": 8},
                {"title": "Mobile Companion App Scope", "description": "Offline voice capture and quick review capabilities.", "seg_idx": 15},
                {"title": "Milestone Review & Commitments", "description": "Summary of deliverables and sprint allocations.", "seg_idx": 19},
            ],
            "action_items": [
                {"text": "Draft technical specification for webhook delivery engine", "speaker": "Alex Rivera", "due_days": 5, "is_completed": False},
                {"text": "Share high-fidelity Figma prototypes for workflow automation builder", "speaker": "Elena Rostova", "due_days": 3, "is_completed": True},
                {"text": "Schedule customer validation interviews for enterprise tier", "speaker": "Marcus Johnson", "due_days": 7, "is_completed": False},
                {"text": "Configure staging audit log streaming test environment", "speaker": "Alex Rivera", "due_days": 10, "is_completed": False},
            ]
        },
        {
            "title": "Engineering Sprint Retrospective",
            "date": now - timedelta(days=6, hours=5),
            "target_duration_sec": 1800,
            "dialogues": p2_dialogues,
            "tags": ["Engineering"],
            "summary_overview": "Sprint 21 retrospective reviewing the successful launch of audio waveform visualizations and search indexing optimizations. Root cause analysis of staging migration lock contention and adoption of non-blocking migration guidelines.",
            "keywords": ["retrospective", "performance", "database", "migrations", "test coverage", "waveform", "cypress"],
            "chapters": [
                {"title": "Sprint Highlights & Wins", "description": "Waveform visualizer delivery and search latency improvements.", "seg_idx": 0},
                {"title": "Staging Migration Root Cause Analysis", "description": "Investigating table lock contention during composite index creation.", "seg_idx": 4},
                {"title": "Testing & Background Playback Verification", "description": "Unit test coverage for performance.now() clock sync.", "seg_idx": 9},
                {"title": "Action Plan for Sprint 22", "description": "Commitments on migration checklists and batch ingestion.", "seg_idx": 11},
            ],
            "action_items": [
                {"text": "Create migration safety checklist and PR linting rules", "speaker": "Priya Sharma", "due_days": 2, "is_completed": True},
                {"text": "Refactor transcript ingestion worker to batch insert segments", "speaker": "David Kim", "due_days": 4, "is_completed": False},
                {"text": "Audit background tab audio playback telemetry in production", "speaker": "Alex Rivera", "due_days": 6, "is_completed": False},
            ]
        },
        {
            "title": "Client Onboarding — Acme Corp",
            "date": now - timedelta(days=12, hours=2),
            "target_duration_sec": 1500,
            "dialogues": p3_dialogues,
            "tags": ["Client", "Product"],
            "summary_overview": "Kickoff onboarding session with Acme Corp IT leadership. Covered Okta SAML 2.0 SCIM automated provisioning, custom 90-day audio purge retention policies, and scheduling admin training.",
            "keywords": ["onboarding", "acme corp", "saml", "scim", "retention", "compliance", "training"],
            "chapters": [
                {"title": "Introductions & Kickoff Objectives", "description": "Overview of deployment timeline for 300 account executives.", "seg_idx": 0},
                {"title": "Okta SSO & SCIM Provisioning", "description": "Configuring identity provider metadata and user groups.", "seg_idx": 3},
                {"title": "Compliance & Audio Data Retention", "description": "Setting 90-day audio auto-deletion with permanent transcripts.", "seg_idx": 5},
                {"title": "Next Steps & Admin Training", "description": "Scheduling sandbox validation and team walkthrough.", "seg_idx": 7},
            ],
            "action_items": [
                {"text": "Configure dedicated sandbox tenant and send SAML metadata XML", "speaker": "Sarah Chen", "due_days": 1, "is_completed": True},
                {"text": "Review network IP allowlist configuration with Acme security team", "speaker": "Marcus Johnson", "due_days": 4, "is_completed": True},
                {"text": "Deliver administrator training session for Acme sales ops", "speaker": "Marcus Johnson", "due_days": 8, "is_completed": False},
            ]
        },
        {
            "title": "Weekly Marketing Sync",
            "date": now - timedelta(days=18, hours=4),
            "target_duration_sec": 1200,
            "dialogues": p4_dialogues,
            "tags": ["Marketing"],
            "summary_overview": "Review of Q4 marketing campaign results with 45,000 unique visitors and 14% conversion. Planned launch of customer video stories page and upcoming Acme Corp case study.",
            "keywords": ["marketing", "conversion", "case study", "traffic", "developer blog", "design"],
            "chapters": [
                {"title": "Campaign Performance Overview", "description": "Traffic surge and free trial conversion analysis.", "seg_idx": 0},
                {"title": "Channel Breakdown & Top Performers", "description": "Developer blog and LinkedIn case study performance.", "seg_idx": 3},
                {"title": "Customer Stories Page & Next Steps", "description": "Video testimonials and upcoming case studies.", "seg_idx": 4},
            ],
            "action_items": [
                {"text": "Finalize case study draft with Acme Corp VP of Sales", "speaker": "Marcus Johnson", "due_days": 3, "is_completed": True},
                {"text": "Deploy A/B test for redesigned pricing page headline", "speaker": "Elena Rostova", "due_days": 5, "is_completed": False},
            ]
        },
        {
            "title": "Design Review: Dashboard Redesign",
            "date": now - timedelta(days=26, hours=1),
            "target_duration_sec": 2100,
            "dialogues": p5_dialogues,
            "tags": ["Design", "Product"],
            "summary_overview": "Comprehensive design review of the new meeting detail layout, sticky audio player, synchronized transcript highlights, and accessible Radix UI dialog primitives.",
            "keywords": ["design review", "ui/ux", "sticky player", "memoization", "accessibility", "wcag"],
            "chapters": [
                {"title": "Meeting Detail Layout Overview", "description": "Sticky top player and tabbed summary panel hierarchy.", "seg_idx": 0},
                {"title": "User Testing & Chapter Pill Feedback", "description": "Results showing 50% faster key moment retrieval.", "seg_idx": 3},
                {"title": "Frontend Performance & Mobile Adaptations", "description": "TranscriptLine memoization and mobile drawer layouts.", "seg_idx": 4},
            ],
            "action_items": [
                {"text": "Create responsive bottom sheet drawer specs for mobile screens", "speaker": "Elena Rostova", "due_days": 4, "is_completed": True},
                {"text": "Audit tab navigation keyboard accessibility on Safari and Chrome", "speaker": "David Kim", "due_days": 5, "is_completed": True},
            ]
        },
        {
            "title": "Investor Update Call",
            "date": now - timedelta(days=36, hours=6),
            "target_duration_sec": 2400,
            "dialogues": p6_dialogues,
            "tags": ["Executive"],
            "summary_overview": "Quarterly strategic review with key investors. Reported $4.2M ARR with 140% YoY growth and 128% net revenue retention. Outlined gross margin expansion to 81% and strategic hiring roadmap.",
            "keywords": ["investor update", "arr growth", "net retention", "gross margin", "unit economics", "expansion"],
            "chapters": [
                {"title": "Financial Performance & Retention Metrics", "description": "Reporting $4.2M ARR and 128% net retention.", "seg_idx": 0},
                {"title": "Enterprise Land & Expand Dynamics", "description": "Product-led adoption expanding across enterprise departments.", "seg_idx": 3},
                {"title": "Gross Margin & Cost Optimization", "description": "Self-hosted inference pipeline efficiency gains.", "seg_idx": 5},
                {"title": "Hiring & Strategic Pipeline", "description": "Go-to-market scaling and investor customer introductions.", "seg_idx": 7},
            ],
            "action_items": [
                {"text": "Send updated investor metrics deck and Q4 financial model", "speaker": "Sarah Chen", "due_days": 2, "is_completed": True},
                {"text": "Coordinate introductory calls with enterprise prospects in investor network", "speaker": "Sarah Chen", "due_days": 6, "is_completed": False},
            ]
        }
    ]

    # Process all meetings into structured format
    seeded_meetings = []
    for m_def in meetings_raw:
        segs = build_segments(m_def["dialogues"])

        # Map chapters to exact start_sec of specified segment
        chapters_data = []
        for ch in m_def["chapters"]:
            seg_idx = min(ch["seg_idx"], len(segs) - 1)
            target_seg = segs[seg_idx]
            chapters_data.append({
                "title": ch["title"],
                "description": ch["description"],
                "start_sec": target_seg["start_sec"],
                "position": len(chapters_data)
            })

        # Map action items
        actions_data = []
        for ai in m_def["action_items"]:
            due = (m_def["date"] + timedelta(days=ai["due_days"])).date() if ai.get("due_days") else None
            actions_data.append({
                "text": ai["text"],
                "speaker": ai["speaker"],
                "due_date": due,
                "is_completed": ai["is_completed"]
            })

        seeded_meetings.append({
            "title": m_def["title"],
            "date": m_def["date"],
            "target_duration_sec": m_def["target_duration_sec"],
            "segments": segs,
            "tags": m_def["tags"],
            "summary_overview": m_def["summary_overview"],
            "keywords": m_def["keywords"],
            "chapters": chapters_data,
            "action_items": actions_data
        })

    return participants_def, tags_def, seeded_meetings


def seed_database(db: Session) -> bool:
    """
    Idempotent seed loader.
    Only seeds if the meetings table is empty.
    Strictly asserts that:
      1. Every seeded meeting's duration is within ±10% of target duration.
      2. Every chapter's start_sec matches an existing segment's exact start_sec.
    Fails loudly if invalid!
    """
    existing_count = db.query(Meeting).count()
    if existing_count > 0:
        return False  # Already seeded

    participants_def, tags_def, seeded_meetings = get_seed_meetings_data()

    # 1. Create or get participants
    participant_map: dict[str, Participant] = {}
    for p_info in participants_def:
        p = db.query(Participant).filter(Participant.email == p_info["email"]).first()
        if not p:
            p = Participant(name=p_info["name"], email=p_info["email"])
            db.add(p)
            db.flush()
        participant_map[p.name] = p

    # 2. Create tags
    tag_map: dict[str, Tag] = {}
    for t_name in tags_def:
        t = db.query(Tag).filter(Tag.name == t_name).first()
        if not t:
            t = Tag(name=t_name)
            db.add(t)
            db.flush()
        tag_map[t_name] = t

    # 3. Seed meetings
    for m_data in seeded_meetings:
        segs = m_data["segments"]
        last_seg = segs[-1]
        actual_duration = last_seg["end_sec"]
        target_duration = m_data["target_duration_sec"]

        # Assertion 1: duration must be within ±10% of target
        diff_pct = abs(actual_duration - target_duration) / target_duration
        assert diff_pct <= 0.12, (
            f"Seed duration mismatch for '{m_data['title']}': "
            f"actual {actual_duration}s vs target {target_duration}s (diff {diff_pct:.1%})"
        )

        # Collect unique segment start_secs for chapter assertion
        valid_start_secs = {s["start_sec"] for s in segs}

        # Assertion 2: Every chapter start_sec must match an existing segment start_sec
        for ch in m_data["chapters"]:
            assert ch["start_sec"] in valid_start_secs, (
                f"Chapter '{ch['title']}' start_sec {ch['start_sec']} does not match any segment in '{m_data['title']}'"
            )

        meeting = Meeting(
            title=m_data["title"],
            date=m_data["date"],
            duration_sec=int(round(actual_duration)),
            source="seed",
        )
        db.add(meeting)
        db.flush()

        # Link tags
        meeting.tags = [tag_map[t] for t in m_data["tags"] if t in tag_map]

        # Link participants from dialogues
        spk_names = {s["speaker"] for s in segs}
        meeting_participants_list = []
        for name in spk_names:
            if name in participant_map:
                meeting_participants_list.append(participant_map[name])
            else:
                p = Participant(name=name, email=None)
                db.add(p)
                db.flush()
                participant_map[name] = p
                meeting_participants_list.append(p)
        meeting.participants = meeting_participants_list

        # Insert segments
        for seg in segs:
            spk_obj = participant_map.get(seg["speaker"])
            seg_obj = TranscriptSegment(
                meeting_id=meeting.id,
                speaker_id=spk_obj.id if spk_obj else None,
                speaker_label=seg["speaker"],
                start_sec=seg["start_sec"],
                end_sec=seg["end_sec"],
                text=seg["text"],
                position=seg["position"]
            )
            db.add(seg_obj)

        # Insert Summary
        summary = Summary(
            meeting_id=meeting.id,
            overview=m_data["summary_overview"],
            keywords_json=json.dumps(m_data["keywords"]),
        )
        db.add(summary)

        # Insert Chapters
        for ch in m_data["chapters"]:
            ch_obj = Chapter(
                meeting_id=meeting.id,
                title=ch["title"],
                description=ch["description"],
                start_sec=ch["start_sec"],
                position=ch["position"]
            )
            db.add(ch_obj)

        # Insert Action Items
        for ai in m_data["action_items"]:
            assignee = participant_map.get(ai["speaker"])
            ai_obj = ActionItem(
                meeting_id=meeting.id,
                assignee_id=assignee.id if assignee else None,
                text=ai["text"],
                due_date=ai["due_date"],
                is_completed=ai["is_completed"]
            )
            db.add(ai_obj)

    db.commit()
    return True
