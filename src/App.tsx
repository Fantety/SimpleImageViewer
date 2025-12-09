import { useTheme } from "./contexts/ThemeContext";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="container">
      <h1>图片查看器</h1>
      <p>当前主题: {theme === 'light' ? '浅色' : '暗色'}</p>
      <button onClick={toggleTheme}>
        切换到 {theme === 'light' ? '暗色' : '浅色'} 模式
      </button>
    </main>
  );
}

export default App;
