import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Search, History, Moon, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ sessions, currentSessionId, onNewChat, onSelectChat, onDeleteChat, isOpen, toggleSidebar, onOpenProfile, userName }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSessions = sessions.filter(session =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by timestamp descending (newest first)
    const sortedSessions = [...filteredSessions].sort((a, b) => b.timestamp - a.timestamp);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const getInitials = (name) => {
        if (!name) return 'Pr';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={toggleSidebar}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.div
                className={`fixed md:relative inset-y-0 left-0 z-50 w-72 bg-slate-900/40 backdrop-blur-xl border-r border-slate-800 flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:-ml-72'}`}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold tracking-wider">
                        <History className="w-5 h-5 text-primary" />
                        <span>History</span>
                    </div>
                    {/* Close Button - Visible on Mobile AND Desktop now */}
                    <button onClick={toggleSidebar} className="p-1 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="p-4">
                    <button
                        onClick={() => {
                            onNewChat();
                            if (window.innerWidth < 768) toggleSidebar();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">New Consultation</span>
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800 text-sm text-white rounded-lg pl-9 pr-3 py-2 border border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-500"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {sortedSessions.length === 0 ? (
                        <div className="text-center text-slate-500 text-sm py-8 px-4">
                            {searchQuery ? "No chats found" : "No consultation history"}
                        </div>
                    ) : (
                        sortedSessions.map(session => (
                            <div
                                key={session.id}
                                className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${session.id === currentSessionId ? 'bg-slate-800/80 border border-slate-700' : 'hover:bg-slate-800/40 border border-transparent hover:border-slate-800'}`}
                                onClick={() => {
                                    onSelectChat(session.id);
                                    if (window.innerWidth < 768) toggleSidebar();
                                }}
                            >
                                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${session.id === currentSessionId ? 'text-primary' : 'text-slate-500'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${session.id === currentSessionId ? 'text-white' : 'text-slate-300'}`}>
                                        {session.title || "New Chat"}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {formatDate(session.timestamp)}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChat(session.id);
                                    }}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-4 border-t border-slate-800">
                    <div
                        onClick={onOpenProfile}
                        className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors"
                        title="Edit Profile"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{getInitials(userName)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{userName || "My Profile"}</p>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Settings
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default Sidebar;
