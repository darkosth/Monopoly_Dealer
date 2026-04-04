import { create } from 'zustand';

export const useGameStore = create((set) => ({
  // ==========================================
  // 1. STATE (Los datos actuales de la partida)
  // ==========================================
  roomCode: null,
  players: [],
  transactions: [],
  freeParkingAmount: 0,
  
  // Guardamos el ID del jugador que está usando el celular actual.
  // Esto es vital para saber qué botones mostrar (ej. no puedes pagarte a ti mismo).
  currentUserId: null, 

  // ==========================================
  // 2. ACTIONS (Funciones para actualizar los datos)
  // ==========================================
  
  // Función para cargar los datos cuando entras a la sala por primera vez
  setGameData: (roomCode, players, freeParkingAmount, currentUserId) => 
    set({ roomCode, players, freeParkingAmount, currentUserId }),

  // Función para actualizar la lista completa de jugadores
  setPlayers: (players) => set({ players }),

  // Función quirúrgica: Solo actualiza el balance de un jugador específico
  updatePlayerBalance: (playerId, newBalance) => 
    set((state) => ({
      players: state.players.map((player) => 
        player.id === playerId ? { ...player, balance: newBalance } : player
      )
    })),

    addPlayer: (newPlayer) => 
    set((state) => ({ 
      players: [...state.players, newPlayer] 
    })),

  // Agrega un nuevo movimiento al historial (poniendo el más reciente arriba)
  addTransaction: (transaction) => 
    set((state) => ({
      transactions: [transaction, ...state.transactions]
    })),

  // Actualiza el pozo del Free Parking
  updateFreeParking: (amount) => set({ freeParkingAmount: amount }),

  // Función para limpiar la memoria si el jugador sale de la sala
  clearGame: () => set({ 
    roomCode: null, 
    players: [], 
    transactions: [], 
    freeParkingAmount: 0, 
    currentUserId: null 
  })
}));