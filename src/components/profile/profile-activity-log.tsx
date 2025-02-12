// /src/components/profile/profile-activity-log.tsx
"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchStaffProfile } from "@/lib/api-client";
import { Activity } from "@/types/api";

export default function ProfileActivityLog() {
  const { data: session } = useSession();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["staffProfile", session?.user.storeId, session?.user.id],
    queryFn: () => fetchStaffProfile(session!.user.storeId, session!.user.id),
    enabled: !!session?.user.id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>アクティビティログ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {profile?.activities?.map((activity: Activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between border-b pb-2"
            >
              <div>
                <p className="font-medium">{activity.action}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
