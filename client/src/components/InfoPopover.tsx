import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Clock } from 'lucide-react';

interface InfoPopoverProps {
  type: 'location' | 'hours';
  title: string;
  content: string;
}

export function InfoPopover({ type, title, content }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const Icon = type === 'location' ? MapPin : Clock;
  const buttonLabel = type === 'location' ? '위치' : '운영시간';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 px-2 text-xs gap-1"
          data-testid={`button-${type}-${title.replace(/[^a-zA-Z0-9]/g, '')}`}
        >
          <Icon className="w-3 h-3" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg">{title} - {buttonLabel}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
            {content}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
