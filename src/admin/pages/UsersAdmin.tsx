"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Shield,
  Ban,
  CheckCircle2,
  Users as UsersIcon,
  UserCog,
  User as UserIcon,
  Loader2,
  Pencil,
  Trash2,
  Mail,
  Calendar,
  Crown,
  X,
} from "lucide-react";
import {
  fetchAllUsers,
  setUserBanned,
  setUserRole,
  updateUserProfile,
  deleteUserProfile,
} from "@/services/dataService";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile } from "@/firebase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/utils/format";
import {
  AdminPageHeader,
  StatCard,
  EmptyTableState,
  EmptyCardState,
} from "@/admin/components/AdminShared";

type PendingAction =
  | { kind: "ban"; user: UserProfile }
  | { kind: "unban"; user: UserProfile }
  | { kind: "promote"; user: UserProfile }
  | { kind: "demote"; user: UserProfile }
  | { kind: "delete"; user: UserProfile };

interface EditForm {
  displayName: string;
  photoURL: string;
  role: "admin" | "user";
}

export default function UsersAdmin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [pending, setPending] = React.useState<PendingAction | null>(null);
  const [acting, setActing] = React.useState(false);
  const [editing, setEditing] = React.useState<UserProfile | null>(null);
  const [editForm, setEditForm] = React.useState<EditForm>({
    displayName: "",
    photoURL: "",
    role: "user",

  });
  const [savingEdit, setSavingEdit] = React.useState(false);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAllUsers();
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.displayName || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = React.useMemo(() => {
    const admins = users.filter((u) => u.role === "admin").length;
    const banned = users.filter((u) => u.banned).length;
    const regular = users.length - admins;
    return { total: users.length, admins, regular, banned };
  }, [users]);

  const confirmAction = async () => {
    if (!pending) return;
    setActing(true);
    try {
      if (pending.kind === "ban") {
        await setUserBanned(pending.user.uid, true);
        toast.success("User banned", { description: pending.user.email || "" });
      } else if (pending.kind === "unban") {
        await setUserBanned(pending.user.uid, false);
        toast.success("User unbanned", { description: pending.user.email || "" });
      } else if (pending.kind === "promote") {
        await setUserRole(pending.user.uid, "admin");
        toast.success("User promoted to admin", {
          description: pending.user.email || "",
        });
      } else if (pending.kind === "demote") {
        await setUserRole(pending.user.uid, "user");
        toast.success("Admin demoted to user", {
          description: pending.user.email || "",
        });
      } else if (pending.kind === "delete") {
        await deleteUserProfile(pending.user.uid);
        toast.success("User deleted", {
          description: `${pending.user.displayName || pending.user.email || "User"} profile removed from database.`,
        });
      }
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error("Action failed", { description: msg });
    } finally {
      setActing(false);
      setPending(null);
    }
  };

  const openEdit = (u: UserProfile) => {
    setEditing(u);
    setEditForm({
      displayName: u.displayName || "",
      photoURL: u.photoURL || "",
      role: u.role === "admin" ? "admin" : "user",

    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await updateUserProfile(editing.uid, {
        displayName: editForm.displayName.trim() || null,
        photoURL: editForm.photoURL.trim() || null,
        role: editForm.role,
      });
      toast.success("User updated", {
        description: editing.email || editing.uid,
      });
      setEditing(null);
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user";
      toast.error("Update failed", { description: msg });
    } finally {
      setSavingEdit(false);
    }
  };

  const initials = (name?: string | null) =>
    (name || "U")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const emptyMessage = search
    ? "No users match your search."
    : "No users found. Users will appear here once they register.";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Manage user accounts, roles, subscriptions, and ban status"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.total}
          icon={UsersIcon}
          accent="#3b82f6"
          delay={0}
        />
        <StatCard
          label="Admins"
          value={stats.admins}
          icon={Shield}
          accent="#e50914"
          delay={0.05}
        />
        <StatCard
          label="Regular Users"
          value={stats.regular}
          icon={UserIcon}
          accent="#10b981"
          delay={0.1}
        />
        <StatCard
          label="Banned"
          value={stats.banned}
          icon={Ban}
          accent="#f59e0b"
          delay={0.15}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {loading ? (
          <EmptyCardState message="Loading users…" icon={UsersIcon} />
        ) : filtered.length === 0 ? (
          <EmptyCardState message={emptyMessage} icon={UsersIcon} />
        ) : (
          filtered.map((u, i) => {
            const isSelf = currentUser?.uid === u.uid;
            return (
              <motion.div
                key={u.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
                className="rounded-lg border border-border bg-card p-3 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 rounded border border-border shrink-0">
                    <AvatarImage src={u.photoURL || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold rounded">
                      {initials(u.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate flex items-center gap-1">
                      <span className="truncate">{u.displayName || "Unknown"}</span>
                      {isSelf && (
                        <Badge
                          variant="outline"
                          className="border-primary/40 text-primary bg-primary/10 text-[10px] shrink-0"
                        >
                          You
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground/80 truncate">
                      {u.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {u.role === "admin" ? (
                    <Badge className="bg-primary text-primary-foreground border-transparent">
                      <Shield className="w-3 h-3" /> Admin
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground bg-muted"
                    >
                      User
                    </Badge>
                  )}
                  {u.banned ? (
                    <Badge className="bg-amber-500 text-black border-transparent">
                      <Ban className="w-3 h-3" /> Banned
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="border-border text-muted-foreground bg-muted capitalize"
                  >
                    {"free"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Joined {u.createdAt ? formatDate(u.createdAt) : "—"}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(u)}
                      className="h-9 px-2 text-primary hover:text-primary hover:bg-primary/10"
                      title="Edit user"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSelf}
                      className={
                        u.banned
                          ? "h-9 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          : "h-9 px-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                      }
                      onClick={() =>
                        setPending({
                          kind: u.banned ? "unban" : "ban",
                          user: u,
                        })
                      }
                      title={isSelf ? "Cannot ban yourself" : ""}
                    >
                      {u.banned ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Unban
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" /> Ban
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSelf}
                      className="h-9 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setPending({ kind: "delete", user: u })}
                      title={isSelf ? "Cannot delete yourself" : "Delete user"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground/80 min-w-[220px]">User</TableHead>
              <TableHead className="text-muted-foreground/80">Role</TableHead>
              <TableHead className="text-muted-foreground/80">Status</TableHead>
              <TableHead className="text-muted-foreground/80">Joined</TableHead>
              <TableHead className="text-muted-foreground/80 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyTableState colSpan={5} message="Loading users…" />
            ) : filtered.length === 0 ? (
              <EmptyTableState colSpan={5} message={emptyMessage} />
            ) : (
              filtered.map((u, i) => {
                const isSelf = currentUser?.uid === u.uid;
                return (
                  <motion.tr
                    key={u.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-border hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <Avatar className="w-9 h-9 rounded border border-border">
                          <AvatarImage src={u.photoURL || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold rounded">
                            {initials(u.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate flex items-center gap-1">
                            {u.displayName || "Unknown"}
                            {isSelf && (
                              <Badge
                                variant="outline"
                                className="border-primary/40 text-primary bg-primary/10 text-[10px]"
                              >
                                You
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground/80 truncate">
                            {u.email || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge className="bg-primary text-primary-foreground border-transparent">
                          <Shield className="w-3 h-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-border text-muted-foreground bg-muted"
                        >
                          User
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.banned ? (
                        <Badge className="bg-amber-500 text-black border-transparent">
                          <Ban className="w-3 h-3" /> Banned
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.createdAt ? formatDate(u.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {/* Edit */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(u)}
                          className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                          title="Edit user"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="ml-1 text-xs">Edit</span>
                        </Button>
                        {/* Ban/Unban */}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSelf}
                          className={
                            u.banned
                              ? "h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              : "h-8 px-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                          }
                          onClick={() =>
                            setPending({
                              kind: u.banned ? "unban" : "ban",
                              user: u,
                            })
                          }
                          title={isSelf ? "Cannot ban yourself" : ""}
                        >
                          {u.banned ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Unban
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" /> Ban
                            </>
                          )}
                        </Button>
                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSelf}
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setPending({ kind: "delete", user: u })}
                          title={isSelf ? "Cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground/80">
              Showing {filtered.length} of {users.length} users
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={loadUsers}
              className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground"
            >
              <Loader2
                className={`w-4 h-4 ${loading ? "animate-spin" : "hidden"}`}
              />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ban / Unban / Promote / Demote / Delete confirmation */}
      <AlertDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] sm:w-full md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {pending?.kind === "ban" && "Ban this user?"}
              {pending?.kind === "unban" && "Unban this user?"}
              {pending?.kind === "promote" && "Promote to admin?"}
              {pending?.kind === "demote" && "Demote to regular user?"}
              {pending?.kind === "delete" && "Delete this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              {pending?.kind === "ban" &&
                `${pending.user.displayName || pending.user.email || "This user"} will no longer be able to sign in or access the platform.`}
              {pending?.kind === "unban" &&
                `${pending.user.displayName || pending.user.email || "This user"} will regain access to the platform.`}
              {pending?.kind === "promote" &&
                `${pending.user.displayName || pending.user.email || "This user"} will gain full admin privileges including access to this panel.`}
              {pending?.kind === "demote" &&
                `${pending.user.displayName || pending.user.email || "This user"} will lose admin privileges and become a regular user.`}
              {pending?.kind === "delete" &&
                `${pending.user.displayName || pending.user.email || "This user"}'s profile, watch history, and my-list will be permanently removed from the database. Their Firebase Auth account is NOT deleted (requires server-side Admin SDK) — they will still be able to log in, but with a fresh empty profile.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={acting}
              className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={confirmAction}
              className={
                pending?.kind === "ban" || pending?.kind === "demote"
                  ? "bg-amber-500 hover:bg-amber-600 text-black border-transparent"
                  : pending?.kind === "delete"
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground border-transparent"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent"
              }
            >
              {acting && <Loader2 className="w-4 h-4 animate-spin" />}
              {pending?.kind === "delete" ? "Delete" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit user dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] sm:w-full md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" /> Edit User
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Update profile fields. Email and password can only be changed by the user themselves.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border">
                <Avatar className="w-12 h-12 rounded border border-border">
                  <AvatarImage src={editForm.photoURL || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold rounded">
                    {initials(editForm.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                    {editing.displayName || "Unknown"}
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground bg-background text-[10px]"
                    >
                      {editing.email || "—"}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    Joined {editing.createdAt ? formatDate(editing.createdAt) : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground" htmlFor="edit-name">
                  Display Name
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, displayName: e.target.value }))
                  }
                  placeholder="Display name"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground" htmlFor="edit-photo">
                  Photo URL
                </Label>
                <Input
                  id="edit-photo"
                  value={editForm.photoURL}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, photoURL: e.target.value }))
                  }
                  placeholder="https://…/avatar.jpg"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>

              <div className="space-y-2">
                  <Label className="text-muted-foreground">Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, role: v as "admin" | "user" }))
                    }
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="user">
                        <span className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5" /> User
                        </span>
                      </SelectItem>
                      <SelectItem value="admin">
                        <span className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5" /> Admin
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="rounded-md border border-border bg-muted/40 p-2.5 text-[10px] text-muted-foreground/80 flex items-start gap-1.5">
                <Mail className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Email &amp; password changes require Firebase Auth re-authentication and can
                  only be done by the user themselves from their profile page.
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={savingEdit}
              className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {savingEdit ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
