'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Bot, Send, X, Image as ImageIcon, Music, Book } from 'lucide-react';

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isJiggling, setIsJiggling] = useState(false);
  const chatRef = useRef(null);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, isUser: true }]);
      setInput('');
      // Simulate bot response
      setTimeout(() => {
        setMessages((prev) => [...prev, { text: "Hi, I'm Corner Coach! I'm here to help you navigate the TD Brand Corner. What would you like to know?", isUser: false }]);
      }, 1000);
    }
  };

  const handleShortcut = (action) => {
    setMessages([...messages, { text: `I'd like to ${action}`, isUser: true }]);
    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => [...prev, { text: `Great! I can help you ${action}. Here's how to get started...`, isUser: false }]);
    }, 1000);
  };

  const handleOpen = () => {
    setIsAnimating(true);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsAnimating(true);
    setIsOpen(false);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const jiggleInterval = setInterval(() => {
      setIsJiggling(true);
      setTimeout(() => setIsJiggling(false), 1000);
    }, 5000); // Jiggle every 5 seconds

    return () => clearInterval(jiggleInterval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.corner-coach-container')) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full h-screen">
      <style>{`
        @keyframes jiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .jiggle {
          animation: jiggle 0.3s ease-in-out infinite;
        }
        .corner-coach-container {
          transition: all 0.3s ease-in-out;
          transform-origin: bottom right;
        }
        .corner-coach-container.closed {
          transform: scale(0);
          opacity: 0;
        }
        .corner-coach-container.open {
          transform: scale(1);
          opacity: 1;
        }
      `}</style>
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202024-10-26%20at%209.31.01%E2%80%AFAM-VgFGZBwyOxaYmF0GLyTmYlpbsb2Inm.png"
        alt="TD Brand Corner Screenshot"
        layout="fill"
        objectFit="contain"
        priority
      />
      <button
        onClick={handleOpen}
        className={`fixed bottom-4 right-4 rounded-lg w-12 h-12 bg-[#008A4B] hover:bg-[#006B3A] text-white shadow-lg z-20 transition-all duration-300 ${isJiggling ? 'jiggle' : ''}`}
        aria-label="Open Corner Coach"
      >
        <Bot className="w-6 h-6" />
      </button>
      <div
        className={`fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl overflow-hidden z-30 flex flex-col corner-coach-container ${isOpen ? 'open' : 'closed'}`}
        onTransitionEnd={() => setIsAnimating(false)}
      >
        <div className="bg-[#008A4B] text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Corner Coach</h2>
          <button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#006B3A]"
            aria-label="Close Corner Coach"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-[#F4F4F4] p-6 flex justify-around">
          <button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center text-[#008A4B] hover:bg-[#E3E3E3] hover:text-[#006B3A] px-2 w-1/3 h-20"
            onClick={() => handleShortcut("search for an icon")}
          >
            <ImageIcon className="w-6 h-6 mb-2" />
            <span className="text-xs text-center whitespace-normal leading-tight">Search for an icon</span>
          </button>
          <button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center text-[#008A4B] hover:bg-[#E3E3E3] hover:text-[#006B3A] px-2 w-1/3 h-20"
            onClick={() => handleShortcut("browse sonic assets")}
          >
            <Music className="w-6 h-6 mb-2" />
            <span className="text-xs text-center whitespace-normal">Browse sonic assets</span>
          </button>
          <button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center text-[#008A4B] hover:bg-[#E3E3E3] hover:text-[#006B3A] px-2 w-1/3 h-20"
            onClick={() => handleShortcut("learn about the Brand")}
          >
            <Book className="w-6 h-6 mb-2" />
            <span className="text-xs text-center whitespace-normal">Learn about the Brand</span>
          </button>
        </div>
        <div ref={chatRef} className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.isUser ? 'bg-[#008A4B] text-white' : 'bg-[#F4F4F4] text-black'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow"
            />
            <button type="submit" className="ml-2 bg-[#008A4B] hover:bg-[#006B3A] text-white">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
      {(isOpen || isAnimating) && (
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 ${isOpen ? 'bg-opacity-50' : 'bg-opacity-0'}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
