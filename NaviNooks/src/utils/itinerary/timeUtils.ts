// Helper functions for time calculations
export const parseTime = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

export const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

// Helper function to add minutes to time string
export const addMinutesToTime = (timeString: string, minutes: number): string => {
  try {
    const date = parseTime(timeString);
    const newDate = addMinutes(date, minutes);
    return formatTime(newDate);
  } catch (error) {
    console.warn('Error adding minutes to time:', error);
    return timeString;
  }
};

// Get the date for the current day being displayed
export const getCurrentDate = (formData: any): string => {
  if (formData?.startDate) {
    return formData.startDate;
  }
  return new Date().toISOString().split('T')[0];
};

// Get day of week from date string in a timezone-safe way
export const getDayOfWeekSafe = (dateString: string): number => {
  // Use local date parsing to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
};

// Format time duration (minutes) to readable format
export const formatDuration = (minutes: number): string => {
  if (isNaN(minutes) || minutes < 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

// Convert time string to minutes since midnight
export const timeToMinutes = (timeString: string): number => {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.warn('Error converting time to minutes:', error);
    return 0;
  }
};

// Convert minutes since midnight to time string
export const minutesToTime = (minutes: number): string => {
  try {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  } catch (error) {
    console.warn('Error converting minutes to time:', error);
    return '00:00';
  }
};

// Calculate time difference between two time strings in minutes
export const getTimeDifference = (startTime: string, endTime: string): number => {
  try {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Handle overnight times
    if (endMinutes < startMinutes) {
      return (24 * 60) - startMinutes + endMinutes;
    }
    
    return endMinutes - startMinutes;
  } catch (error) {
    console.warn('Error calculating time difference:', error);
    return 0;
  }
};