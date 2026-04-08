'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function RedeemCodeDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const redeemMutation = api.promo.redeem.useMutation({
    onSuccess: () => {
      toast.success('Code redeemed successfully!');
      setCode('');
      setOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to redeem code');
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    redeemMutation.mutate({ 
      code: code.trim(),
      userAgent: navigator.userAgent 
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Redeem Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleRedeem}>
          <DialogHeader>
            <DialogTitle>Redeem Code</DialogTitle>
            <DialogDescription>
              Enter your promo code to receive credits or special offers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="PROMO2024"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !code.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redeem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

