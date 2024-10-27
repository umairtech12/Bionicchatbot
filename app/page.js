"use client"
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Bot, Send, X, Image as ImageIcon, Music, Book } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import OpenAI from 'openai';
import { brandFiles } from '@/lib/filesPath';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default function Home() {
  const [hasVisited, setHasVisited] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isJiggling, setIsJiggling] = useState(false);
  const chatRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [thread, setThread] = useState(null);
  const [initializationError, setInitializationError] = useState(null);
  const [initStatus, setInitStatus] = useState('not_started');

  useEffect(() => {
    async function initializeAssistant() {
      if (initStatus !== 'not_started') return;
      
      setInitStatus('in_progress');
      setInitializationError(null);

      try {
        console.log("Starting initialization process...");
        
        // Step 1: Upload files first
        const fileIds = [];
        for (const filePath of brandFiles) {
          try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
            
            const blob = await response.blob();
            const filename = filePath.split('/').pop();
            const file = new File([blob], filename, { type: 'application/pdf' });
            
            console.log(`Uploading file: ${filename}`);
            const fileUpload = await openai.files.create({
              file: file,
              purpose: 'assistants'
            });
            
            fileIds.push(fileUpload.id);
            console.log(`File uploaded successfully: ${fileUpload.id}`);
          } catch (fileError) {
            console.error("Error uploading file:", filePath, fileError);
          }
        }

        if (fileIds.length === 0) {
          throw new Error("No files were uploaded successfully");
        }

        // Step 2: Create vector store with file IDs
        console.log("Creating vector store with files:", fileIds);
        const vectorStore = await openai.beta.vectorStores.create({
          name: "TD-Brand-Guidelines-Store",
          file_ids: fileIds,
          expires_after: {
            anchor: "last_active_at",
            days: 30 
          }
        });
        console.log("Vector store created:", vectorStore.id);

        // Step 3: Create assistant with vector store
        console.log("Creating assistant with vector store...");
        const newAssistant = await openai.beta.assistants.create({
          name: "TD Brand Assistant",
          instructions: "You are an expert on TD Brand guidelines. Use the knowledge base to answer questions about TD brand assets and guidelines and dont give me pdf file name,no refernce just accurate information.",
          model: "gpt-4-turbo-preview",
          tools: [{ type: "file_search" }],
          tool_resources: {
            "file_search": {
              "vector_store_ids": [vectorStore.id]
            }
          }
        });
        
        console.log("Assistant created:", newAssistant);
        setAssistant(newAssistant);

        // Step 4: Create thread
        const newThread = await openai.beta.threads.create();
        setThread(newThread);
        console.log("Thread created:", newThread.id);

        setInitStatus('completed');
        console.log("Initialization completed successfully");

      } catch (error) {
        console.error("Initialization error:", error);
        setInitializationError(error.message);
        setInitStatus('failed');
      }
    }

    initializeAssistant();
  }, [initStatus]);

  const getOpenAIResponse = async (userInput) => {
    if (initStatus !== 'completed') {
      return `System initialization ${initStatus}. Please wait or refresh the page if this persists.`;
    }

    if (!thread || !assistant) {
      return "System not properly initialized. Please refresh the page.";
    }

    try {
      // Create message
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: userInput+'dont give me pdf file name,no refernce just accurate information and also do not use this 【source】 . and answer only 1.5 lines '
      });

      // Create run
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id
      });

      // Poll for completion
      let response = null;
      while (!response) {
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        
        if (runStatus.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(thread.id);
          response = messages.data[0].content[0].text.value;
          break;
        } 
        
        if (runStatus.status === 'failed' || runStatus.status === 'expired') {
          throw new Error(`Run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return response;

    } catch (error) {
      console.error("OpenAI API error:", error);
      return `Error: ${error.message}. Please try again.`;
    }
  };
  const handleSend = async () => {
    if (!input.trim()) return;
    
    if (!assistant || !thread) {
      setMessages(prev => [...prev, {
        text: "Please upload files first to initialize the assistant.",
        isUser: false
      }]);
      return;
    }

    setIsLoading(true);
    setMessages(prev => [...prev, { text: input, isUser: true }]);

    try {
      const response = await getOpenAIResponse(input);
      setMessages(prev => [...prev, { text: response, isUser: false }]);
    } catch (error) {
      console.error("Error in handleSend:", error);
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false
      }]);
    }

    setInput('');
    setIsLoading(false);
  };

  const handleShortcut = (action) => {
    let response;

    switch (action) {
      case "search for an icon":
        response = `You can search for icons here: <a href="https://brandcorner.td.com/icons-illustrations" target="_blank" rel="noopener noreferrer">https://brandcorner.td.com/icons-illustrations</a>`;
        break;
      case "browse sonic assets":
        response = `You can browse sonic assets here: <a href="https://brandcorner.td.com/sound#our-sonic-melody" target="_blank" rel="noopener noreferrer">https://brandcorner.td.com/sound#our-sonic-melody</a>`;
        break;
      case "learn about the Brand":
        response = `Learn about the brand here: <a href="https://brandcorner.td.com/brand-basics" target="_blank" rel="noopener noreferrer">https://brandcorner.td.com/brand-basics</a>`;
        break;
      default:
        response = "I'm not sure about that.";
    }

    setMessages([...messages, { text: `I'd like to ${action}`, isUser: true }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { text: response, isUser: false, isHTML: true }]);
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

  const LoadingMessage = () => (
    <div className="flex justify-start">
      <div className="bg-[#F4F4F4] text-black rounded-lg px-4 py-3">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#008A4B]"></div>
            <span className="font-medium">Just a moment...</span>
          </div>
          <span className="text-sm text-gray-600">
            Please wait 1 minute while I prepare to assist you.
          </span>
        </div>
      </div>
    </div>
  );

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
      <Button
        onClick={handleOpen}
        className={`fixed bottom-4 right-4 rounded-lg w-12 h-12 bg-[#008A4B] hover:bg-[#006B3A] text-white shadow-lg z-20 transition-all duration-300 ${isJiggling ? 'jiggle' : ''}`}
        aria-label="Open Corner Coach"
      >
        <Bot className="w-6 h-6" />
      </Button>
      <div
        className={`fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl overflow-hidden z-30 flex flex-col corner-coach-container ${isOpen ? 'open' : 'closed'}`}
        onTransitionEnd={() => setIsAnimating(false)}
      >
        <div className="bg-[#008A4B] text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Corner Coach</h2>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#006B3A]"
            aria-label="Close Corner Coach"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="bg-[#F4F4F4] p-6 flex justify-around">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center text-[#008A4B] hover:bg-[#E3E3E3] hover:text-[#006B3A] px-2 w-1/3 h-20"
            onClick={() => handleShortcut("search for an icon")}
          >
            <ImageIcon className="w-6 h-6 mb-2" />
            <span className="text-xs text-center whitespace-normal leading-tight">Search for an icon</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center text-[#008A4B] hover:bg-[#E3E3E3] hover:text-[#006B3A] px-2 w-1/3 h-20"
            onClick={() => handleShortcut("browse sonic assets")}
          >
            <Music className="w-6 h-6 mb-2" />
            <span className="text-xs text-center whitespace-normal">Browse sonic assets</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center text-[#008A4B] hover:bg-[#E3E3E3] hover:text-[#006B3A] px-2 w-1/3 h-20"
            onClick={() => handleShortcut("learn about the Brand")}
          >
            <Book className="w-6 h-6 mb-2" />
            <span className="text-xs text-center whitespace-normal">Learn about the Brand</span>
          </Button>
        </div>
        <div ref={chatRef} className="flex-grow overflow-y-auto p-4 space-y-4">
        {initStatus === 'in_progress' && <LoadingMessage />}
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.isUser ? 'bg-[#008A4B] text-white' : 'bg-[#F4F4F4] text-black'} ${msg.isHTML ? 'html-content' : ''}`}
                {...(msg.isHTML
                  ? { dangerouslySetInnerHTML: { __html: msg.text } }
                  : { children: msg.text })}
              />
            </div>
          ))}
        </div>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#F4F4F4] text-black rounded-lg px-4 py-2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div className="p-4 border-t">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center">
        <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow"
            disabled={isLoading || initStatus !== 'completed'}
          />
            <Button
                 disabled={isLoading || initStatus !== 'completed'}
            type="submit" className="ml-2 bg-[#008A4B] hover:bg-[#006B3A] text-white">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
      {(isOpen || isAnimating) && (
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 z-10 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleClose}
        ></div>
      )}
    </div>
  );
}
