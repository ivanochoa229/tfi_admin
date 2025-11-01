import './StatsCard.css';

interface StatsCardProps {
  title: string;
  value: number | string;
  trend?: string;
}

const StatsCard = ({ title, value, trend }: StatsCardProps) => (
  <article className="stats-card">
    <h3>{title}</h3>
    <p className="stats-card__value">{value}</p>
    {trend && <span className="stats-card__trend">{trend}</span>}
  </article>
);

export default StatsCard;