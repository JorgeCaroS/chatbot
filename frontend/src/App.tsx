import type { Message } from "@langchain/langgraph-sdk";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";


const mockChunks = [
  { id: "c1", choices: [{ delta: { content: "Hello! " }, finish_reason: null }] },
  { id: "c2", choices: [{ delta: { content: "The weather in Bogotá today is " }, finish_reason: null }] },
  { id: "c3", choices: [{ delta: { content: "partly cloudy " }, finish_reason: null }] },
  { id: "c4", choices: [{ delta: { content: "with temperatures around 18°C. " }, finish_reason: null }] },
  { id: "c5", choices: [{ delta: { content: "Do you need a forecast for the week?" }, finish_reason: "stop" }] },
];


const followUpChunks = [
  { id: "f1", choices: [{ delta: { content: "Sure! " }, finish_reason: null }] },
  { id: "f2", choices: [{ delta: { content: "This week's forecast shows mostly sunny days " }, finish_reason: null }] },
  { id: "f3", choices: [{ delta: { content: "with occasional rain showers on Thursday. " }, finish_reason: null }] },
  { id: "f4", choices: [{ delta: { content: "Let me know if you'd like recommendations for outdoor activities!" }, finish_reason: "stop" }] },
];

export default function App() {
  const [mockMessages, setMockMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processedEventsTimeline, setProcessedEventsTimeline] = useState<ProcessedEvent[]>([]);
  const [historicalActivities, setHistoricalActivities] = useState<Record<string, ProcessedEvent[]>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasFinalizeEventOccurredRef = useRef(false);

  const simulateStreamingResponse = (
    chunks: typeof mockChunks,
    onChunk: (text: string, isFinal: boolean) => void,
    delay = 1000
  ) => {
    let current = 0;
    const interval = setInterval(() => {
      const chunk = chunks[current];
      const delta = chunk.choices[0]?.delta?.content || "";
      const isFinal = chunk.choices[0]?.finish_reason === "stop";
      onChunk(delta, isFinal);
      current++;
      if (current >= chunks.length) clearInterval(interval);
    }, delay);
  };

  const simulateActivityEvents = () => {
    const fakeEvents: ProcessedEvent[] = [
      { title: "Generating Search Queries", data: "weather Bogotá" },
      { title: "Web Research", data: "Gathered 5 sources. Related to: Weather, Bogotá" },
      { title: "Finalizing Answer", data: "Composing and presenting the final answer." },
    ];
    let i = 0;
    const interval = setInterval(() => {
      setProcessedEventsTimeline((prev) => [...prev, fakeEvents[i]]);
      i++;
      if (i === fakeEvents.length) {
        clearInterval(interval);
        hasFinalizeEventOccurredRef.current = true;
      }
    }, 1200);
  };

  const handleSubmit = useCallback((input: string) => {
    if (!input.trim()) return;
    const userMessage: Message = {
      type: "human",
      content: input,
      id: Date.now().toString(),
    };
    setIsLoading(true);
    setMockMessages([userMessage]);

    simulateActivityEvents();

    let aiContent = "";
    simulateStreamingResponse(mockChunks, (delta, isFinal) => {
      aiContent += delta;
      setMockMessages([userMessage, { type: "ai", content: aiContent, id: "ai-1" }]);

      if (isFinal) {
        setTimeout(() => {
          let followUpContent = "";
        
          simulateStreamingResponse(followUpChunks, (delta2, isFinal2) => {
            followUpContent += delta2;
        
            setMockMessages([
              userMessage,
              { type: "ai", content: aiContent, id: "ai-1" },
              { type: "human", content: "Yes, please give me the weekly forecast.", id: "user-2" },
              {
                type: "ai",
                content: followUpContent,
                id: "ai-2",
              },
            ]);
        
            if (isFinal2) setIsLoading(false);
          }, 1000);
        }, 1500);
      }
    });
  }, []);

  const handleCancel = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [mockMessages]);

  useEffect(() => {
    if (hasFinalizeEventOccurredRef.current && !isLoading && mockMessages.length > 0) {
      const lastMessage = mockMessages[mockMessages.length - 1];
      if (lastMessage.type === "ai" && lastMessage.id) {
        setHistoricalActivities((prev) => ({
          ...prev,
          [lastMessage.id as string]: [...processedEventsTimeline],
        }));
      }
      hasFinalizeEventOccurredRef.current = false;
    }
  }, [isLoading, mockMessages, processedEventsTimeline]);

  

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full">
        <div className={`flex-1 overflow-y-auto ${mockMessages.length === 0 ? "flex" : ""}`}>
          {mockMessages.length === 0 ? (
            <WelcomeScreen handleSubmit={handleSubmit} isLoading={isLoading} onCancel={handleCancel} />
          ) : (
            <ChatMessagesView
              messages={mockMessages}
              isLoading={isLoading}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              liveActivityEvents={processedEventsTimeline}
              historicalActivities={historicalActivities}
            />
          )}
        </div>
      </main>
    </div>
  );
}
