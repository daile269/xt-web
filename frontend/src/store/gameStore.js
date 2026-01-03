import { create } from 'zustand';

export const useGameStore = create((set) => ({
  currentRoom: null,
  gameState: null,
  players: [],
  
  setCurrentRoom: (room) => set({ currentRoom: room }),
  
  setGameState: (state) => set({ gameState: state }),
  
  updatePlayers: (players) => set({ players }),
  
  resetGame: () => set({ 
    currentRoom: null, 
    gameState: null, 
    players: [] 
  }),
}));
