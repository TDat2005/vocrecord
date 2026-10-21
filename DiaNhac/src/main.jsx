import { createRoot } from 'react-dom/client';
// Style nền (biến, reset, thành phần chung) phải nạp trước CSS của từng trang để trang ghi đè được.
import './styles/index.css';
import App from './app/App.jsx';

createRoot(document.getElementById('root')).render(<App />);
