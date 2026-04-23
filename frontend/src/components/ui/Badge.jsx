const map = {
  SCHEDULED: 'badge-scheduled',
  PUBLISHED: 'badge-published',
  FAILED:    'badge-failed',
  DRAFT:     'badge-draft',
};

const Badge = ({ status }) => (
  <span className={map[status] || 'badge-draft'}>{status}</span>
);

export default Badge;
