import { useEffect, useRef, useState } from 'react'
import { Send, Hash, Loader2, AtSign } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useProjectsStore } from '../store/projectsStore'
import { useChatStore } from '../store/chatStore'
import { supabase } from '../lib/supabase'
import { Avatar } from '../components/ui/Avatar'
import type { Message } from '../types/supabase'

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const user = message.user as any
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar name={user?.full_name || user?.email} size="sm" className="flex-shrink-0 mt-0.5" />
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-white/60">{user?.full_name || 'User'}</span>
          <span className="text-xs text-white/20">{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-surface-2 border border-white/5 text-white/80 rounded-tl-sm'
        }`}>
          {message.content}
        </div>
      </div>
    </div>
  )
}

export function ChatPage() {
  const { user, organization } = useAuthStore()
  const { projects, fetchProjects } = useProjectsStore()
  const { messages, loading, activeChannel, setActiveChannel, fetchMessages, sendMessage, addMessage } = useChatStore()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (organization) {
      fetchProjects(organization.id)
      if (!activeChannel) setActiveChannel({ type: 'org', id: organization.id })
    }
  }, [organization?.id])

  useEffect(() => {
    if (!activeChannel || !organization) return
    const projectId = activeChannel.type === 'project' ? activeChannel.id : undefined
    fetchMessages(organization.id, projectId)

    // Cleanup previous subscription
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current)

    // Subscribe to new messages
    const channel = supabase.channel(`messages:${activeChannel.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: projectId ? `project_id=eq.${projectId}` : `organization_id=eq.${organization.id}`,
      }, async (payload) => {
        // Fetch with user join
        const { data } = await supabase
          .from('messages')
          .select('*, user:profiles!messages_user_id_fkey(*)')
          .eq('id', payload.new.id)
          .single()
        if (data) addMessage(data as any)
      })
      .subscribe()

    subscriptionRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [activeChannel?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user || !organization) return
    setSending(true)
    const projectId = activeChannel?.type === 'project' ? activeChannel.id : undefined
    await sendMessage({
      organization_id: organization.id,
      project_id: projectId,
      user_id: user.id,
      content: input.trim(),
    })
    setInput('')
    setSending(false)
  }

  const channelName = activeChannel?.type === 'org'
    ? `# general`
    : `# ${projects.find(p => p.id === activeChannel?.id)?.name || 'project'}`

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 bg-surface-1 border-r border-white/5 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-white/5">
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider">Channels</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* General */}
          <button
            onClick={() => setActiveChannel({ type: 'org', id: organization!.id })}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-colors ${
              activeChannel?.type === 'org' ? 'bg-brand-600/20 text-brand-300' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Hash size={14} /> general
          </button>

          {/* Project channels */}
          {projects.length > 0 && (
            <>
              <div className="px-3 py-2 mt-2">
                <span className="text-xs text-white/20 uppercase tracking-wider">Projects</span>
              </div>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setActiveChannel({ type: 'project', id: project.id })}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-colors ${
                    activeChannel?.id === project.id ? 'bg-brand-600/20 text-brand-300' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
          <Hash size={16} className="text-white/40" />
          <h2 className="font-semibold text-white">{channelName}</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-white/30" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/30">
              <div className="text-4xl mb-3">💬</div>
              <div className="font-medium text-white/40">No messages yet</div>
              <div className="text-sm mt-1">Be the first to say something!</div>
            </div>
          ) : messages.map((msg, i) => {
            const prevMsg = messages[i - 1]
            const showSeparator = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
            return (
              <div key={msg.id}>
                {showSeparator && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-xs text-white/20">{new Date(msg.created_at).toLocaleDateString()}</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                )}
                <MessageBubble message={msg} isOwn={msg.user_id === user?.id} />
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <div className="flex gap-3 items-end">
            <Avatar name={user?.full_name} size="sm" className="flex-shrink-0 mb-0.5" />
            <div className="flex-1 flex gap-2">
              <div className="flex-1 bg-surface-2 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder={`Message ${channelName}...`}
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
                />
                <button className="text-white/20 hover:text-white/40 transition-colors">
                  <AtSign size={15} />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white rounded-xl px-3 py-3 transition-all flex items-center"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
