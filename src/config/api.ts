// In production (EC2), use relative URL. In development, use env var or localhost.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

export default API_BASE_URL;
