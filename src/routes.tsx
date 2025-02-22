import { createBrowserRouter } from 'react-router-dom';
import { EditorPage, editorLoader } from './components/editor/page';
import { EditorError } from './components/editor/editor-error';

export const router = createBrowserRouter([
  {
    path: '/editor/:id',
    element: <EditorPage />,
    loader: editorLoader,
    errorElement: <EditorError />,
  },
  {
    path: '/editor',
    element: <EditorPage />,
    loader: editorLoader,
    errorElement: <EditorError />,
  },
]); 