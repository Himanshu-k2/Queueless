import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../ui/Card";

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hi there! I am your QueueLess assistant. How can I help you today? You can ask about available banks, hospitals, booking appointments, or tracking your queue.' 
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "Find a bank",
    "Hospitals in Jamshedpur",
    "How do I book an appointment?",
    "What is my current queue status?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Hide assistant for staff and admin to keep their dedicated dashboards clean
  if (user && user.role !== 'customer') {
    return null;
  }

  const sendMessage = async (textToSend) => {
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const userMessage = { role: 'user', content: textToSend.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      // Filter recent clean history without error messages
      const validHistory = messages
        .filter(m => !m.isError && m.content)
        .slice(-8);

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage.content,
          history: validHistory
        })
      });

      const data = await res.json();
      
      if (res.ok && data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: data.message || "AI assistance is temporarily unavailable. Please try again.", 
          isError: true 
        }]);
      }
    } catch (error) {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: "Unable to reach QueueLess AI assistant. Please check your connection and try again.", 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 z-50 flex items-center justify-center cursor-pointer"
          aria-label="Open AI Assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-[360px] sm:max-w-[420px] z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-5">
          <Card className="border-0 shadow-none h-[520px] max-h-[85vh] flex flex-col bg-white">
            <CardHeader className="bg-primary text-primary-foreground p-3.5 flex flex-row items-center justify-between space-y-0 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-foreground/15 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-white">QueueLess Assistant</CardTitle>
                  <p className="text-[11px] text-white/80">Smart Services & Queue Guide</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground/80 hover:text-white rounded-full p-1 transition-colors cursor-pointer"
                aria-label="Close Assistant"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            
            <CardContent className="flex-1 p-3.5 overflow-y-auto bg-slate-50 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl p-3 text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-sm' 
                      : msg.isError 
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-xs rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-700 shadow-xs rounded-2xl rounded-tl-sm p-2.5 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-slate-500">Checking QueueLess records...</span>
                  </div>
                </div>
              )}

              {/* Quick Prompt Chips (Shown after greeting or when not busy) */}
              {messages.length <= 2 && !isLoading && (
                <div className="pt-2">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mb-2">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Suggested questions:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPrompts.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => sendMessage(prompt)}
                        className="text-[11px] px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-full border border-slate-200 shadow-2xs transition-colors cursor-pointer text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            <CardFooter className="p-2.5 bg-white border-t border-slate-100 rounded-b-2xl">
              <form onSubmit={handleSend} className="flex w-full gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ask about banks, hospitals, queues..."
                  className="flex-1 border-0 bg-slate-100 rounded-full px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-slate-800 placeholder:text-slate-400"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors flex-shrink-0 cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5 ml-[1px]" />
                </button>
              </form>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
