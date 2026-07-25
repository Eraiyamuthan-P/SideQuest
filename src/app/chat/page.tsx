'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface InboxItem {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  otherUser: {
    id: string;
    username: string;
    verified: boolean;
  };
  lastMessage: {
    content: string;
    created_at: string;
    senderId: string;
  } | null;
}

interface Message {
  id: string;
  content: string;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
  sender_id: string;
  sender: {
    username: string;
  };
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetTaskId = searchParams.get('taskId');

  // Inbox & Active Chat states
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [activeItem, setActiveItem] = useState<InboxItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  // UX states
  const [inboxLoading, setInboxLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Message inputs
  const [textInput, setTextInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch session user
  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        router.push('/auth');
      }
    };
    fetchSession();
  }, [router]);

  // Clear active chat status in database on unmount
  useEffect(() => {
    return () => {
      fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeChatTaskId: null }),
      }).catch((err) => console.error('Failed to clear active chat session:', err));
    };
  }, []);

  // Fetch inbox items
  const loadInbox = async (selectTaskId?: string) => {
    setInboxLoading(true);
    try {
      const res = await fetch('/api/chat/inbox');
      const data = await res.json();
      if (res.ok) {
        setInbox(data.inbox || []);
        
        // If there's a deep-linked taskId or specified taskId, auto-select it
        const targetId = selectTaskId || targetTaskId;
        if (targetId && data.inbox) {
          const matched = data.inbox.find((item: InboxItem) => item.taskId === targetId);
          if (matched) {
            setActiveItem(matched);
          }
        }
      }
    } catch (err) {
      console.error('Error loading inbox:', err);
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, [targetTaskId]);

  // Fetch messages when active item changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeItem) return;
      setChatLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/chat/${activeItem.taskId}`);
        const data = await res.json();
        if (res.ok) {
          setMessages(data.messages || []);
        } else {
          setError(data.error || 'Failed to load messages.');
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to fetch conversation logs.');
      } finally {
        setChatLoading(false);
      }
    };

    loadMessages();
    
    // Setup interval for polling new messages (simple realtime sync fallback)
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [activeItem]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Send Message
  const handleSendMessage = async (text: string, fileUrl?: string, fileType?: string) => {
    if (!activeItem || (!text.trim() && !fileUrl)) return;
    setSendLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/chat/${activeItem.taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text.trim(),
          attachment_url: fileUrl || null,
          attachment_type: fileType || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      // Add message locally to speed up UI
      setMessages((prev) => [...prev, data.message]);
      setTextInput('');
      
      // Reload inbox to refresh previews
      loadInbox(activeItem.taskId);
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSendLoading(false);
    }
  };

  // Handle Attachment Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItem) return;

    setError('');
    const isImage = file.type.startsWith('image/');
    
    // File validation limits
    if (isImage && file.size > 5 * 1024 * 1024) {
      setError('Images are restricted to 5MB.');
      return;
    }
    if (!isImage && file.size > 10 * 1024 * 1024) {
      setError('Documents are restricted to 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setSendLoading(true);
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Upload failed.');
      }

      // Send the uploaded attachment as a message
      await handleSendMessage(`Uploaded attachment: ${file.name}`, uploadData.url, file.type);
    } catch (err: any) {
      setError(err.message || 'File sharing failed.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleQuickReply = (text: string) => {
    handleSendMessage(text);
  };

  const isChatLocked = activeItem 
    ? activeItem.taskStatus === 'completed' || activeItem.taskStatus === 'cancelled'
    : false;

  return (
    <div className="page-container animate-fade-in" style={{
      maxWidth: '1200px',
      height: 'calc(100vh - 80px)',
      display: 'flex',
      gap: '1.5rem',
      paddingTop: '1.5rem',
      paddingBottom: '1.5rem',
    }}>
      
      {/* 1. Inbox Sidebar */}
      <div className="glass-panel" style={{
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Inbox</h2>
        </div>

        {inboxLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} className="animate-pulse-slow">Loading inbox...</p>
          </div>
        ) : inbox.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {inbox.map((item) => {
              const isActive = activeItem?.taskId === item.taskId;
              return (
                <div
                  key={item.taskId}
                  onClick={() => {
                    setActiveItem(item);
                    setError('');
                  }}
                  style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isActive ? '#ffffff' : 'var(--text-primary)' }}>
                      @{item.otherUser.username}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      background: item.taskStatus === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: item.taskStatus === 'completed' ? 'var(--success)' : 'var(--warning)',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '50px',
                    }}>
                      {item.taskStatus}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🛡️ {item.taskTitle}
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.lastMessage ? item.lastMessage.content : 'No messages yet.'}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Your inbox is empty. Assign someone or get assigned to a task to start chatting!
            </p>
          </div>
        )}
      </div>

      {/* 2. Message Thread Panel */}
      <div className="glass-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {activeItem ? (
          <>
            {/* Thread Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>@{activeItem.otherUser.username}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Task: <Link href={`/tasks/${activeItem.taskId}`} style={{ textDecoration: 'underline' }}>{activeItem.taskTitle}</Link>
                </span>
              </div>
              
              <Link href={`/tasks/${activeItem.taskId}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                View Task Details
              </Link>
            </div>

            {/* Error alerts inside chat */}
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem 1.5rem', fontSize: '0.8rem' }}>
                [Warning] {error}
              </div>
            )}

            {/* Message History */}
            <div style={{
              flex: 1,
              padding: '1.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(0,0,0,0.05)',
            }}>
              {chatLoading && messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} className="animate-pulse-slow">Loading conversation logs...</p>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const hasAttachment = !!msg.attachment_url;
                  
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', padding: '0 0.25rem' }}>
                        {isMe ? 'You' : `@${msg.sender.username}`} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      <div style={{
                        background: isMe ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                        color: '#ffffff',
                        padding: '0.8rem 1.1rem',
                        borderRadius: 'var(--border-radius-md)',
                        borderTopRightRadius: isMe ? 0 : 'var(--border-radius-md)',
                        borderTopLeftRadius: isMe ? 'var(--border-radius-md)' : 0,
                        border: isMe ? 'none' : '1px solid var(--glass-border)',
                        boxShadow: isMe ? 'var(--accent-glow)' : 'none',
                        lineHeight: 1.4,
                        fontSize: '0.9rem',
                        wordBreak: 'break-word',
                      }}>
                        
                        {/* Text Content */}
                        <p>{msg.content}</p>

                        {/* Attachments rendering */}
                        {hasAttachment && (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
                            {msg.attachment_type?.startsWith('image/') ? (
                              <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer">
                                <Image
                                  src={msg.attachment_url!}
                                  alt="Shared photo"
                                  width={220}
                                  height={140}
                                  unoptimized
                                  style={{
                                    maxWidth: '220px',
                                    maxHeight: '140px',
                                    width: 'auto',
                                    height: 'auto',
                                    borderRadius: 'var(--border-radius-sm)',
                                    display: 'block',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'zoom-in',
                                  }}
                                />
                              </a>
                            ) : (
                              <a
                                href={msg.attachment_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  color: '#93c5fd',
                                  textDecoration: 'underline',
                                  fontWeight: 500,
                                  fontSize: '0.85rem',
                                }}
                              >
                                📎 View Document
                              </a>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '4rem 0' }}>
                  No messages yet. Send a greeting to start coordinating!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies & inputs */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              
              {/* Quick Replies Buttons (Hidden if read-only) */}
              {!isChatLocked && (
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                  <button onClick={() => handleQuickReply('On my way!')} className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} disabled={sendLoading}>
                    On my way!
                  </button>
                  <button onClick={() => handleQuickReply('Running late by 10 mins')} className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} disabled={sendLoading}>
                    Running late by 10m
                  </button>
                  <button onClick={() => handleQuickReply('Finished task! Please review.')} className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} disabled={sendLoading}>
                    Delivered task
                  </button>
                </div>
              )}

              {/* Chat locked state */}
              {isChatLocked ? (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-muted)',
                  padding: '0.75rem',
                  borderRadius: 'var(--border-radius-md)',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                }}>
                  🔒 This SideQuest is completed or cancelled. The chat history is locked as read-only.
                </div>
              ) : (
                /* Chat inputs */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(textInput);
                  }}
                  style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
                >
                  {/* File Attachment Upload */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={handleFileUpload}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                      }}
                      disabled={sendLoading}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.75rem', fontSize: '1.1rem' }}
                      disabled={sendLoading}
                    >
                      📎
                    </button>
                  </div>

                  <input
                    className="form-input"
                    type="text"
                    placeholder="Type your message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    disabled={sendLoading}
                    required
                  />

                  <button
                    className="btn btn-primary"
                    type="submit"
                    style={{ padding: '0.75rem 1.25rem' }}
                    disabled={sendLoading || !textInput.trim()}
                  >
                    {sendLoading ? 'Sending...' : 'Send'}
                  </button>
                </form>
              )}

            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              No Active Conversation
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Select a conversation from the sidebar inbox to coordinate details with your poster/doer.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
export const dynamic = 'force-dynamic';
