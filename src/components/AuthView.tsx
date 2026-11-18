import React, { useState } from 'react';
import { Eye, EyeOff, Globe, KeyRound, Lock, Mail, User, UserPlus, Users } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { LANGUAGE_OPTIONS } from '../i18n/translations';
import { AuthUser, LanguageCode, PendingUserInvite, WorkspaceSummary } from '../types/budget';

export interface AuthSuccessPayload {
  token: string;
  user: AuthUser;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary;
  pendingInvites: PendingUserInvite[];
  budget: Record<string, unknown>;
}

interface AuthViewProps {
  initialInviteCode?: string;
  onAuthenticated: (payload: AuthSuccessPayload) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialInviteCode = '',
  onAuthenticated,
}) => {
  const { lang, setLang, t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>(
    initialInviteCode ? 'register' : 'login',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [showInviteField, setShowInviteField] = useState(Boolean(initialInviteCode));
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? {
              email: email.trim(),
              password,
              inviteCode: inviteCode.trim() || undefined,
            }
          : {
              name: name.trim(),
              email: email.trim(),
              password,
              inviteCode: inviteCode.trim() || undefined,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Partial<AuthSuccessPayload> & { error?: string };
      if (!res.ok || !data.token || !data.user) {
        setError(data.error ?? t('authConnError'));
        return;
      }
      onAuthenticated(data as AuthSuccessPayload);
    } catch {
      setError(t('authConnError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            {t('brand')}
          </span>
          <div className="hidden sm:block text-xs text-slate-500 whitespace-nowrap">
            {t('authHeaderSubtitle')}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label={t('languageLabel')}
              value={lang}
              onChange={(e) => setLang(e.target.value as LanguageCode)}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.short} · {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight max-w-xl">
              {t('authHeroTitle')}
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              {t('authHeroDesc')}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6 space-y-4 max-w-xl">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-blue-700 mt-1 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {t('authFeat1Title')}
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {t('authFeat1Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-blue-700 mt-1 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {t('authFeat2Title')}
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {t('authFeat2Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-md w-full mx-auto">
            {initialInviteCode && (
              <div className="mb-5 p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 text-xs text-blue-900">
                <div className="font-semibold">{t('authInviteDetectedTitle')}</div>
                <p className="mt-0.5 text-blue-800">
                  {t('authInviteDetectedBody', { code: initialInviteCode })}
                </p>
              </div>
            )}

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('authTabLogin')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('authTabRegister')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t('authNameLabel')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      minLength={2}
                      placeholder={t('authNamePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t('authEmailLabel')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="nombre@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t('authPasswordLabel')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder={
                      mode === 'register'
                        ? t('authPasswordPlaceholderReg')
                        : t('authPasswordPlaceholderLogin')
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    aria-label="Toggle password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {showInviteField ? (
                <div>
                  <label htmlFor="auth-invite" className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t('authInviteLabel')}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-invite"
                      type="text"
                      placeholder="PF-A1B2C3"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowInviteField(true)}
                  className="text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {t('authHasInviteToggle')}
                </button>
              )}

              {error && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                {mode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {submitting ? t('authSubmitRegistering') : t('authSubmitRegister')}
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {submitting ? t('authSubmitLoggingIn') : t('authSubmitLogin')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
