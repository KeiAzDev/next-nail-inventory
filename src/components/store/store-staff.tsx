"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Plus,
  UserCircle,
  Shield,
  Mail,
  Edit,
  UserCog,
  Trash2,
} from "lucide-react";
import { fetchStoreStaff, deleteStaffMember } from "@/lib/api-client";
import type { StaffMember } from "@/types/api";
import { LoadingSpinner } from "@/components/ui/loading";
import { useToast } from "@/components/ui/use-toast";
import StoreInvitationList from "./store-invitation-list";
import InvitationModal from "@/components/modals/staff-invite-modal";
import StaffEditModal from "@/components/modals/staff-edit-modal";
import StaffRoleModal from "@/components/modals/staff-role-modal";

interface StoreStaffProps {
  storeId: string;
}

const roleBadgeColors = {
  ADMIN: "bg-red-100 text-red-800",
  MANAGER: "bg-blue-100 text-blue-800",
  STAFF: "bg-gray-100 text-gray-800",
} as const;

const roleLabels = {
  ADMIN: "管理者",
  MANAGER: "マネージャー",
  STAFF: "スタッフ",
} as const;

const canEdit = (currentUser: any, targetStaff: StaffMember): boolean => {
  if (!currentUser) return false;
  // ADMINは全員編集可能
  if (currentUser.role === "ADMIN") return true;
  // 自分自身は編集可能
  return currentUser.id === targetStaff.id;
};

const canDelete = (currentUser: any, targetStaff: StaffMember): boolean => {
  if (!currentUser) return false;
  // 管理者は削除できない
  if (targetStaff.role === "ADMIN") return false;
  // 自分自身は削除できない
  if (currentUser.id === targetStaff.id) return false;
  // ADMINはすべてのスタッフを削除可能
  if (currentUser.role === "ADMIN") return true;
  // MANAGERはSTAFFのみ削除可能
  if (currentUser.role === "MANAGER" && targetStaff.role === "STAFF")
    return true;
  return false;
};

const canInviteStaff = (userRole?: string | null): boolean => {
  if (!userRole) return false;
  return userRole === "ADMIN" || userRole === "MANAGER";
};

export default function StoreStaff({ storeId }: StoreStaffProps) {
  const { data: session } = useSession();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: staffMembers,
    error,
    isLoading,
  } = useQuery<StaffMember[]>({
    queryKey: ["staff", storeId],
    queryFn: () => fetchStoreStaff(storeId),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (staffId: string) => deleteStaffMember(storeId, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", storeId] });
      toast({
        title: "削除完了",
        description: "スタッフを削除しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "スタッフの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="h-64">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          スタッフ情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>スタッフ管理</CardTitle>
            {canInviteStaff(session?.user.role) && (
              <Button
                className="hover:bg-white"
                onClick={() => setShowInviteModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                スタッフ招待
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
  <div className="space-y-6">
    <div className="space-y-4">
      <h3 className="font-medium text-muted-foreground">スタッフ一覧</h3>
      <div className="space-y-4">
        {staffMembers?.map((staff) => (
          <div
            key={staff.id}
            className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 border rounded-lg bg-white gap-4 lg:gap-3"
          >
            {/* 名前とメールアドレス */}
            <div className="flex items-center gap-3 w-full lg:w-auto min-w-0 flex-shrink">
              <UserCircle className="h-10 w-10 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1 lg:flex-initial">
                <h3 className="font-medium truncate">{staff.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{staff.email}</span>
                </div>
              </div>
            </div>

            {/* 役職とボタンを縦並び */}
            <div className="flex flex-col lg:flex-col items-start lg:items-start w-full lg:w-auto">
              {/* 役職バッジ */}
              <div
                className={`px-3 py-1 rounded-full text-sm ${
                  roleBadgeColors[staff.role]
                } shrink-0 min-w-[100px] text-center`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>{roleLabels[staff.role]}</span>
                </div>
              </div>

              {/* ボタンを横並び＆右詰め */}
              <div className="w-full flex justify-end mt-3">
                <div className="flex flex-row gap-2 ml-auto">
                  {canEdit(session?.user, staff) && (
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-8 lg:h-9 lg:w-9"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className="h-3 w-3 lg:h-4 lg:w-4" />
                    </Button>
                  )}
                  {session?.user.role === "ADMIN" &&
                    staff.role !== "ADMIN" &&
                    staff.id !== session?.user.id && (
                      <Button
                        variant="default"
                        size="icon"
                        className="h-8 w-8 lg:h-9 lg:w-9"
                        onClick={() => {
                          setSelectedStaff(staff);
                          setShowRoleModal(true);
                        }}
                      >
                        <UserCog className="h-3 w-3 lg:h-4 lg:w-4" />
                      </Button>
                    )}
                  {canDelete(session?.user, staff) && (
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-8 lg:h-9 lg:w-9"
                      onClick={() => {
                        if (
                          window.confirm(
                            "このスタッフを削除してもよろしいですか？"
                          )
                        ) {
                          deleteStaffMutation.mutate(staff.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 lg:h-4 lg:w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {staffMembers?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            スタッフが登録されていません
          </p>
        )}
      </div>
    </div>
    {canInviteStaff(session?.user.role) && (
      <div className="space-y-4">
        <div className="h-px bg-border" aria-hidden="true" />
        <h3 className="font-medium text-muted-foreground">招待管理</h3>
        <StoreInvitationList storeId={storeId} />
      </div>
    )}
  </div>
</CardContent>


      </Card>

      {canInviteStaff(session?.user.role) && (
        <InvitationModal
          storeId={storeId}
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
        />
      )}

      {selectedStaff && (
        <>
          <StaffEditModal
            storeId={storeId}
            staff={selectedStaff}
            open={showEditModal}
            onOpenChange={setShowEditModal}
          />
          <StaffRoleModal
            storeId={storeId}
            staff={selectedStaff}
            open={showRoleModal}
            onOpenChange={setShowRoleModal}
          />
        </>
      )}
    </>
  );
}
