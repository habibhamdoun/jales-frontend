export const formatTime = (minutesAgo: number): string => {
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }
  const hours = Math.floor(minutesAgo / 60);
  return `${hours}h ago`;
};

export const formatDuration = (hours: number, minutes: number): string => {
  return `${hours}h ${minutes}m`;
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const formatAngle = (angle: number): string => {
  return `${angle}°`;
};

export const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
};

export const formatShortDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
};
