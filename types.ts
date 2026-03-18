export type Language = 'en' | 'bn';
export type Difficulty = 'basic' | 'intermediate' | 'advanced';

export interface Question {
  id: number;
  category: string;
  difficulty: Difficulty;
  question: {
    en: string;
    bn: string;
  };
  options: {
    en: string[];
    bn: string[];
  };
  correctIndex: number;
}

export interface GameState {
  currentQuestionIndex: number;
  score: number;
  isGameOver: boolean;
  userAnswers: (number | null)[];
  language: Language;
  isStarted: boolean;
}
