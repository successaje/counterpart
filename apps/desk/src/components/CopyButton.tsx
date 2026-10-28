import { Button, type ButtonProps } from '@counterpart/ui';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({
  text,
  children,
  ...rest
}: { text: string } & Omit<ButtonProps, 'onClick' | 'icon'>) {
  const [done, setDone] = useState(false);
  return (
    <Button
      {...rest}
      icon={done ? <Check /> : <Copy />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // clipboard unavailable; the text is visible on screen anyway
        }
      }}
    >
      {done ? 'Copied' : children}
    </Button>
  );
}
