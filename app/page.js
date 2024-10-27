"use client"
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Bot, Send, X, Image as ImageIcon, Music, Book } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import OpenAI from 'openai';

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
  const [vectorStore, setVectorStore] = useState(null);
  const [thread, setThread] = useState(null);

  // Initialize assistant and vector store
  useEffect(() => {
    async function initializeAssistant() {
      try {
        // Create assistant
        const newAssistant = await openai.beta.assistants.create({
          name: "TD Brand Assistant",
          instructions: "You are an expert on TD Brand guidelines. Use the knowledge base to answer questions about TD brand assets and guidelines.",
          model: "gpt-4-turbo-preview",
          tools: [{ type: "file_search" }],
        });
        setAssistant(newAssistant);

        // Create vector store
        const newVectorStore = await openai.beta.vectorStores.create({
          name: "TD Brand Guidelines",
        });
        setVectorStore(newVectorStore);

        // Upload files to vector store
        const fileStreams = ["/Logo_TD_Brand_Corner.pdf"].map((path) =>
          fs.createReadStream(path)
        );

        await openai.beta.vectorStores.fileBatches.uploadAndPoll(
          newVectorStore.id, 
          fileStreams
        );

        // Update assistant with vector store
        await openai.beta.assistants.update(newAssistant.id, {
          tool_resources: { 
            file_search: { 
              vector_store_ids: [newVectorStore.id] 
            } 
          },
        });

        // Create initial thread
        const newThread = await openai.beta.threads.create();
        setThread(newThread);

      } catch (error) {
        console.error("Error initializing assistant:", error);
      }
    }

    initializeAssistant();
  }, []);

  const getOpenAIResponse = async (userInput) => {
    try {
      if (!thread || !assistant) {
        return "Still initializing. Please try again in a moment.";
      }

      // Add message to thread
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: userInput
      });

      // Create and run the thread
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
        } else if (runStatus.status === 'failed') {
          throw new Error('Run failed');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return response;

    } catch (error) {
      console.error("OpenAI API error:", error);
      return "Sorry, I encountered an error processing your request. Please try again.";
    }
  };

  // Handle send button click
  const handleSend = async () => {
    if (!hasVisited) {
      sessionStorage.setItem('hasVisited', true);
    }
    
    if (input.trim()) {
      setIsLoading(true);
      
      // Add user message immediately
      setMessages(prev => [...prev, { text: input, isUser: true }]);
      
      try {
        // Get response from OpenAI
        const aiResponse = await getOpenAIResponse(input);
        
        // Add AI response to messages
        setMessages(prev => [...prev, { text: aiResponse, isUser: false }]);
      } catch (error) {
        console.error("Error in handleSend:", error);
        setMessages(prev => [...prev, { 
          text: "Sorry, I encountered an error. Please try again.", 
          isUser: false 
        }]);
      }
      
      // Clear input and loading state
      setInput('');
      setIsLoading(false);
    }
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
            disabled={isLoading}
          />
            <Button
              disabled={isLoading}
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
