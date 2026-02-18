import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { addWeekInfo, type PostWithWeek } from './weekGrouping';
import { POSTS_PER_PAGE, CONTAINER_IDS } from './constants';
import { detectContentIndicators, type ContentIndicators } from './contentIndicators';

export type BlogPost = CollectionEntry<'blog'>;

export interface PostWithIndicators {
  post: BlogPost;
  indicators: ContentIndicators;
}

export interface PostsResult {
  posts: BlogPost[];
  postsWithWeek: PostWithWeek<BlogPost>[];
  postsWithIndicators: Map<string, ContentIndicators>;
  totalPages: number;
  containerId: string;
}

export async function getPosts(projectId?: string): Promise<PostsResult> {
  let posts = (await getCollection('blog'))
    .filter(post => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  if (projectId) {
    posts = posts.filter(post => post.data.project === projectId);
  }

  const postsWithWeek = addWeekInfo(posts);
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const containerId = CONTAINER_IDS.posts;

  const postsWithIndicators = new Map<string, ContentIndicators>();
  for (const post of posts) {
    postsWithIndicators.set(post.id, detectContentIndicators(post.body));
  }

  return {
    posts,
    postsWithWeek,
    postsWithIndicators,
    totalPages,
    containerId,
  };
}
