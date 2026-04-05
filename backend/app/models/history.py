from sqlalchemy import Column, Integer, String, Text
from app.db.database import Base


class PaperHistory(Base):
    __tablename__ = "paper_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    title = Column(String, nullable=True)
    summary = Column(Text, nullable=True)


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)