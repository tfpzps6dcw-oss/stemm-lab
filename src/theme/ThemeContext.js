// STEM-152: Theme context lives here to avoid circular imports between App.js and screens.
import { createContext, useContext } from 'react';
import { lightTheme } from './index';

export const ThemeContext = createContext(lightTheme);
export function useTheme() { return useContext(ThemeContext); }