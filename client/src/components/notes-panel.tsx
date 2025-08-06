
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Save, Plus, Trash2, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  timestamp: Date;
}

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('learning-notes');
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        timestamp: new Date(note.timestamp)
      }));
      setNotes(parsedNotes);
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('learning-notes', JSON.stringify(notes));
    }
  }, [notes]);

  const createNewNote = () => {
    if (!newTitle.trim()) return;

    const note: Note = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      tags: newTags.split(',').map(tag => tag.trim()).filter(Boolean),
      timestamp: new Date()
    };

    setNotes(prev => [note, ...prev]);
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setCurrentNote(note);
  };

  const updateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(note => 
      note.id === updatedNote.id ? updatedNote : note
    ));
    setCurrentNote(updatedNote);
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
    if (currentNote?.id === noteId) {
      setCurrentNote(null);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Learning Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 p-4 gap-4 min-h-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Create New Note Form */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <Input
            placeholder="Note title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Textarea
            placeholder="What did you learn today?"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
          />
          <Input
            placeholder="Tags (comma separated)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
          />
          <Button
            onClick={createNewNote}
            disabled={!newTitle.trim()}
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>

        <Separator />

        {/* Notes List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-3">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No notes yet. Start taking notes to track your learning!</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    currentNote?.id === note.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCurrentNote(note)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{note.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {note.content}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    {note.timestamp.toLocaleDateString()} {note.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Current Note Editor */}
        {currentNote && (
          <div className="border-t pt-4 space-y-2">
            <h3 className="font-medium">Editing: {currentNote.title}</h3>
            <Textarea
              value={currentNote.content}
              onChange={(e) =>
                updateNote({ ...currentNote, content: e.target.value })
              }
              rows={4}
            />
            <Input
              placeholder="Tags (comma separated)"
              value={currentNote.tags.join(', ')}
              onChange={(e) =>
                updateNote({
                  ...currentNote,
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
