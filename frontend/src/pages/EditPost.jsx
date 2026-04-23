import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { postsAPI } from '../services/api';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const PLATFORMS = ['INSTAGRAM', 'LINKEDIN'];

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form,     setForm]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    postsAPI.getOne(id)
      .then(({ data }) => {
        const p = data.post;
        setForm({
          caption:       p.caption,
          hashtags:      p.hashtags?.join(' ') || '',
          platforms:     p.platforms || [],
          scheduledTime: new Date(p.scheduledTime).toISOString().slice(0, 16),
          status:        p.status,
        });
      })
      .catch(() => { toast.error('Post not found.'); navigate('/scheduled'); })
      .finally(() => setLoading(false));
  }, [id]);

  const togglePlatform = (key) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(key)
        ? f.platforms.filter((p) => p !== key)
        : [...f.platforms, key],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.caption.trim()) return setError('Caption is required.');
    if (!form.platforms.length) return setError('Select at least one platform.');

    setSaving(true);
    try {
      const hashtags = form.hashtags.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean);
      await postsAPI.update(id, {
        caption:       form.caption,
        hashtags,
        platforms:     form.platforms,
        scheduledTime: new Date(form.scheduledTime).toISOString(),
        status:        form.status,
      });
      toast.success('Post updated!');
      navigate('/scheduled');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update post.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
        <p className="mt-1 text-sm text-gray-500">Update your scheduled post</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Caption</label>
            <textarea
              rows={4}
              className="input resize-none"
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hashtags</label>
            <input
              className="input"
              placeholder="#tag1 #tag2"
              value={form.hashtags}
              onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
            />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Platforms</h2>
          <div className="flex gap-3">
            {PLATFORMS.map((key) => {
              const selected = form.platforms.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`flex flex-1 items-center justify-center rounded-lg border-2 py-3 text-sm font-medium transition-all ${
                    selected
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Schedule</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date & Time</label>
            <input
              type="datetime-local"
              className="input"
              value={form.scheduledTime}
              onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPost;
