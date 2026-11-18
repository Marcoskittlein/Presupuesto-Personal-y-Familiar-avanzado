import React, { useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  Link2,
  MailPlus,
  Plus,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { AuthUser, PendingUserInvite, WorkspaceSummary } from '../types/budget';

interface ShareWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary;
  pendingInvites: PendingUserInvite[];
  onSwitchWorkspace: (workspaceId: string) => Promise<void>;
  onCreateWorkspace: (name: string) => Promise<void>;
  onRenameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  onCreateInvite: (workspaceId: string, email?: string) => Promise<void>;
  onRevokeInvite: (workspaceId: string, code: string) => Promise<void>;
  onJoinByCode: (code: string) => Promise<void>;
  onRemoveMember: (workspaceId: string, memberId: string) => Promise<void>;
}

export const ShareWorkspaceModal: React.FC<ShareWorkspaceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  workspaces,
  activeWorkspace,
  pendingInvites,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onCreateInvite,
  onRevokeInvite,
  onJoinByCode,
  onRemoveMember,
}) => {
  const { locale, t } = useI18n();
  const [inviteEmail, setInviteEmail] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [renameValue, setRenameValue] = useState(activeWorkspace.name);
  const [editingName, setEditingName] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOwner = activeWorkspace.ownerId === currentUser.id;

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      setError(t('shareCopyError'));
    }
  };

  const buildInviteLink = (code: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('invite', code);
    url.hash = '';
    return url.toString();
  };

  const runAction = async (fn: () => Promise<void>, successMessage?: string) => {
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await fn();
      if (successMessage) setFeedback(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authConnError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-ws-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 id="share-ws-title" className="text-lg font-semibold text-slate-900">
              {t('shareModalTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('shareModalDesc')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={t('simClose')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
              {error}
            </div>
          )}
          {feedback && (
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-900">
              {feedback}
            </div>
          )}

          {/* Pending Direct Invitations */}
          {pendingInvites.length > 0 && (
            <section className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3">
              <div className="text-xs font-semibold text-blue-900">
                {t('sharePendingTitle', { email: currentUser.email })}
              </div>
              <div className="space-y-2">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv.code}
                    className="flex flex-wrap items-center justify-between gap-3 bg-white border border-blue-200 rounded-lg px-3.5 py-2.5"
                  >
                    <div className="text-xs">
                      <div className="font-semibold text-slate-900">{inv.workspaceName}</div>
                      <div className="text-slate-600 mt-0.5">
                        {t('shareInvitedBy', { name: inv.createdByName })}{' '}
                        <span className="font-mono font-medium">{inv.code}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => onJoinByCode(inv.code),
                          t('shareJoinedMsg', { name: inv.workspaceName }),
                        )
                      }
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {t('shareJoinNow')}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Workspace Info & Switcher */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{t('shareActiveTitle')}</h3>
              {isOwner && !editingName && (
                <button
                  type="button"
                  onClick={() => {
                    setRenameValue(activeWorkspace.name);
                    setEditingName(true);
                  }}
                  className="text-xs font-medium text-blue-700 hover:text-blue-900"
                >
                  {t('shareRenameBtn')}
                </button>
              )}
            </div>

            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  disabled={busy || !renameValue.trim()}
                  onClick={() =>
                    runAction(async () => {
                      await onRenameWorkspace(activeWorkspace.id, renameValue.trim());
                      setEditingName(false);
                    }, t('shareNameUpdated'))
                  }
                  className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  {t('shareSave')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  {t('shareCancel')}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={activeWorkspace.id}
                  onChange={(e) => runAction(() => onSwitchWorkspace(e.target.value))}
                  aria-label={t('shareActiveTitle')}
                  className="flex-1 min-w-[220px] px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} ({ws.members.length}{' '}
                      {ws.members.length === 1 ? t('memberSingular') : t('memberPlural')})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* Invite Another User */}
          <section className="border-t border-slate-200 pt-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {t('shareInviteTitle', { name: activeWorkspace.name })}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('shareInviteDesc')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                placeholder={t('shareInviteEmailPh')}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 min-w-[210px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(async () => {
                    await onCreateInvite(activeWorkspace.id, inviteEmail.trim() || undefined);
                    setInviteEmail('');
                  }, t('shareInviteCreatedMsg'))
                }
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <MailPlus className="w-3.5 h-3.5" />
                {t('shareInviteCreate')}
              </button>
            </div>

            {activeWorkspace.invites.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-700">
                  {t('shareActiveInvites', { count: activeWorkspace.invites.length })}
                </div>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {activeWorkspace.invites.map((inv) => {
                    const link = buildInviteLink(inv.code);
                    return (
                      <div
                        key={inv.code}
                        className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900">
                              {inv.code}
                            </span>
                            {inv.invitedEmail ? (
                              <span className="text-slate-600">
                                {t('shareInviteFor', { email: inv.invitedEmail })}
                              </span>
                            ) : (
                              <span className="text-slate-500">{t('shareInviteReusable')}</span>
                            )}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {t('shareInviteMeta', {
                              name: inv.createdByName,
                              date: new Date(inv.expiresAt).toLocaleDateString(locale),
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyText(inv.code, `code-${inv.code}`)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            {copiedKey === `code-${inv.code}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" /> {t('shareCopied')}
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> {t('shareCodeBtn')}
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyText(link, `link-${inv.code}`)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            {copiedKey === `link-${inv.code}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" /> {t('shareCopied')}
                              </>
                            ) : (
                              <>
                                <Link2 className="w-3 h-3" /> {t('shareLinkBtn')}
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              runAction(() => onRevokeInvite(activeWorkspace.id, inv.code))
                            }
                            aria-label={inv.code}
                            className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Current Members List */}
          <section className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                {t('shareMembersTitle', { count: activeWorkspace.members.length })}
              </h3>
            </div>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {activeWorkspace.members.map((member) => {
                const isSelf = member.userId === currentUser.id;
                const canRemove = member.role !== 'owner' && (isOwner || isSelf);
                return (
                  <div
                    key={member.userId}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {member.name}
                        {isSelf && <span className="font-normal text-slate-500">{t('shareYou')}</span>}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {member.email} ·{' '}
                        {member.role === 'owner' ? t('shareRoleOwner') : t('shareRoleEditor')}
                      </div>
                    </div>
                    {canRemove && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            () => onRemoveMember(activeWorkspace.id, member.userId),
                            isSelf ? t('shareLeftMsg') : t('shareRemovedMsg'),
                          )
                        }
                        className="px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 border border-red-200 rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        {isSelf ? t('shareLeaveBtn') : t('shareRemoveBtn')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Join Another Shared Workspace or Create New Workspace */}
          <section className="border-t border-slate-200 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-900">{t('shareJoinCodeTitle')}</h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="PF-7X9K2M"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy || !joinCode.trim()}
                  onClick={() =>
                    runAction(async () => {
                      await onJoinByCode(joinCode.trim());
                      setJoinCode('');
                    }, t('shareJoinedCodeMsg'))
                  }
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0"
                >
                  {t('shareJoinBtn')}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-900">{t('shareCreateWsTitle')}</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t('shareCreateWsPh')}
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  disabled={busy || !newWorkspaceName.trim()}
                  onClick={() =>
                    runAction(async () => {
                      await onCreateWorkspace(newWorkspaceName.trim());
                      setNewWorkspaceName('');
                    }, t('shareCreatedWsMsg'))
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-800 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('shareCreateWsBtn')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
