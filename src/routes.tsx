import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/home';
import { EditorPage, editorLoader } from './pages/editor';
import { EditorError } from './components/editor/editor-error';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/flow/:id',
    element: <EditorPage />,
    loader: editorLoader,
    errorElement: <EditorError />,
  },
]); 