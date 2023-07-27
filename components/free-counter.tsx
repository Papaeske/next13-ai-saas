import { Zap, BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { MAX_FREE_COUNTS } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProModal } from "@/hooks/use-pro-modal";
import Link from "next/link";

export const FreeCounter = ({
  isPro = false,
  apiLimitCount = 0,
}: {
  isPro: boolean,
  apiLimitCount: number
}) => {
  const [mounted, setMounted] = useState(false);
  const proModal = useProModal();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  

  if (isPro) {
    return (
      <div className="px-3">
          <CardContent className="py-6">
            <Link href="/settings">
              <Button variant="premium" className="w-full">
                Pro Plan
                <BadgeCheck className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
      </div>
    )
  }

  return (
    <div className="px-3">
      <Card className="bg-white/10 border-0">
        <CardContent className="py-6">
          <div className="text-center text-sm text-white mb-4 space-y-2">
            <p>
              {apiLimitCount} / {MAX_FREE_COUNTS} Free Generations Used
            </p>
            <Progress className="h-3" value={(apiLimitCount / MAX_FREE_COUNTS) * 100} />
          </div>
          <Button onClick={proModal.onOpen} variant="premium" className="w-full">
            Upgrade
            <Zap className="w-4 h-4 ml-2 fill-white" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}