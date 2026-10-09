from datetime import datetime
from sqlalchemy import (
    Table, Column, Integer, String, Float, DateTime, Date, Boolean,
    ForeignKey, Text, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

# Association Tables
meeting_participants = Table(
    "meeting_participants",
    Base.metadata,
    Column("meeting_id", Integer, ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("participant_id", Integer, ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True),
    Index("idx_mp_participant", "participant_id")
)

meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", Integer, ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
)


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    duration_sec = Column(Integer, nullable=False, default=0)
    audio_url = Column(String(512), nullable=True)
    source = Column(String(50), nullable=False, default="manual")  # 'seed' | 'manual' | 'upload'
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    participants = relationship(
        "Participant",
        secondary=meeting_participants,
        back_populates="meetings",
        lazy="selectin"
    )
    transcript_segments = relationship(
        "TranscriptSegment",
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TranscriptSegment.position",
        lazy="selectin"
    )
    summary = relationship(
        "Summary",
        back_populates="meeting",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin"
    )
    chapters = relationship(
        "Chapter",
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Chapter.position",
        lazy="selectin"
    )
    action_items = relationship(
        "ActionItem",
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ActionItem.id",
        lazy="selectin"
    )
    tags = relationship(
        "Tag",
        secondary=meeting_tags,
        back_populates="meetings",
        lazy="selectin"
    )
    comments = relationship(
        "Comment",
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin"
    )

    __table_args__ = (
        Index("idx_meetings_date", "date"),
    )


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=True)

    meetings = relationship(
        "Meeting",
        secondary=meeting_participants,
        back_populates="participants"
    )
    spoken_segments = relationship(
        "TranscriptSegment",
        back_populates="speaker"
    )
    assigned_actions = relationship(
        "ActionItem",
        back_populates="assignee"
    )


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    speaker_id = Column(Integer, ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    speaker_label = Column(String(255), nullable=False)
    start_sec = Column(Float, nullable=False)
    end_sec = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    position = Column(Integer, nullable=False)

    meeting = relationship("Meeting", back_populates="transcript_segments")
    speaker = relationship("Participant", back_populates="spoken_segments", lazy="selectin")
    comments = relationship("Comment", back_populates="segment", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (
        CheckConstraint("end_sec >= start_sec", name="check_end_gte_start"),
        Index("idx_segments_meeting_time", "meeting_id", "start_sec"),
        Index("idx_segments_meeting_pos", "meeting_id", "position"),
    )


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), unique=True, nullable=False)
    overview = Column(Text, nullable=True)
    keywords_json = Column(Text, nullable=True)  # JSON serialized string: '["term1", "term2"]'
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="summary")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_sec = Column(Float, nullable=False)
    position = Column(Integer, nullable=False)

    meeting = relationship("Meeting", back_populates="chapters")

    __table_args__ = (
        Index("idx_chapters_meeting", "meeting_id", "position"),
    )


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    text = Column(Text, nullable=False)
    due_date = Column(Date, nullable=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="action_items")
    assignee = relationship("Participant", back_populates="assigned_actions", lazy="selectin")

    __table_args__ = (
        Index("idx_actions_meeting", "meeting_id"),
    )


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)

    meetings = relationship("Meeting", secondary=meeting_tags, back_populates="tags")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    segment_id = Column(Integer, ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=False)
    body = Column(Text, nullable=False)
    kind = Column(String(50), nullable=False, default="comment")  # 'comment' | 'highlight' | 'soundbite'
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="comments")
    segment = relationship("TranscriptSegment", back_populates="comments")

    __table_args__ = (
        Index("idx_comments_meeting", "meeting_id"),
    )
