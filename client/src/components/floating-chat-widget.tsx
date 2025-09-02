
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, X, MessageCircle, Minimize2 } from "lucide-react";
import { AiChat } from "@/components/ai-chat";

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const restoreChat = () => {
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-20 right-6 z-50">
          <Button
            onClick={toggleChat}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-white"
            size="icon"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
          
          {/* Pulse animation ring */}
          <div className="absolute inset-0 w-14 h-14 rounded-full bg-blue-500 opacity-30 animate-ping"></div>
        </div>
      )}

      {/* Chat Popup */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-20 right-6 z-50 w-96 h-[500px] shadow-2xl rounded-xl overflow-hidden border border-gray-200">
          <Card className="h-full flex flex-col bg-white">
            <CardHeader className="flex-shrink-0 pb-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bot className="h-5 w-5" />
                  AI Assistant
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={minimizeChat}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleChat}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <div className="h-full">
                <AiChat />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Minimized Chat Bar */}
      {isOpen && isMinimized && (
        <div className="fixed bottom-20 right-6 z-50">
          <Button
            onClick={restoreChat}
            className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            <Bot className="h-4 w-4" />
            <span className="text-sm font-medium">AI Assistant</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </Button>
        </div>
      )}
    </>
  );
}
