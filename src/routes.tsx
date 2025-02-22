import { createBrowserRouter } from 'react-router-dom';
import { EditorPage } from './components/editor/page';

export const router = createBrowserRouter([
  {
    path: '/editor/:id',
    element: <EditorPage />,
  },
  {
    path: '/editor',
    element: <EditorPage />,
  },
]); 