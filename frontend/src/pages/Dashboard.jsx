import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusSquare, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { format } from 'date-fns';

// Stat card component
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`rounded-lg p-2.5 ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user }   = useAuth();
  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    postsAPI.getAll()
      .then(({ data }) => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total:     posts.length,
    scheduled: posts.filter((p) => p.status === 'SCHEDULED').length,
    published: posts.filter((p) => p.status === 'PUBLISHED').length,
    failed:    posts.filter((p) => p.status === 'FAILED').length,
  };

  const recent = [...posts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Good day, {user?.name || 'there'} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">Here's your posting overview</p>
        </div>
        <Link to="/create" className="btn-primary">
          <PlusSquare className="h-4 w-4" />
          New Post
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={FileText}    label="Total Posts"  value={counts.total}     color="bg-gray-100 text-gray-600" />
            <StatCard icon={Clock}       label="Scheduled"    value={counts.scheduled} color="bg-blue-50 text-blue-600" />
            <StatCard icon={CheckCircle} label="Published"    value={counts.published} color="bg-green-50 text-green-600" />
            <StatCard icon={XCircle}     label="Failed"       value={counts.failed}    color="bg-red-50 text-red-600" />
          </div>

          {/* Recent Posts */}
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Posts</h2>
              <Link to="/scheduled" className="text-sm text-brand-600 hover:underline">
                View all →
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No posts yet.{' '}
                <Link to="/create" className="text-brand-600 hover:underline">
                  Create your first post
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recent.map((post) => (
                  <div key={post.id} className="flex items-start justify-between py-3">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {post.caption}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {post.platforms.join(', ')} ·{' '}
                        {format(new Date(post.scheduledTime), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge status={post.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
