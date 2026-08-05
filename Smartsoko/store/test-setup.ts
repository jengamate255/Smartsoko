import { vi } from 'vitest';

vi.mock('react-native', () => ({
  ...vi.requireActual('react-native'),
  Platform: { OS: 'web' },
}));

vi.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

Object.defineProperty(global, 'requestAnimationFrame', {
  value: vi.fn(cb => setTimeout(cb, 16)),
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: vi.fn(id => clearTimeout(id)),
});