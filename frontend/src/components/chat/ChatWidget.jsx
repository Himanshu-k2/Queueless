import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../ui/Card";
import { Button } from "../ui/Button";

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your QueueLess assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!user || user.role !== 'customer') {
    return null; // Only show for customers
  }

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages // pass previous context
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.message || "AI assistance is temporarily unavailable. Please try again.", isError: true }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: "AI assistance is temporarily unavailable. Please try again.", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 z-50 flex items-center justify-center"
          aria-label="Open AI Assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-[350px] sm:max-w-[400px] z-50 shadow-2xl rounded-lg overflow-hidden animate-in slide-in-from-bottom-5">
          <Card className="border-0 shadow-none h-[500px] max-h-[80vh] flex flex-col">
            <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <CardTitle className="text-base font-semibold">QueueLess Assistant</CardTitle>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground/80 hover:text-white rounded-full p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            
            <CardContent className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : msg.isError 
                        ? 'bg-red-50 text-red-600 border border-red-100 rounded-tl-sm'
                        : 'bg-white border text-slate-800 shadow-sm rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border text-slate-800 shadow-sm rounded-2xl rounded-tl-sm p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-slate-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <CardFooter className="p-3 bg-white border-t rounded-b-lg">
              <form onSubmit={handleSend} className="flex w-full gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  className="flex-1 border-0 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors flex-shrink-0"
                >
                  <Send className="h-4 w-4 ml-[2px]" />
                </button>
              </form>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
