'use client';

import Link from 'next/link';
import { SMS_PROGRAM_NAME, SMS_OPT_IN_SUMMARY } from '../../lib/sms-consent-copy';

export type LiveTradeSmsOptInProps = {
  phoneNumber: string;
  showPhoneNumber: boolean;
  tradeNotifSms: boolean;
  smsConsent: boolean;
  smsSaving: boolean;
  onPhoneChange: (value: string) => void;
  onToggleShowPhone: () => void;
  onTradeNotifSmsChange: (enabled: boolean) => void;
  onSmsConsentChange: (agreed: boolean) => void;
  onSave: () => void;
  /** Use switch-style control for “enable SMS” (notifications page) vs checkbox (trades page). */
  enableSmsVariant?: 'checkbox' | 'toggle';
  /** Inline status after save (e.g. “Saved” / error). */
  smsMessage?: string;
};

export function LiveTradeSmsOptIn({
  phoneNumber,
  showPhoneNumber,
  tradeNotifSms,
  smsConsent,
  smsSaving,
  onPhoneChange,
  onToggleShowPhone,
  onTradeNotifSmsChange,
  onSmsConsentChange,
  onSave,
  enableSmsVariant = 'checkbox',
  smsMessage,
}: LiveTradeSmsOptInProps) {
  const saveDisabled =
    smsSaving ||
    (tradeNotifSms && (!phoneNumber.trim() || !smsConsent));

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Live trades via SMS</p>
      <p className="text-xs text-zinc-400 leading-relaxed">
        <span className="font-medium text-zinc-300">{SMS_PROGRAM_NAME}.</span> {SMS_OPT_IN_SUMMARY}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex items-center">
          <input
            type={showPhoneNumber ? 'tel' : 'password'}
            value={phoneNumber}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="5551234567 or +1 555 123 4567"
            autoComplete="tel"
            className="w-48 min-w-[12rem] pl-3 pr-16 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          />
          <button
            type="button"
            onClick={onToggleShowPhone}
            className="absolute right-2 px-2 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {showPhoneNumber ? 'Hide' : 'Show'}
          </button>
        </div>

        {enableSmsVariant === 'toggle' ? (
          <label className="flex items-center gap-2 cursor-pointer group">
            <button
              type="button"
              onClick={() => onTradeNotifSmsChange(!tradeNotifSms)}
              disabled={smsSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 ${
                tradeNotifSms ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  tradeNotifSms ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-zinc-300 group-hover:text-zinc-100">SMS alerts on</span>
          </label>
        ) : (
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={tradeNotifSms}
              onChange={(e) => onTradeNotifSmsChange(e.target.checked)}
              disabled={smsSaving}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300 group-hover:text-zinc-100">SMS alerts on</span>
          </label>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {smsSaving ? 'Saving…' : 'Save'}
        </button>
        {smsMessage && (
          <span
            className={`text-xs ${smsMessage === 'Saved' ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {smsMessage}
          </span>
        )}
      </div>

      <label
        className={`flex gap-3 cursor-pointer rounded-lg border p-3 transition-colors ${
          tradeNotifSms
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-zinc-800 bg-zinc-900/40 opacity-60'
        }`}
      >
        <input
          type="checkbox"
          checked={smsConsent}
          onChange={(e) => onSmsConsentChange(e.target.checked)}
          disabled={smsSaving || !tradeNotifSms}
          className="mt-0.5 w-4 h-4 shrink-0 rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
        />
        <span className="text-xs text-zinc-300 leading-relaxed">
          I agree to receive <strong className="text-zinc-200">recurring automated text messages</strong> from Primate
          Trading at the number I provided, for <strong className="text-zinc-200">live trade alerts only</strong> (e.g. new
          entries, size, optional stop/target). <strong className="text-zinc-200">Message frequency varies</strong> with
          trading activity. <strong className="text-zinc-200">Message and data rates may apply.</strong> Carriers are not
          liable for delayed or undelivered messages. I confirm I am the account holder or have permission to add this
          number. I have read and agree to how we handle this data in our{' '}
          <Link href="/privacy" className="text-emerald-400 hover:underline">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="text-emerald-400 hover:underline">
            Terms of Service
          </Link>
          . I understand I can opt out at any time by replying <strong className="text-zinc-200">STOP</strong> to a
          message, turning off SMS here and saving, or contacting{' '}
          <a href="mailto:nickthomasfx@gmail.com" className="text-emerald-400 hover:underline">
            nickthomasfx@gmail.com
          </a>
          . For help, reply <strong className="text-zinc-200">HELP</strong> or email us.
        </span>
      </label>

      {!tradeNotifSms && (
        <p className="text-[11px] text-zinc-500">Turn on SMS alerts above to confirm consent.</p>
      )}

      <p className="text-[11px] text-zinc-500">
        US mobile numbers (10 digits) or E.164. Not all carriers may be supported. We use a messaging provider (e.g.
        Twilio) to deliver texts.
      </p>
    </div>
  );
}
