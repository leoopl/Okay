import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: string;
  link: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  color = 'okay-blue-medium',
  link,
}) => {
  return (
    <a
      href={link}
      className="card group flex flex-col items-center bg-white/20 text-center transition-all duration-300 hover:-translate-y-1"
    >
      <div
        className={`rounded-full p-4 bg-${color}/10 text-${color} mb-4 transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon size={32} />
      </div>
      <h3 className="text-green-dark mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-gray-700">{description}</p>
    </a>
  );
};

export default FeatureCard;
