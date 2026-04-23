import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ImageIcon, Share2 } from 'lucide-react';
import { postsAPI } from '../services/api';
import toast from 'react-hot-toast';

// SVG brand icons (lucide-react doesn't include brand logos)
const IgIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);
const LiIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
const PLATFORMS = [
  { key: 'INSTAGRAM', label: 'Instagram', Icon: IgIcon, color: 'text-pink-500' },
  { key: 'LINKEDIN',  label: 'LinkedIn',  Icon: LiIcon, color: 'text-blue-600' },
];

const CreatePost = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    caption:       '',
    hashtags:      '',
    scheduledTime: '',
    platforms:     [],
    status:        'SCHEDULED',
  });
  const [mediaFile,    setMediaFile]    = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted) => {
    const file = accepted[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  // ── Platform toggle ─────────────────────────────────────────────────────────
  const togglePlatform = (key) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(key)
        ? f.platforms.filter((p) => p !== key)
        : [...f.platforms, key],
    }));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.caption.trim())      return setError('Caption is required.');
    if (!form.platforms.length)    return setError('Select at least one platform.');
    if (!form.scheduledTime)       return setError('Scheduled time is required.');
    if (new Date(form.scheduledTime) <= new Date())
      return setError('Scheduled time must be in the future.');

    try {
      setSubmitting(true);
      let mediaUrl = null;

      // Upload media first if a file was selected
      if (mediaFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('media', mediaFile);
        const { data } = await postsAPI.uploadMedia(fd);
        mediaUrl = data.mediaUrl;
        setUploading(false);
      }

      const hashtags = form.hashtags
        .split(/[\s,]+/)
        .map((h) => h.trim())
        .filter(Boolean);

      await postsAPI.create({
        caption:       form.caption,
        hashtags,
        mediaUrl,
        platforms:     form.platforms,
        scheduledTime: new Date(form.scheduledTime).toISOString(),
        status:        form.status,
      });

      toast.success('Post scheduled!');
      navigate('/scheduled');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Post</h1>
        <p className="mt-1 text-sm text-gray-500">Schedule a post to Instagram or LinkedIn</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {/* Caption */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Content</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Caption</label>
            <textarea
              rows={4}
              className="input resize-none"
              placeholder="Write your post caption…"
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
            />
            <p className="mt-1 text-xs text-gray-400">{form.caption.length} chars</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hashtags
            </label>
            <input
              className="input"
              placeholder="#marketing #socialmedia (space or comma separated)"
              value={form.hashtags}
              onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
            />
          </div>
        </div>

        {/* Media Upload */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Media</h2>
          {mediaPreview ? (
            <div className="relative inline-block">
              <img
                src={mediaPreview}
                alt="preview"
                className="h-48 w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={removeMedia}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 transition-colors ${
                isDragActive
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-brand-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="rounded-full bg-gray-100 p-3">
                {isDragActive ? (
                  <Upload className="h-6 w-6 text-brand-600" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-700">
                {isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-gray-400">JPG, PNG, GIF, MP4 — max 50 MB</p>
            </div>
          )}
        </div>

        {/* Platforms */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Platforms</h2>
          <div className="flex gap-3">
            {PLATFORMS.map(({ key, label, Icon, color }) => {
              const selected = form.platforms.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${
                    selected
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className={selected ? 'text-brand-600' : color}><Icon /></span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Schedule</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Date & Time
            </label>
            <input
              type="datetime-local"
              className="input"
              value={form.scheduledTime}
              onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="SCHEDULED">Scheduled (auto-publish)</option>
              <option value="DRAFT">Draft (save for later)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1"
          >
            {uploading ? 'Uploading media…' : submitting ? 'Scheduling…' : 'Schedule Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
