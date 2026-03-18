import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Play, RotateCcw, Home, CheckCircle2, XCircle, Timer, Trophy, Star, Frown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { QUESTIONS } from './data';
import { Language, Question, Difficulty } from './types';

// Sound utility using Web Audio API
const playSound = (type: 'correct' | 'wrong') => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Set low volume as requested
  gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);

  if (type === 'correct') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } else {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
    oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2); // A2
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  }
};

const translations = {
  en: {
    title: 'Trivia Master',
    start: 'Start Your Quiz Game',
    score: 'Your Score',
    outOf: 'out of',
    playAgain: 'Play Again',
    goHome: 'Go to Home Page',
    timeRemaining: 'Time Remaining',
    question: 'Question',
    correct: 'Correct!',
    wrong: 'Wrong!',
    timesUp: "Time's Up!",
    totalCorrect: 'Total Correct',
    difficulty: 'Difficulty',
    basic: 'Basic',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    level: 'Level',
    levelComplete: 'Level Complete!',
    hurray: 'Hurray!',
    tryAgain: 'Try again to improve!',
  },
  bn: {
    title: 'ট্রিভিয়া মাস্টার',
    start: 'আপনার কুইজ গেম শুরু করুন',
    score: 'আপনার স্কোর',
    outOf: 'এর মধ্যে',
    playAgain: 'আবার খেলুন',
    goHome: 'হোম পেজে যান',
    timeRemaining: 'বাকি সময়',
    question: 'প্রশ্ন',
    correct: 'সঠিক!',
    wrong: 'ভুল!',
    timesUp: 'সময় শেষ!',
    totalCorrect: 'মোট সঠিক',
    difficulty: 'অসুবিধা',
    basic: 'সাধারণ',
    intermediate: 'মধ্যম',
    advanced: 'উন্নত',
    level: 'স্তর',
    levelComplete: 'স্তর সম্পন্ন!',
    hurray: 'হুররে!',
    tryAgain: 'উন্নতি করতে আবার চেষ্টা করুন!',
  }
};

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Persistent stats
  const [totalCorrect, setTotalCorrect] = useState(() => Number(localStorage.getItem('trivia_total_correct') || 0));
  const [currentLevel, setCurrentLevel] = useState(() => Number(localStorage.getItem('trivia_current_level') || 1));
  const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('trivia_used_questions') || '[]');
    } catch {
      return [];
    }
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const t = translations[language];

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('trivia_total_correct', totalCorrect.toString());
    localStorage.setItem('trivia_current_level', currentLevel.toString());
    localStorage.setItem('trivia_used_questions', JSON.stringify(usedQuestionIds));
  }, [totalCorrect, currentLevel, usedQuestionIds]);

  const startNewGame = useCallback(() => {
    // Difficulty mapping based on level
    let difficulty: Difficulty = 'basic';
    if (currentLevel >= 21) difficulty = 'advanced';
    else if (currentLevel >= 11) difficulty = 'intermediate';

    // Filter questions by difficulty
    let pool = QUESTIONS.filter(q => q.difficulty === difficulty);
    
    // Filter out used questions
    let available = pool.filter(q => !usedQuestionIds.includes(q.id));

    // If not enough available, reset used questions for this difficulty
    if (available.length < 10) {
      const poolIds = pool.map(q => q.id);
      setUsedQuestionIds(prev => prev.filter(id => !poolIds.includes(id)));
      available = pool;
    }

    // Shuffle and pick 10
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const finalSelection = shuffled.slice(0, 10);

    // Track these IDs as used
    setUsedQuestionIds(prev => [...prev, ...finalSelection.map(q => q.id)]);

    setSelectedQuestions(finalSelection);
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsStarted(true);
    setIsGameOver(false);
    setTimeLeft(60);
    setSelectedOption(null);
    setShowFeedback(false);
  }, [currentLevel, usedQuestionIds]);

  const handleGameOver = useCallback((finalScore: number) => {
    setIsGameOver(true);
    setTotalCorrect(prev => prev + finalScore);

    // Level progression: only advance if score is 10/10
    if (finalScore === 10) {
      setCurrentLevel(prev => prev + 1);
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b881', '#fbbf24', '#ffffff']
      });
    } else if (finalScore >= 7) {
      // Minor celebration for good but not perfect score
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b881', '#ffffff']
      });
    }
  }, []);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < 9) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(60);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      handleGameOver(score);
    }
  }, [currentQuestionIndex, score, handleGameOver]);

  useEffect(() => {
    if (isStarted && !isGameOver && !showFeedback) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleNextQuestion();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, isGameOver, showFeedback, handleNextQuestion]);

  const handleOptionClick = (index: number) => {
    if (selectedOption !== null || showFeedback) return;

    setSelectedOption(index);
    setShowFeedback(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = index === selectedQuestions[currentQuestionIndex].correctIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
      playSound('correct');
    } else {
      playSound('wrong');
    }

    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'bn' : 'en');
  };

  const currentQuestion = selectedQuestions[currentQuestionIndex];
  const currentDifficulty: Difficulty = currentLevel >= 21 ? 'advanced' : (currentLevel >= 11 ? 'intermediate' : 'basic');

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-black/20 backdrop-blur-sm border-b border-white/5">
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          {t.title}
        </h1>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/10 active:scale-95"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language === 'en' ? 'বাংলা' : 'English'}</span>
        </button>
      </header>

      <main className="pt-24 pb-12 px-4 flex flex-col items-center justify-center min-h-screen">
        <AnimatePresence mode="wait">
          {!isStarted ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center space-y-8"
            >
              {/* Stats Circle */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative mx-auto w-32 h-32 flex items-center justify-center"
              >
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                <motion.div 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent rotate-45"
                />
                <div className="text-center">
                  <div className="text-3xl font-black text-emerald-400">{totalCorrect}</div>
                  <div className="text-[10px] uppercase tracking-tighter text-emerald-500/60 font-bold leading-none">
                    {t.totalCorrect}
                  </div>
                </div>
              </motion.div>

              <div className="space-y-4">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20"
                >
                  <Play className="w-10 h-10 fill-white" />
                </motion.div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                  {t.title}
                </h2>
                <div className="flex items-center justify-center gap-2 text-blue-200/60 text-sm font-bold uppercase tracking-widest">
                  <Star className="w-4 h-4 fill-blue-400 text-blue-400" />
                  <span>{t.level}: {currentLevel}</span>
                  <span className="mx-2">•</span>
                  <span>{t[currentDifficulty]}</span>
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-600/20 active:scale-95 overflow-hidden"
              >
                <span className="relative z-10">{t.start}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </motion.div>
          ) : isGameOver ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 text-center space-y-8"
            >
              <div className="space-y-4">
                {score >= 7 ? (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex justify-center gap-2 text-yellow-400"
                  >
                    <Trophy className="w-12 h-12" />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex justify-center gap-2 text-blue-400/50"
                  >
                    <Frown className="w-12 h-12" />
                  </motion.div>
                )}
                <h2 className="text-2xl font-bold text-blue-200">{t.score}</h2>
                <div className="text-7xl font-black text-white">
                  {score}<span className="text-2xl text-white/30 font-normal"> / 10</span>
                </div>
                {score === 10 ? (
                  <motion.p 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-emerald-400 font-black text-xl tracking-widest uppercase"
                  >
                    {t.levelComplete}
                  </motion.p>
                ) : score >= 7 ? (
                  <motion.p 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-blue-400 font-black text-lg tracking-widest uppercase"
                  >
                    {t.hurray}
                  </motion.p>
                ) : (
                  <p className="text-blue-300/60 font-medium text-sm italic">
                    {t.tryAgain}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={startNewGame}
                  className="flex flex-col items-center justify-center gap-3 p-6 bg-blue-600 hover:bg-blue-500 rounded-2xl transition-all active:scale-95"
                >
                  <RotateCcw className="w-6 h-6" />
                  <span className="font-bold text-sm">{t.playAgain}</span>
                </button>
                <button
                  onClick={() => setIsStarted(false)}
                  className="flex flex-col items-center justify-center gap-3 p-6 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 border border-white/10"
                >
                  <Home className="w-6 h-6" />
                  <span className="font-bold text-sm">{t.goHome}</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-2xl space-y-8"
            >
              {/* Quiz Header */}
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                      {currentQuestion.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60 font-bold uppercase">
                      {t[currentQuestion.difficulty]}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">
                    {t.question} {currentQuestionIndex + 1} <span className="text-white/30">/ 10</span>
                  </h3>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                  <Timer className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`} />
                  <span className={`text-xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
                    {timeLeft}s
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestionIndex + 1) / 10) * 100}%` }}
                  className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />
              </div>

              {/* Question */}
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl min-h-[160px] flex items-center">
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                  {currentQuestion.question[language]}
                </h2>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options[language].map((option, idx) => {
                  const isCorrect = idx === currentQuestion.correctIndex;
                  const isSelected = selectedOption === idx;
                  
                  let buttonClass = "p-6 rounded-2xl border text-left font-bold transition-all active:scale-[0.98] flex justify-between items-center ";
                  
                  if (showFeedback) {
                    if (isCorrect) {
                      buttonClass += "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
                    } else if (isSelected) {
                      buttonClass += "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]";
                    } else {
                      buttonClass += "bg-white/5 border-white/5 opacity-40";
                    }
                  } else {
                    buttonClass += "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20";
                  }

                  return (
                    <motion.button
                      key={idx}
                      whileHover={!showFeedback ? { scale: 1.02 } : {}}
                      onClick={() => handleOptionClick(idx)}
                      disabled={showFeedback}
                      className={buttonClass}
                    >
                      <span>{option}</span>
                      {showFeedback && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                      {showFeedback && isSelected && !isCorrect && <XCircle className="w-5 h-5" />}
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback Message */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <span className={`text-xl font-bold ${selectedOption === currentQuestion.correctIndex ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedOption === currentQuestion.correctIndex ? t.correct : t.wrong}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent pointer-events-none" />
    </div>
  );
}
