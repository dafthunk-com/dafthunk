export const getIconPath = (iconName: string): string => {
  const iconPaths: Record<string, string> = {
    'TextProcessorIcon': 'M5 15l7-7 7 7',
    'LLMModelIcon': 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    'StorageIcon': 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
    'FileInputIcon': 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  };

  return iconPaths[iconName] || 'M12 4v16m8-8H4'; // Default to a simple plus icon if not found
};

export const getIconStyles = (iconName: string): { className: string; strokeWidth?: number } => {
  const defaultStyles = {
    className: 'h-5 w-5',
    strokeWidth: 2,
  };

  const iconStyles: Record<string, { className: string; strokeWidth?: number }> = {
    'TextProcessorIcon': {
      ...defaultStyles,
      className: 'h-5 w-5 text-blue-500',
    },
    'LLMModelIcon': {
      ...defaultStyles,
      className: 'h-5 w-5 text-purple-500',
    },
    'StorageIcon': {
      ...defaultStyles,
      className: 'h-5 w-5 text-amber-500',
    },
    'FileInputIcon': {
      ...defaultStyles,
      className: 'h-5 w-5 text-green-500',
    },
  };

  return iconStyles[iconName] || defaultStyles;
}; 