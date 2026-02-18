export interface PostWithWeek<T> {
  post: T;
  weekKey: string;
  weekLabel: string;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a week range string (e.g., "Jan 6 — Jan 12, 2025")
 */
export function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} — ${endStr}`;
}

/**
 * Add week grouping info to posts
 */
export function addWeekInfo<T extends { data: { date: Date } }>(posts: T[]): PostWithWeek<T>[] {
  return posts.map(post => ({
    post,
    weekKey: getWeekStart(post.data.date).toISOString(),
    weekLabel: formatWeekRange(getWeekStart(post.data.date))
  }));
}

/**
 * Check if a post is the first of its week in the list
 */
export function isFirstOfWeek<T>(
  postsWithWeek: PostWithWeek<T>[],
  index: number
): boolean {
  if (index === 0) return true;
  return postsWithWeek[index - 1].weekKey !== postsWithWeek[index].weekKey;
}
