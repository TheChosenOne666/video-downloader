import { AppProvider, useApp } from './context/AppContext';
import HomePage from './pages/HomePage';
import ProgressPage from './pages/ProgressPage';
import CompletePage from './pages/CompletePage';
import SummarizePage from './pages/SummarizePage';
import SubtitleGenerationPage from './pages/SubtitleGenerationPage';

function AppContent() {
  const { page } = useApp();

  switch (page) {
    case 'progress':
      return <ProgressPage />;
    case 'complete':
      return <CompletePage />;
    case 'summarize':
      return <SummarizePage />;
    case 'subtitle':
      return <SubtitleGenerationPage />;
    default:
      return <HomePage />;
  }
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
