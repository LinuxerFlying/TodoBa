import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './themes/themes.css';
import './styles/global.css';
import './styles/sidebar.css';
import './styles/kanban.css';
import './styles/editor.css';
import './styles/datepicker.css';
import './styles/list.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
