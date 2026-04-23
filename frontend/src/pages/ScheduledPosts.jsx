import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Pencil, Trash2, PlusSquare, RefreshCw } from 'lucide-react';
import { postsAPI } from '../services/api';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_FILTERS = ['ALL', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'DRAFT'];

const ScheduledPosts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get('status') || 'ALL';

  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(null); // id of post being deleted

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = activeFilter !== 'ALL' ? { status: activeFilter } : {};
      const { data } = await postsAPI.getAll(params);
      setPosts(data.posts || []);
    } catch (err) {
      toast.error('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [activeFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    setDeleting(id);
    try {
      await postsAPI.delete(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Post deleted.');
    } catch {
      toast.error('Failed to delete post.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your scheduled and published posts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPosts} className="btn-secondary p-2">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link to="/create" className="btn-primary">
            <PlusSquare className="h-4 w-4" />
            New Post
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setSearchParams(f === 'ALL' ? {} : { status: f })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No posts found"
          description="Schedule your first post to see it here."
          action={
            <Link to="/create" className="btn-primary">
              <PlusSquare className="h-4 w-4" /> Create Post
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="card flex items-start gap-4">
              {/* Thumbnail */}
              {post.mediaUrl ? (
                <img
                  src={post.mediaUrl}
                  alt=""
                  className="h-16 w-16 flex-shrink-0 rounded-lg object-cover bg-gray-100"
                />
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                  <PlusSquare className="h-6 w-6" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-gray-900">
                  {post.caption}
                </p>
                {post.hashtags?.length > 0 && (
                  <p className="mt-0.5 truncate text-xs text-brand-600">
                    {post.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(post.scheduledTime), 'MMM d, yyyy · h:mm a')}
                  </span>
                  <span>{post.platforms.join(', ')}</span>
                </div>
                {post.errorMessage && (
                  <p className="mt-1 text-xs text-red-500">{post.errorMessage}</p>
                )}
              </div>

              {/* Badge + actions */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <Badge status={post.status} />
                <div className="flex items-center gap-1">
                  {['DRAFT', 'SCHEDULED'].includes(post.status) && (
                    <Link
                      to={`/edit/${post.id}`}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    {deleting === post.id
                      ? <Spinner size="sm" />
                      : <Trash2 className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduledPosts;
