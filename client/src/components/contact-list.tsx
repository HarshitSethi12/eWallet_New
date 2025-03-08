import { type Contact } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ContactListProps {
  contacts: Contact[];
  onSelect?: (address: string) => void;
}

export function ContactList({ contacts, onSelect }: ContactListProps) {
  const deleteContact = async (id: number) => {
    await apiRequest("DELETE", `/api/contacts/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Address Book</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contacts.length === 0 ? (
          <p className="text-center text-muted-foreground">No saved contacts</p>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between">
              <div 
                className={onSelect ? "cursor-pointer flex-1" : "flex-1"}
                onClick={() => onSelect?.(contact.address)}
              >
                <p className="font-medium">{contact.name}</p>
                <code className="text-sm text-muted-foreground">
                  {contact.address}
                </code>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteContact(contact.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
