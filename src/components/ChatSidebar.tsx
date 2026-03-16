import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

const ChatSidebar = ({ conversations, activeId, onSelect, onNew, onDelete, open, onClose }: ChatSidebarProps) => {
  return (
    <>
      {/* Overlay on mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : -320 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="fixed left-0 top-0 bottom-16 w-72 z-50 glass-surface-strong border-r border-border/30 flex flex-col lg:relative lg:translate-x-0"
        style={{ transform: open ? undefined : "translateX(-320px)" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-sm font-bold text-foreground">Conversas</h2>
          <div className="flex gap-2">
            <button onClick={onNew} className="p-2 rounded-xl gradient-primary text-primary-foreground cinema-glow-sm hover:opacity-90">
              <Plus size={14} />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground lg:hidden">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c.id); onClose(); }}
              className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-left text-sm transition-all group ${
                activeId === c.id ? "glass-surface text-foreground" : "text-foreground/70 hover:bg-white/5"
              }`}
            >
              <MessageSquare size={14} className="flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 size={12} />
              </button>
            </button>
          ))}
        </div>
      </motion.aside>
    </>
  );
};

export default ChatSidebar;
