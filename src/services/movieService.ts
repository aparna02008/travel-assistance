import { Movie } from '../types';

const DEFAULT_TMDB_KEY = '328f2cc351b46f65fdb02cfb187917b1';

const isValidTmdbKey = (key?: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  // Valid TMDB v3 API key is a 32-character hexadecimal string
  return key.length === 32 && /^[a-f0-9]{32}$/i.test(key);
};

const rawKey = import.meta.env.VITE_TMDB_KEY;
const TMDB_KEY = isValidTmdbKey(rawKey) ? rawKey : DEFAULT_TMDB_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

// Cache to avoid repeated calls
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const cachedFetch = async (url: string) => {
  if (cache.has(url)) {
    const cached = cache.get(url);
    if (cached && (Date.now() - cached.time < CACHE_TTL)) {
      return cached.data;
    }
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    const data = await res.json();
    cache.set(url, { data, time: Date.now() });
    return data;
  } catch (err) {
    console.warn('TMDb fetch failed for URL:', url, err);
    throw err;
  }
};

export const getNowPlaying = async (): Promise<Movie[]> => {
  try {
    const data = await cachedFetch(
      `${TMDB_BASE}/movie/now_playing?api_key=${TMDB_KEY}&region=IN&language=en-IN&page=1`
    );
    if (data && data.results) {
      return data.results.slice(0, 10).map((m: any) => ({
        id: m.id,
        title: m.title,
        poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
        rating: m.vote_average ? m.vote_average.toFixed(1) : '7.0',
        releaseDate: m.release_date,
        overview: m.overview || ''
      }));
    }
    throw new Error('Invalid now playing format');
  } catch (err) {
    console.warn('TMDb getNowPlaying failed, returning fallback now playing movies:', err);
    return getFallbackMovies();
  }
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  try {
    const data = await cachedFetch(
      `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&region=IN`
    );
    if (data && data.results) {
      return data.results.slice(0, 6).map((m: any) => ({
        id: m.id,
        title: m.title,
        poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
        rating: m.vote_average ? m.vote_average.toFixed(1) : '7.0',
        overview: m.overview || ''
      }));
    }
    throw new Error('Invalid search response');
  } catch (err) {
    console.warn('TMDb searchMovies failed, returning fallback filtered search results:', err);
    return getFallbackMovies().filter(m => m.title.toLowerCase().includes(query.toLowerCase()));
  }
};

export const searchByActor = async (actorName: string): Promise<Movie[]> => {
  try {
    const personData = await cachedFetch(
      `${TMDB_BASE}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(actorName)}`
    );
    if (!personData.results?.length) return [];
    const personId = personData.results[0].id;
    const credits = await cachedFetch(
      `${TMDB_BASE}/person/${personId}/movie_credits?api_key=${TMDB_KEY}`
    );
    if (credits && credits.cast) {
      return credits.cast
        .filter((m: any) => m.release_date && new Date(m.release_date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
        .slice(0, 5)
        .map((m: any) => ({
          id: m.id,
          title: m.title,
          poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
          rating: m.vote_average ? m.vote_average.toFixed(1) : '7.0',
          overview: m.overview || ''
        }));
    }
    return [];
  } catch (err) {
    console.warn('TMDb searchByActor failed, returning empty:', err);
    return [];
  }
};

// Fallback high-quality Indian and popular global movies shown when TMDB fails
const getFallbackMovies = (): Movie[] => {
  return [
    {
      id: 101,
      title: 'Jawan',
      poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=500&q=80',
      rating: '8.1',
      releaseDate: '2023-09-07',
      overview: 'A high-octane action thriller which outlines the emotional journey of a man who is set to rectify the wrongs in the society.'
    },
    {
      id: 102,
      title: 'Leo',
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80',
      rating: '7.9',
      releaseDate: '2023-10-19',
      overview: 'An ordinary cafe owner becomes a target of a gang who believes him to be the estranged son of a ruthless mob boss.'
    },
    {
      id: 103,
      title: 'RRR',
      poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80',
      rating: '8.4',
      releaseDate: '2022-03-24',
      overview: 'A fictional history of two legendary revolutionaries and their journey away from home before they started fighting for their country.'
    },
    {
      id: 104,
      title: 'Kalki 2898 AD',
      poster: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=500&q=80',
      rating: '8.0',
      releaseDate: '2024-06-27',
      overview: 'A modern avatar of Vishnu, a Hindu god, who is believed to have descended to earth to protect the world from evil forces.'
    },
    {
      id: 105,
      title: 'Pushpa 2: The Rule',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=500&q=80',
      rating: '8.2',
      releaseDate: '2024-12-05',
      overview: 'The clash continues between Pushpa Raj and SP Bhanwar Singh Shekhawat in this epic high-stakes continuation.'
    }
  ];
};
