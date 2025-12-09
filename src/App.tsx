import { useTheme } from "./contexts/ThemeContext";
import { useAppState } from "./contexts/AppStateContext";
import { useImageNavigation } from "./hooks/useImageNavigation";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();
  const { state } = useAppState();
  const { goToPrevious, goToNext, canNavigate, currentIndex, totalImages } = useImageNavigation();

  return (
    <main className="container">
      <h1>图片查看器</h1>
      <p>当前主题: {theme === 'light' ? '浅色' : '暗色'}</p>
      <button onClick={toggleTheme}>
        切换到 {theme === 'light' ? '暗色' : '浅色'} 模式
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h2>应用状态</h2>
        <p>加载中: {state.isLoading ? '是' : '否'}</p>
        <p>当前图片: {state.currentImage ? state.currentImage.path : '无'}</p>
        <p>历史记录数量: {state.imageHistory.length}</p>
        <p>当前历史索引: {state.currentHistoryIndex}</p>
        <p>目录图片数量: {state.directoryImages.length}</p>
        <p>当前图片索引: {currentIndex >= 0 ? `${currentIndex + 1} / ${totalImages}` : '无'}</p>
        {state.error && <p style={{ color: 'red' }}>错误: {state.error}</p>}
      </div>

      {canNavigate && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={goToPrevious}>上一张</button>
          <button onClick={goToNext} style={{ marginLeft: '10px' }}>下一张</button>
        </div>
      )}
    </main>
  );
}

export default App;
