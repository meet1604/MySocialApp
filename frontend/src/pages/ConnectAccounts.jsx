import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Unlink, AlertCircle } from 'lucide-react';

const IgIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);
const LiIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
import { socialAPI } from '../services/api';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PLATFORM_META = {
  INSTAGRAM: {
    label:       'Instagram',
    Icon:        IgIcon,
    description: 'Connect your Instagram Business account to publish feed posts.',
    iconBg:      'bg-gradient-to-br from-pink-500 to-purple-600',
    connect:     () => socialAPI.connectInstagram(),
  },
  LINKEDIN: {
    label:       'LinkedIn',
    Icon:        LiIcon,
    description: 'Connect your LinkedIn profile to publish text and image posts.',
    iconBg:      'bg-blue-600',
    connect:     () => socialAPI.connectLinkedIn(),
  },
};

const ConnectAccounts = () => {
  const [searchParams] = useSearchParams();
  const [status,       setStatus]       = useState({});
  const [loading,      setLoading]      = useState(true);
  const [disconnecting, setDisconnecting] = useState(null);

  // Show toast on redirect back from OAuth
  useEffect(() => {
    const success = searchParams.get('success');
    const error   = searchParams.get('error');
    if (success) toast.success(`${success.charAt(0).toUpperCase() + success.slice(1)} connected!`);
    if (error)   toast.error(`Failed to connect: ${error.replace(/_/g, ' ')}`);
  }, []);

  useEffect(() => {
    socialAPI.status()
      .then(({ data }) => setStatus(data.status || {}))
      .catch(() => toast.error('Failed to load account status.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDisconnect = async (platform) => {
    if (!window.confirm(`Disconnect ${platform}?`)) return;
    setDisconnecting(platform);
    try {
      await socialAPI.disconnect(platform.toLowerCase());
      setStatus((s) => { const n = { ...s }; delete n[platform]; return n; });
      toast.success(`${platform} disconnected.`);
    } catch {
      toast.error('Failed to disconnect.');
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connect Accounts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Link your social media accounts to start publishing posts.
        </p>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          Instagram requires a <strong>Business account</strong> linked to a Facebook Page.
          Personal Instagram accounts are not supported.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(PLATFORM_META).map(([key, meta]) => {
            const connected = status[key];
            const Icon      = meta.Icon;

            return (
              <div key={key} className="card flex flex-col gap-4">
                {/* Platform header */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.iconBg}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-400">{meta.description}</p>
                  </div>
                </div>

                {/* Status */}
                {connected ? (
                  <div className="rounded-lg bg-green-50 border border-green-100 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      Connected as <span className="font-semibold">{connected.accountName}</span>
                    </div>
                    {connected.expiresAt && (
                      <p className="text-xs text-green-600 pl-6">
                        Token expires {format(new Date(connected.expiresAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm text-gray-400">
                    Not connected
                  </div>
                )}

                {/* Action */}
                {connected ? (
                  <button
                    onClick={() => handleDisconnect(key)}
                    disabled={disconnecting === key}
                    className="btn-danger w-full"
                  >
                    {disconnecting === key ? (
                      <Spinner size="sm" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={meta.connect}
                    className="btn-primary w-full"
                  >
                    <Icon className="h-4 w-4" />
                    Connect {meta.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConnectAccounts;
